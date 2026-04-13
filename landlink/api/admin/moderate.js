// POST /api/admin/moderate
// Unified moderation endpoint. Admin-only. Runs server-side with the service
// role so actions bypass RLS (after verifying the caller is actually an admin).
//
// Body: { subject_type, subject_id, action, reason?, metadata? }
//
//   subject_type ∈ parcel | listing | booking | profile | credential | flag
//   action       ∈ approve | reject | suspend | unsuspend | verify | unverify
//                 | delete  | ban    | unban   | feature   | unfeature | note

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subject_type, subject_id, action, reason, metadata } = req.body || {};
  if (!subject_type || !subject_id || !action) {
    return res.status(400).json({ error: 'subject_type, subject_id, action required' });
  }

  // 1) Verify caller is an admin via their own JWT
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Missing auth token' });
  const userClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  const { data: profile } = await userClient
    .from('landlink_profiles').select('role').eq('user_id', user.id).single();
  if (!profile || profile.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  // 2) Service-role client for the privileged write
  const svc = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

  // Dispatch based on subject_type + action
  try {
    const result = await applyAction(svc, { subject_type, subject_id, action, reason, metadata });

    // Audit row
    await svc.from('landlink_admin_actions').insert({
      admin_id: user.id,
      subject_type, subject_id, action,
      reason: reason || null,
      metadata: metadata || {}
    });

    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    console.error('moderate failed', err);
    return res.status(500).json({ error: err.message });
  }
}

async function applyAction(svc, { subject_type, subject_id, action, reason }) {
  const touch = { updated_at: new Date().toISOString() };

  if (subject_type === 'parcel') {
    const map = {
      approve:   { status: 'active' },
      reject:    { status: 'removed' },
      suspend:   { status: 'paused' },
      unsuspend: { status: 'active' },
      delete:    { status: 'removed' },
      feature:   { tags: null }  // handled below
    };
    const patch = map[action];
    if (!patch) throw new Error(`Unknown parcel action: ${action}`);
    const { data, error } = await svc.from('landlink_parcels')
      .update({ ...patch, ...touch }).eq('id', subject_id).select('id,status').single();
    if (error) throw error;
    return { subject: data };
  }

  if (subject_type === 'listing') {
    const map = {
      approve:   { status: 'active' },
      reject:    { status: 'removed' },
      suspend:   { status: 'paused' },
      unsuspend: { status: 'active' },
      delete:    { status: 'removed' }
    };
    const patch = map[action];
    if (!patch) throw new Error(`Unknown listing action: ${action}`);
    const { data, error } = await svc.from('landlink_listings')
      .update({ ...patch, ...touch }).eq('id', subject_id).select('id,status').single();
    if (error) throw error;
    return { subject: data };
  }

  if (subject_type === 'credential') {
    if (action === 'verify') {
      const { data, error } = await svc.from('landlink_user_credentials')
        .update({ verified_at: new Date().toISOString() })
        .eq('id', subject_id).select('id,type,verified_at').single();
      if (error) throw error;
      return { subject: data };
    }
    if (action === 'unverify' || action === 'reject') {
      const { data, error } = await svc.from('landlink_user_credentials')
        .update({ verified_at: null })
        .eq('id', subject_id).select('id,type,verified_at').single();
      if (error) throw error;
      return { subject: data };
    }
    if (action === 'delete') {
      const { error } = await svc.from('landlink_user_credentials').delete().eq('id', subject_id);
      if (error) throw error;
      return { deleted: true };
    }
    throw new Error(`Unknown credential action: ${action}`);
  }

  if (subject_type === 'profile') {
    if (action === 'ban')    return updateProfile(svc, subject_id, { role: 'guest', bio: `[banned: ${reason || 'policy'}]` });
    if (action === 'unban')  return updateProfile(svc, subject_id, { bio: null });
    throw new Error(`Unknown profile action: ${action}`);
  }

  if (subject_type === 'flag') {
    const map = {
      reject:    { status: 'dismissed' },
      approve:   { status: 'resolved' },
      note:      { status: 'reviewing' }
    };
    const patch = map[action];
    if (!patch) throw new Error(`Unknown flag action: ${action}`);
    const { data, error } = await svc.from('landlink_flags')
      .update({ ...patch, resolved_at: new Date().toISOString() })
      .eq('id', subject_id).select('id,status').single();
    if (error) throw error;
    return { subject: data };
  }

  throw new Error(`Unknown subject_type: ${subject_type}`);
}

async function updateProfile(svc, user_id, patch) {
  const { data, error } = await svc.from('landlink_profiles')
    .update(patch).eq('user_id', user_id).select('user_id,role').single();
  if (error) throw error;
  return { subject: data };
}
