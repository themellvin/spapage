// Serene Touch - AI Spa Concierge Widget (Guest Mode)
(function () {
  const CHAT_API = '/api/chat';

  // Inject UI
  const widgetHtml = `
    <button id="spa-ai-chat-btn" type="button" title="Chat with Spa Concierge" aria-label="Open Spa Assistant" aria-controls="spa-ai-chat-window" aria-expanded="false">
      <svg viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
    </button>

    <div id="spa-ai-chat-window" role="dialog" aria-modal="true" aria-label="Spa Assistant Chat" aria-hidden="true">
      <div class="spa-chat-header">
        <div>
          <h4>
            <span>🌿</span> Serene Concierge
          </h4>
          <p>Treatments, availability & bookings</p>
        </div>
        <button class="spa-chat-close-btn" id="spa-chat-close-btn" aria-label="Close chat">&times;</button>
      </div>

      <div class="spa-chat-messages" id="spa-chat-messages">
        <div class="spa-chat-msg assistant">
          Hello! Welcome to Serene Touch. How can I assist you today? Feel free to ask about our treatments, check open time slots, or book an appointment.
        </div>
      </div>

      <form class="spa-chat-input-bar" id="spa-chat-form">
        <input 
          type="text" 
          id="spa-chat-input" 
          placeholder="Ask a question or request a booking..." 
          autocomplete="off"
          required
        />
        <button type="submit">Send</button>
      </form>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', widgetHtml);

  const chatBtn = document.getElementById('spa-ai-chat-btn');
  const chatWindow = document.getElementById('spa-ai-chat-window');
  const closeBtn = document.getElementById('spa-chat-close-btn');
  const chatForm = document.getElementById('spa-chat-form');
  const chatInput = document.getElementById('spa-chat-input');
  const messagesContainer = document.getElementById('spa-chat-messages');

  const messages = [
    {
      role: 'assistant',
      content: 'Hello! Welcome to Serene Touch. How can I assist you today? Feel free to ask about our treatments, check open time slots, or book an appointment.'
    }
  ];

  function toggleChat() {
    const isOpen = chatWindow.classList.toggle('open');
    chatBtn.setAttribute('aria-expanded', String(isOpen));
    chatWindow.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) {
      chatInput.focus();
      scrollToBottom();
    }
  }

  chatBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `spa-chat-msg ${role}`;
    msgDiv.textContent = text;
    messagesContainer.appendChild(msgDiv);
    scrollToBottom();
    return msgDiv;
  }

  chatForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    chatInput.value = '';
    appendMessage('user', text);
    messages.push({ role: 'user', content: text });

    const loadingDiv = appendMessage('assistant loading', 'Thinking...');

    try {
      const res = await fetch(CHAT_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages,
          role: 'guest'
        })
      });

      if (!res.ok) {
        throw new Error('Server error');
      }

      const data = await res.json();
      const reply = data.text || "Sorry, I couldn't process that.";
      loadingDiv.className = 'spa-chat-msg assistant';
      loadingDiv.textContent = reply;
      messages.push({ role: 'assistant', content: reply });
    } catch (err) {
      loadingDiv.className = 'spa-chat-msg assistant';
      loadingDiv.textContent = 'Sorry, I had trouble connecting. Please try again or visit our booking page directly.';
    }
    scrollToBottom();
  });
})();
