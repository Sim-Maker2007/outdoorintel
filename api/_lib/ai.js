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
// ({ role, content, tool_calls? }). Throws on transport / API errors.
export async function chat({ messages, tools, tool_choice, temperature = 0.4, max_tokens = 1200 }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) { const e = new Error('OPENROUTER_API_KEY not set'); e.code = 'no_key'; throw e; }

  const body = { model: aiModel(), messages, temperature, max_tokens };
  if (tools) body.tools = tools;
  if (tool_choice) body.tool_choice = tool_choice;

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/json',
      // OpenRouter attribution headers (optional but recommended).
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
    throw err;
  }
  const choice = data && data.choices && data.choices[0];
  if (!choice || !choice.message) throw new Error('No completion returned');
  return choice.message;
}
