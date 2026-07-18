// Thin OpenRouter client for Scout. OpenAI-compatible chat completions over
// global fetch (no npm dependency). Model is configurable via env so we can
// route to Claude, or any other model OpenRouter serves, without code changes.

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export function aiConfigured() {
  return !!process.env.OPENROUTER_API_KEY;
}

export function aiModel() {
  return process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
}

// Low-level chat completion. Returns the assistant message object
// ({ role, content, tool_calls? }). Retries once on transient errors so a
// cold-start / rate blip never surfaces as a hard failure. Throws otherwise.
export async function chat({ messages, tools, tool_choice, temperature = 0.4, max_tokens = 1200 }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) { const e = new Error('OPENROUTER_API_KEY not set'); e.code = 'no_key'; throw e; }

  const body = { model: aiModel(), messages, temperature, max_tokens };
  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + key,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://outdoorintel.ca',
          'X-Title': 'Outdoor Intel Scout'
        },
        body: JSON.stringify(body)
      });
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = text; }
      if (!res.ok) {
        const msg = (data && data.error && (data.error.message || data.error)) || ('OpenRouter ' + res.status);
        const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        err.status = res.status;
        // Retry only on transient upstream errors.
        if (res.status >= 500 || res.status === 429) { lastErr = err; continue; }
        throw err;
      }
      const choice = data && data.choices && data.choices[0];
      if (!choice || !choice.message) throw new Error('No completion returned');
      return choice.message;
    } catch (e) {
      lastErr = e;
      if (e.code === 'no_key' || (e.status && e.status < 500 && e.status !== 429)) throw e;
      // network error or transient — loop once more
    }
  }
  throw lastErr || new Error('OpenRouter request failed');
}

// Plain text completion (no tools). Pass either { system, user } or { messages }.
export async function complete({ system, user, messages, temperature = 0.4, max_tokens = 900 }) {
  const msgs = messages || [
    ...(system ? [{ role: 'system', content: system }] : []),
    { role: 'user', content: user }
  ];
  const msg = await chat({ messages: msgs, temperature, max_tokens });
  return (msg.content || '').trim();
}

// Structured completion: asks for JSON and parses it (tolerant of code fences).
export async function completeJSON({ system, user, temperature = 0.2, max_tokens = 1100 }) {
  const sys = (system || '') + '\n\nRespond with ONLY valid minified JSON — no prose, no code fences.';
  const raw = await complete({ system: sys, user, temperature, max_tokens });
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}
