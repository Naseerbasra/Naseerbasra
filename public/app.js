const form = document.getElementById('message-form');
const list = document.getElementById('messages-list');
const statusNode = document.getElementById('form-status');
const refreshBtn = document.getElementById('refresh-btn');

document.getElementById('year').textContent = new Date().getFullYear();

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderMessages(messages) {
  if (!messages.length) {
    list.innerHTML = '<li>No messages yet. Be the first to say hi!</li>';
    return;
  }

  list.innerHTML = messages
    .map((entry) => {
      const created = new Date(entry.createdAt).toLocaleString();
      return `<li>
        <strong>${escapeHtml(entry.name)}</strong> (<a href="mailto:${escapeHtml(entry.email)}">${escapeHtml(entry.email)}</a>)
        <p>${escapeHtml(entry.message)}</p>
        <small>${created}</small>
      </li>`;
    })
    .join('');
}

async function loadMessages() {
  const response = await fetch('/api/messages');
  if (!response.ok) {
    throw new Error('Unable to load messages.');
  }

  const payload = await response.json();
  renderMessages(payload);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusNode.textContent = 'Sending...';

  const formData = new FormData(form);
  const body = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error('The server rejected your message. Please check your inputs.');
    }

    form.reset();
    statusNode.textContent = 'Message sent successfully!';
    await loadMessages();
  } catch (error) {
    statusNode.textContent = error.message;
  }
});

refreshBtn.addEventListener('click', async () => {
  try {
    await loadMessages();
  } catch (error) {
    statusNode.textContent = error.message;
  }
});

loadMessages().catch((error) => {
  statusNode.textContent = error.message;
});
