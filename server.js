// server.js
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

/*
Server state:
- users: map socketId -> {username, room, ws}
- rooms: map roomName -> {users:Set(username), history: [{id, username, text, time}]}
*/

const users = new Map(); // socketId => {username, room, ws}
const rooms = new Map(); // roomName => {users: Set, history: Array}

// seed default room
if (!rooms.has('General')) rooms.set('General', { users: new Set(), history: [] });

function broadcastRoom(roomName, payload) {
  const room = rooms.get(roomName);
  if (!room) return;
  for (const [sid, info] of users.entries()) {
    if (info.room === roomName) {
      try {
        info.ws.send(JSON.stringify(payload));
      } catch (e) {
        // ignore send errors
      }
    }
  }
}

function sendToSocket(ws, payload) {
  try {
    ws.send(JSON.stringify(payload));
  } catch (e) {}
}

function sanitizeUsername(name) {
  if (!name) return '';
  return String(name).trim().slice(0, 30);
}

// limit history size
const MAX_HISTORY = 200;

wss.on('connection', (ws) => {
  const socketId = uuidv4();
  users.set(socketId, { username: null, room: null, ws });

  // send initial rooms list
  function updateRoomsList() {
    const roomList = Array.from(rooms.keys()).map(r => ({
      name: r,
      users: rooms.get(r).users.size
    }));
    sendToSocket(ws, { type: 'rooms', rooms: roomList });
  }
  updateRoomsList();

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }

    // message handlers
    if (msg.type === 'set_username') {
      const username = sanitizeUsername(msg.username);
      if (!username) {
        sendToSocket(ws, { type: 'error', message: 'Username required.' });
        return;
      }
      // check for username uniqueness across all users
      for (const u of users.values()) {
        if (u.username && u.username.toLowerCase() === username.toLowerCase()) {
          sendToSocket(ws, { type: 'username_rejected', reason: 'Username already in use.' });
          return;
        }
      }
      const userEntry = users.get(socketId);
      userEntry.username = username;
      sendToSocket(ws, { type: 'username_accepted', username });

      // send updated rooms list (with counts)
      for (const [sid, info] of users.entries()) {
        sendToSocket(info.ws, { type: 'rooms_update', rooms: Array.from(rooms.keys()).map(r => ({ name: r, users: rooms.get(r).users.size })) });
      }
      return;
    }

    if (msg.type === 'create_room') {
      const name = String(msg.room || '').trim().slice(0, 40);
      if (!name) { sendToSocket(ws, { type: 'error', message: 'Room name required.' }); return; }
      if (rooms.has(name)) { sendToSocket(ws, { type: 'error', message: 'Room already exists.' }); return; }
      rooms.set(name, { users: new Set(), history: [] });
      // notify everyone of new rooms
      for (const [sid, info] of users.entries()) {
        sendToSocket(info.ws, { type: 'rooms_update', rooms: Array.from(rooms.keys()).map(r => ({ name: r, users: rooms.get(r).users.size })) });
      }
      return;
    }

    if (msg.type === 'join_room') {
      const roomName = String(msg.room || 'General').trim();
      const userEntry = users.get(socketId);
      if (!userEntry || !userEntry.username) {
        sendToSocket(ws, { type: 'error', message: 'Set a username before joining.'});
        return;
      }
      if (!rooms.has(roomName)) {
        sendToSocket(ws, { type: 'error', message: 'Room not found.'});
        return;
      }
      // remove from previous room if any
      if (userEntry.room) {
        const prev = rooms.get(userEntry.room);
        if (prev) prev.users.delete(userEntry.username);
        broadcastRoom(userEntry.room, { type: 'user_left', username: userEntry.username });
      }
      // join new room
      userEntry.room = roomName;
      rooms.get(roomName).users.add(userEntry.username);

      // send history and room info to this socket
      sendToSocket(ws, { type: 'joined', room: roomName, history: rooms.get(roomName).history.slice(-100) });

      // broadcast user joined to room
      broadcastRoom(roomName, { type: 'user_joined', username: userEntry.username });

      // update room lists to all
      for (const [sid, info] of users.entries()) {
        sendToSocket(info.ws, { type: 'rooms_update', rooms: Array.from(rooms.keys()).map(r => ({ name: r, users: rooms.get(r).users.size })) });
      }
      return;
    }

    if (msg.type === 'send_message') {
      const userEntry = users.get(socketId);
      if (!userEntry || !userEntry.username || !userEntry.room) {
        sendToSocket(ws, { type: 'error', message: 'Join a room and set username first.' });
        return;
      }
      const text = String(msg.text || '').trim().slice(0, 2000);
      if (text.length === 0) return;
      const messageObj = {
        id: uuidv4(),
        username: userEntry.username,
        text,
        time: new Date().toISOString()
      };
      const room = rooms.get(userEntry.room);
      if (!room) return;
      room.history.push(messageObj);
      if (room.history.length > MAX_HISTORY) room.history.shift();
      broadcastRoom(userEntry.room, { type: 'message', message: messageObj });
      return;
    }

    if (msg.type === 'typing') {
      const userEntry = users.get(socketId);
      if (!userEntry || !userEntry.username || !userEntry.room) return;
      broadcastRoom(userEntry.room, { type: 'typing', username: userEntry.username, isTyping: !!msg.isTyping });
      return;
    }
  });

  ws.on('close', () => {
    const info = users.get(socketId);
    if (!info) return;
    const { username, room } = info;
    users.delete(socketId);
    if (room && rooms.has(room)) {
      rooms.get(room).users.delete(username);
      broadcastRoom(room, { type: 'user_left', username });
    }
    // update rooms list to everyone
    for (const [sid, info2] of users.entries()) {
      sendToSocket(info2.ws, { type: 'rooms_update', rooms: Array.from(rooms.keys()).map(r => ({ name: r, users: rooms.get(r).users.size })) });
    }
  });
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);
