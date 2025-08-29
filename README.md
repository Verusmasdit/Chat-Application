# 💬 UnifiedChat — Real-time Chat Application

A simple and powerful real-time chat app built using:

- **Frontend** → HTML, CSS, JavaScript (`public/`)
- **Backend** → Node.js WebSocket server (`server.js`) using `ws`

---

## ✨ Features
- 🔑 Unique username enforcement  
- 💬 Multiple chat rooms (create & join)  
- ⚡ Real-time messaging with timestamps  
- 🎨 Basic message formatting:  
  - `**bold**` → **bold**  
  - `*italic*` → *italic*  
  - `http(s)` links → clickable  
- 📜 Message history (per room, limited)  
- 👀 Typing notifications  
- 👥 User join/leave notifications  
- 📱 Responsive & attractive UI  

---

## 🔧 Prerequisites
- Install **Node.js** (version 16+)  
👉 [Download Node.js](https://nodejs.org/en/download)  

---

After installation, check with: 
- node -v 
- npm -v

---

📂 Project Setup

1. Create a new folder for your project, e.g. chat-app.
- mkdir chat-app
- cd chat-app

---

2. Inside, create two subfolders/files exactly as I gave:\
- chat-app/\
├── package.json\
├── server.js\
├── public/
    ├── index.html
    ├── styles.css
    ├── client.js\
├── README.md

---

3. Install dependencies:
- npm install

This installs:

- ws (WebSocket server)

- uuid (for unique IDs)
---

▶️ Running the Server

Start the WebSocket server:

- npm start


If successful, you’ll see:

- WebSocket server running on ws://localhost:3000

---

🌐 Opening the App
Option 1 — Quick Test

Open directly in browser:
👉 public/index.html

⚠️ Some browsers may block WebSocket requests from file://.

Option 2 — Serve Public Folder ✅ (Recommended)

Install a static server (one-time):

npm install -g serve


Run it from public/:

serve public -l 5000


Open frontend:
👉 http://localhost:5000

This connects to WebSocket backend at ws://localhost:3000.

---

👥 Example Run

1. Open two browser tabs/windows.

2. In each, enter a unique username (e.g., Alice and Bob).

3. Join the default General room.

4. Start chatting 🎉

✅ Messages appear instantly.\
✅ Links are clickable.\
✅ Formatting works:

- **bold** → bold

- *italic* → italic

Try creating a new room (e.g., Study) and switch between chats.

---

📸 Screenshots
---
| Login Screen                    | Chat Window                   | Multiple Rooms                  |
| ------------------------------- | ----------------------------- | ------------------------------- |
| ![Join](assets/Join%20Page.png) | ![Chat](assets/Chat%20Page.png) | ![Rooms](assets/Room%20Page.png) |



---

🚀 Future Improvements

✅ Private messaging

✅ File sharing (images, docs)

✅ Emojis & reactions

✅ Dark mode

	
	