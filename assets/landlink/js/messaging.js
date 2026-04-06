// LandLink messaging component
import { supabase, getCurrentProfile } from './supabase-client.js';
import { esc, timeAgo, toast } from './utils.js';

/**
 * Render a messaging panel for a hunt request.
 * @param {HTMLElement} container
 * @param {string} requestId
 * @param {string} currentUserId
 */
export async function renderMessages(container, requestId, currentUserId) {
  container.innerHTML = `
    <div class="ll-messages" id="msg-list-${esc(requestId)}">
      <div style="text-align:center;color:var(--ink-muted);font-size:13px;padding:20px">Loading messages...</div>
    </div>
    <div class="ll-msg-compose">
      <input type="text" id="msg-input-${esc(requestId)}" placeholder="Type a message..." autocomplete="off">
      <button id="msg-send-${esc(requestId)}" aria-label="Send">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>`;

  const listEl = container.querySelector(`#msg-list-${requestId}`);
  const inputEl = container.querySelector(`#msg-input-${requestId}`);
  const sendBtn = container.querySelector(`#msg-send-${requestId}`);

  async function loadMessages() {
    const { data, error } = await supabase
      .from('landlink_messages')
      .select('id, sender_id, body, created_at')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });

    if (error) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--ink-muted);font-size:13px;padding:20px">Could not load messages.</div>';
      return;
    }

    if (!data || !data.length) {
      listEl.innerHTML = '<div style="text-align:center;color:var(--ink-muted);font-size:13px;padding:20px">No messages yet. Start the conversation.</div>';
      return;
    }

    listEl.innerHTML = data.map(m => {
      const isMine = m.sender_id === currentUserId;
      return `<div class="ll-msg ${isMine ? 'll-msg-mine' : 'll-msg-theirs'}">
        <div>${esc(m.body)}</div>
        <div class="ll-msg-meta">${timeAgo(m.created_at)}</div>
      </div>`;
    }).join('');

    listEl.scrollTop = listEl.scrollHeight;
  }

  async function sendMessage() {
    const body = inputEl.value.trim();
    if (!body) return;

    inputEl.value = '';
    sendBtn.disabled = true;

    const { error } = await supabase.from('landlink_messages').insert({
      request_id: requestId,
      sender_id: currentUserId,
      body
    });

    sendBtn.disabled = false;
    if (error) { toast('Could not send message: ' + error.message, 'error'); return; }
    await loadMessages();
  }

  sendBtn.addEventListener('click', sendMessage);
  inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') sendMessage(); });

  await loadMessages();

  // Poll for new messages every 10 seconds
  const interval = setInterval(async () => {
    if (!document.body.contains(container)) { clearInterval(interval); return; }
    await loadMessages();
  }, 10000);
}
