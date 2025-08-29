# UnifiedChat — Real-time Chat Application

## What this is
A real-time chat application built with:
- Frontend: HTML, CSS, JavaScript (files in `public/`)
- Backend: Node.js WebSocket server (`server.js`) using `ws`.

Features:
- Multiple chat rooms (create & join)
- Unique username enforcement
- Real-time messaging with timestamps
- Basic message formatting: **bold**, *italic*, http(s) links
- Message history per room (limited)
- Typing notifications, user join/leave notifications
- Responsive and attractive UI

## How to run (local)
1. Ensure you have Node.js (v16+) installed.
2. Clone or copy the project folder.
3. Install dependencies:

```bash
npm install
