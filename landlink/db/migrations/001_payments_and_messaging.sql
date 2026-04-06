-- Migration 001: Add payment, messaging, favourites, and availability columns
-- Run this against the Supabase SQL editor

-- ============ PAYMENT FIELDS ============

-- Stripe Connect account for landowner payouts
ALTER TABLE landlink_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Payment tracking on hunt requests
ALTER TABLE landlink_hunt_requests
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- ============ MESSAGING ============

CREATE TABLE IF NOT EXISTS landlink_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES landlink_hunt_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES landlink_profiles(user_id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_landlink_messages_request ON landlink_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_landlink_messages_created ON landlink_messages(request_id, created_at);

ALTER TABLE landlink_messages ENABLE ROW LEVEL SECURITY;

-- Participants (hunter or parcel owner) can read messages
CREATE POLICY landlink_messages_read ON landlink_messages FOR SELECT USING (
  sender_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM landlink_hunt_requests hr
    JOIN landlink_parcels p ON p.id = hr.parcel_id
    WHERE hr.id = landlink_messages.request_id
    AND (hr.hunter_id = auth.uid() OR p.owner_id = auth.uid())
  )
  OR EXISTS (SELECT 1 FROM landlink_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Participants can send messages
CREATE POLICY landlink_messages_insert ON landlink_messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM landlink_hunt_requests hr
    JOIN landlink_parcels p ON p.id = hr.parcel_id
    WHERE hr.id = landlink_messages.request_id
    AND (hr.hunter_id = auth.uid() OR p.owner_id = auth.uid())
  )
);

-- ============ FAVOURITES ============

CREATE TABLE IF NOT EXISTS landlink_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES landlink_profiles(user_id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES landlink_parcels(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, parcel_id)
);

CREATE INDEX IF NOT EXISTS idx_landlink_favourites_user ON landlink_favourites(user_id);

ALTER TABLE landlink_favourites ENABLE ROW LEVEL SECURITY;

CREATE POLICY landlink_favourites_read ON landlink_favourites FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY landlink_favourites_insert ON landlink_favourites FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

CREATE POLICY landlink_favourites_delete ON landlink_favourites FOR DELETE USING (
  user_id = auth.uid()
);

-- ============ AVAILABILITY / BLOCKED DATES ============

CREATE TABLE IF NOT EXISTS landlink_blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES landlink_parcels(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  reason TEXT DEFAULT 'manual', -- 'manual', 'booking', 'maintenance'
  request_id UUID REFERENCES landlink_hunt_requests(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  CHECK (date_to >= date_from)
);

CREATE INDEX IF NOT EXISTS idx_landlink_blocked_dates_parcel ON landlink_blocked_dates(parcel_id);
CREATE INDEX IF NOT EXISTS idx_landlink_blocked_dates_range ON landlink_blocked_dates(parcel_id, date_from, date_to);

ALTER TABLE landlink_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Anyone can read blocked dates (needed for calendar display)
CREATE POLICY landlink_blocked_dates_read ON landlink_blocked_dates FOR SELECT USING (true);

-- Only parcel owner can manage blocked dates
CREATE POLICY landlink_blocked_dates_insert ON landlink_blocked_dates FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM landlink_parcels WHERE id = landlink_blocked_dates.parcel_id AND owner_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM landlink_profiles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY landlink_blocked_dates_delete ON landlink_blocked_dates FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM landlink_parcels WHERE id = landlink_blocked_dates.parcel_id AND owner_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM landlink_profiles WHERE user_id = auth.uid() AND role = 'admin')
);
