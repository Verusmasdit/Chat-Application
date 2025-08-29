// client.js (connects to WebSocket server)
// Place public/ files on a static server or run a simple static server (e.g., serve or express static)
// If you're opening index.html directly, change WS URL accordingly (ws://localhost:3000)

(() => {
  const wsUrl = (location.protocol === 'https:' ? 'wss:' : 'ws://localhost:3000') + '//' + location.hostname + ':' + (location.port || 3000);
  const socket = new WebSocket(wsUrl);

  // DOM
  const usernameModal = document.getElementById('usernameModal');
  const usernameInput = document.getElementById('usernameInput');
  const usernameBtn = document.getElementById('usernameBtn');
  const meInfo = document.getElementById('meInfo');

  const roomsList = document.getElementById('roomsList');
  const roomTemplate = document.getElementById('roomTemplate');
  const messageTemplate = document.getElementById('messageTemplate');

  const newRoomInput = document.getElementById('newRoomInput');
  const createRoomBtn = document.getElementById('createRoomBtn');

  const messagesEl = document.getElementById('messages');
  const roomTitle = document.getElementById('roomTitle');
  const roomUsers = document.getElementById('roomUsers');
  const notifications = document.getElementById('notifications');

  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  let myUsername = null;
  let currentRoom = null;
  let rooms = []; // list of {name, users}
  let typingTimer = null;

  // helpers
  function escapeHtml(s) {
    return s.replace(/[&<>"'`]/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','`':'&#96;'}[m]));
  }
  // basic formatting: **bold**, *italic*, and links
  function formatText(raw) {
    // sanitize first
    let t = escapeHtml(raw);

    // links: convert http(s) to anchor
    t = t.replace(/(https?:\/\/[^\s]+)/g, (m) => `<a href="${m}" target="_blank" rel="noreferrer">${m}</a>`);

    // bold: **text**
    t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // italic: *text*
    t = t.replace(/\*(.*?)\*/g, '<em>$1</em>');

    return t;
  }

  function addRoomItem(room) {
    const template = roomTemplate.content.cloneNode(true);
    const item = template.querySelector('.room-item');
    template.querySelector('.rname').textContent = room.name;
    template.querySelector('.rcount').textContent = `${room.users} user${room.users !== 1 ? 's' : ''}`;
    const btn = template.querySelector('.joinBtn');
    btn.addEventListener('click', () => {
      joinRoom(room.name);
    });
    roomsList.appendChild(template);
  }

  function renderRooms() {
    roomsList.innerHTML = '';
    rooms.forEach(r => addRoomItem(r));
  }

  function pushMessage(message, outgoing = false) {
    const node = messageTemplate.content.cloneNode(true);
    const wrapper = node.querySelector('.message-line');
    if (outgoing) wrapper.classList.add('outgoing');
    node.querySelector('.author').textContent = message.username;
    node.querySelector('.time').textContent = new Date(message.time).toLocaleTimeString();
    node.querySelector('.content').innerHTML = formatText(message.text);
    messagesEl.appendChild(node);
    // scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setStatus(text, timeout = 2500) {
    notifications.textContent = text;
    if (timeout) {
      setTimeout(() => { if (notifications.textContent === text) notifications.textContent = 'Ready'; }, timeout);
    }
  }

  // messaging
  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    if (!currentRoom) { setStatus('Join a room first'); return; }
    socket.send(JSON.stringify({ type: 'send_message', text }));
    // show locally (optimistic)
    pushMessage({ username: myUsername, text, time: new Date().toISOString() }, true);
    messageInput.value = '';
    socket.send(JSON.stringify({ type: 'typing', isTyping: false }));
  }

  // username flow
  usernameBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    if (!name) return;
    socket.send(JSON.stringify({ type: 'set_username', username: name }));
  });
  usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') usernameBtn.click(); });

  createRoomBtn.addEventListener('click', () => {
    const r = newRoomInput.value.trim();
    if (!r) return;
    socket.send(JSON.stringify({ type: 'create_room', room: r }));
    newRoomInput.value = '';
  });
  newRoomInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') createRoomBtn.click(); });

  sendBtn.addEventListener('click', sendMessage);
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    } else {
      socket.send(JSON.stringify({ type: 'typing', isTyping: true }));
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => socket.send(JSON.stringify({ type: 'typing', isTyping: false })), 1000);
    }
  });

  function joinRoom(roomName) {
    if (!myUsername) { setStatus('Set username first.'); return; }
    socket.send(JSON.stringify({ type: 'join_room', room: roomName }));
  }

  // WebSocket handlers
  socket.addEventListener('open', () => {
    console.log('connected to ws');
  });

  socket.addEventListener('message', (ev) => {
    let payload;
    try { payload = JSON.parse(ev.data); } catch (e) { return; }
    // handle types
    switch(payload.type) {
      case 'rooms':
      case 'rooms_update': {
        rooms = payload.rooms || payload.rooms || [];
        // ensure array
        if (!Array.isArray(rooms)) rooms = [];
        renderRooms();
        break;
      }
      case 'username_accepted': {
        myUsername = payload.username;
        meInfo.textContent = `You: ${myUsername}`;
        usernameModal.style.display = 'none';
        setStatus('Username accepted');
        break;
      }
      case 'username_rejected': {
        alert('Username rejected: ' + (payload.reason || 'Name in use.'));
        break;
      }
      case 'joined': {
        currentRoom = payload.room;
        roomTitle.textContent = currentRoom;
        // show history
        messagesEl.innerHTML = '';
        (payload.history || []).forEach(m => pushMessage(m, m.username === myUsername));
        setStatus(`Joined ${currentRoom}`);
        break;
      }
      case 'message': {
        const m = payload.message;
        // avoid duplicate (optimistic) messages? We don't dedupe here for simplicity
        pushMessage(m, m.username === myUsername);
        // show desktop-like title flash
        if (m.username !== myUsername) {
          setStatus(`New message from ${m.username}`);
        }
        break;
      }
      case 'user_joined':
        setStatus(`${payload.username} joined`);
        break;
      case 'user_left':
        setStatus(`${payload.username} left`);
        break;
      case 'typing':
        if (payload.username !== myUsername) {
          if (payload.isTyping) setStatus(`${payload.username} is typing...`);
          else setStatus('Ready', 1200);
        }
        break;
      case 'error':
        console.warn('Server error:', payload.message);
        break;
    }
  });

  socket.addEventListener('close', () => {
    setStatus('Disconnected. Refresh to reconnect', 60000);
  });

  // theme toggle (simple)
  document.getElementById('toggleTheme').addEventListener('click', () => {
    document.body.classList.toggle('light');
    if (document.body.classList.contains('light')) {
      document.documentElement.style.setProperty('--bg1', 'linear-gradient(135deg,#f5f7fb,#e2e8f0)');
      document.documentElement.style.setProperty('--card', 'rgba(0,0,0,0.03)');
      document.documentElement.style.setProperty('--muted', 'rgba(20,20,20,0.65)');
    } else {
      document.documentElement.style.setProperty('--bg1', 'linear-gradient(135deg,#0f1724,#18304a)');
      document.documentElement.style.setProperty('--muted', 'rgba(255,255,255,0.7)');
    }
  });

  // focus message input if already joined
  messageInput.addEventListener('focus', () => {
    if (!myUsername) usernameModal.style.display = 'flex';
  });

})();
