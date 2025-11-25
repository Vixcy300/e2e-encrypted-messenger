<p align="center">
  <img src="https://raw.githubusercontent.com/Vixcy300/securep2p-messenger/main/public/logo.png" alt="SecureP2P Logo" width="120" height="120">
</p>

<h1 align="center">🔐 SecureP2P Messenger</h1>

<p align="center">
  <strong>End-to-End Encrypted • Peer-to-Peer • Zero Knowledge</strong>
</p>

<p align="center">
  <a href="https://github.com/Vixcy300">
    <img src="https://img.shields.io/badge/Author-Vignesh-00D9FF?style=for-the-badge&logo=github&logoColor=white" alt="Author">
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/Project-Capstone_2025-FF6B6B?style=for-the-badge&logo=bookstack&logoColor=white" alt="Project Type">
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Socket.IO-4.0-010101?style=flat-square&logo=socket.io&logoColor=white" alt="Socket.IO">
  <img src="https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Encryption-AES--256--GCM-00C853?style=flat-square&logo=shield&logoColor=white" alt="Encryption">
  <img src="https://img.shields.io/badge/Key_Derivation-PBKDF2-FF9800?style=flat-square&logo=key&logoColor=white" alt="Key Derivation">
  <img src="https://img.shields.io/badge/Protocol-WebRTC_+_Socket.IO-8E44AD?style=flat-square&logo=webrtc&logoColor=white" alt="Protocol">
</p>

---

<p align="center">
  <img src="https://user-images.githubusercontent.com/placeholder/securep2p-demo.gif" alt="Demo" width="700">
</p>

---

## 🌟 Overview

**SecureP2P Messenger** is a cutting-edge, end-to-end encrypted messaging application built as a capstone project. It demonstrates advanced secure communication technologies, ensuring that your messages remain private and can **only be read by you and your intended recipient**.

<table>
<tr>
<td width="50%">

### 🔒 **True E2E Encryption**
Messages are encrypted on your device using **AES-256-GCM** before being transmitted. The server **cannot** read your messages - it only relays encrypted data.

</td>
<td width="50%">

### 🌐 **Works Offline**
Connect via mobile hotspot without internet! Perfect for private communication in areas with limited connectivity.

</td>
</tr>
<tr>
<td width="50%">

### ⚡ **Real-time Communication**
Instant messaging with typing indicators, read receipts, and live connection status using WebSocket technology.

</td>
<td width="50%">

### 📁 **Secure File Transfer**
Share files of any type with the same military-grade encryption. Files are chunked and encrypted before transfer.

</td>
</tr>
</table>

---

## ✨ Features

<details>
<summary><b>🔐 Security Features</b></summary>

| Feature | Description |
|---------|-------------|
| **AES-256-GCM** | Military-grade symmetric encryption |
| **PBKDF2** | 100,000 iterations for key derivation |
| **Unique IV** | Each message uses a unique initialization vector |
| **Zero-Knowledge** | Server cannot decrypt messages |
| **Bcrypt Hashing** | Secure password storage |
| **JWT Authentication** | Secure session management |

</details>

<details>
<summary><b>💬 Messaging Features</b></summary>

| Feature | Description |
|---------|-------------|
| **Real-time Chat** | Instant message delivery |
| **Typing Indicators** | See when peer is typing |
| **Message Status** | Sent, delivered, read receipts |
| **Room Codes** | Easy 6-character room codes |
| **QR Code Sharing** | Scan to join rooms |
| **Emoji Support** | Full emoji picker |

</details>

<details>
<summary><b>📁 File Transfer</b></summary>

| Feature | Description |
|---------|-------------|
| **Any File Type** | Support for all formats |
| **Chunked Transfer** | Reliable large file support |
| **Progress Tracking** | Real-time progress bar |
| **Encrypted Transfer** | E2E encrypted files |

</details>

<details>
<summary><b>🎨 User Experience</b></summary>

| Feature | Description |
|---------|-------------|
| **Modern Dark UI** | Sleek cyberpunk design |
| **Responsive** | Works on all devices |
| **Animations** | Smooth Framer Motion transitions |
| **Toast Notifications** | Clear user feedback |
| **P2P Visualization** | Real-time network status |

</details>

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        HOW IT WORKS                                │
└────────────────────────────────────────────────────────────────────┘

     📱 Device A                    🖥️ Server                    💻 Device B
    ┌──────────┐                  ┌──────────┐                  ┌──────────┐
    │          │                  │          │                  │          │
    │  "Hello" │                  │  ??????  │                  │  "Hello" │
    │    ↓     │                  │    ↓     │                  │    ↑     │
    │ ENCRYPT  │ ──────────────►  │  RELAY   │ ──────────────►  │ DECRYPT  │
    │ AES-256  │    Encrypted     │  (Can't  │    Encrypted     │ AES-256  │
    │          │    Gibberish     │   Read)  │    Gibberish     │          │
    └──────────┘                  └──────────┘                  └──────────┘

┌────────────────────────────────────────────────────────────────────┐
│                     KEY DERIVATION                                 │
└────────────────────────────────────────────────────────────────────┘

    Room Code: "ABC123"  +  PeerID_A  +  PeerID_B
                              ↓
                    ┌─────────────────┐
                    │     PBKDF2      │
                    │ 100,000 rounds  │
                    │    SHA-256      │
                    └────────┬────────┘
                             ↓
                    ┌─────────────────┐
                    │   SAME KEY ON   │
                    │   BOTH DEVICES  │  ← Never transmitted!
                    └─────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js >= 18.0
npm or yarn
```

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Vixcy300/securep2p-messenger.git
cd securep2p-messenger

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local

# 4. Start the servers
# Terminal 1:
node server/index.js

# Terminal 2:
npm run dev

# 5. Open in browser
# http://localhost:3000
```

### Windows Quick Start

```batch
# Just double-click:
start.bat
```

---

## 📱 Mobile / Hotspot Setup

Want to use on mobile or without internet? Easy!

```bash
# 1. Find your computer's IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# 2. Update .env.local
NEXT_PUBLIC_SIGNALING_SERVER=http://YOUR_IP:3001
NEXT_PUBLIC_APP_URL=http://YOUR_IP:3000

# 3. Restart servers and access from mobile
http://YOUR_IP:3000
```

---

## 🛠️ Tech Stack

<table>
<tr>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=nextjs" width="48" height="48" alt="Next.js" />
<br>Next.js 14
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=ts" width="48" height="48" alt="TypeScript" />
<br>TypeScript
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=tailwind" width="48" height="48" alt="Tailwind" />
<br>Tailwind
</td>
<td align="center" width="96">
<img src="https://skillicons.dev/icons?i=nodejs" width="48" height="48" alt="Node.js" />
<br>Node.js
</td>
<td align="center" width="96">
<img src="https://socket.io/images/logo.svg" width="48" height="48" alt="Socket.IO" />
<br>Socket.IO
</td>
</tr>
</table>

### Full Stack Details

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14, React 18 | UI Framework |
| **Styling** | Tailwind CSS, Framer Motion | Design & Animations |
| **State** | Zustand | Global State Management |
| **Backend** | Node.js, Express | API Server |
| **Real-time** | Socket.IO | WebSocket Communication |
| **Security** | Web Crypto API | Browser-native Encryption |
| **Auth** | JWT, Bcrypt | Authentication |

---

## 📁 Project Structure

```
securep2p-messenger/
├── 📂 app/                    # Next.js App Router
│   ├── 📄 layout.tsx         # Root layout
│   ├── 📄 page.tsx           # Main page
│   └── 📄 globals.css        # Global styles
├── 📂 components/            # React components
│   ├── 📄 chat-interface.tsx # Chat UI
│   ├── 📄 disclaimer.tsx     # Attribution (protected)
│   ├── 📄 dashboard.tsx      # Main dashboard
│   └── 📂 ui/               # Reusable components
├── 📂 lib/                   # Core utilities
│   ├── 📄 crypto.ts         # Encryption functions
│   ├── 📄 p2p.ts            # P2P connection logic
│   ├── 📄 store.ts          # Zustand state
│   └── 📄 utils.ts          # Helpers
├── 📂 server/               # Backend
│   └── 📄 index.js          # Express + Socket.IO
└── 📂 public/               # Static assets
```

---

## 🔒 Security Details

### Encryption Flow

```
Message Input → UTF-8 Encode → AES-256-GCM Encrypt → Base64 → Transmit
                                      ↑
                               Random 12-byte IV
                                      +
                            PBKDF2 Derived Key
```

### What's Protected

| ✅ Protected | ❌ Visible to Server |
|-------------|---------------------|
| Message content | Message timestamps |
| File contents | Room codes |
| Encryption keys | Connection status |

---

## 👨‍💻 Author

<p align="center">
  <img src="https://github.com/Vixcy300.png" width="100" height="100" style="border-radius: 50%;">
</p>

<h3 align="center">Vignesh</h3>

<p align="center">
  <a href="https://github.com/Vixcy300">
    <img src="https://img.shields.io/badge/GitHub-Vixcy300-181717?style=for-the-badge&logo=github" alt="GitHub">
  </a>
</p>

<p align="center">
  <i>Capstone Project • 2025</i>
</p>

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

> ⚠️ **Attribution Required**: The disclaimer component must remain intact when using or distributing this project.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Socket.IO](https://socket.io/) - Real-time Engine
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Lucide Icons](https://lucide.dev/) - Beautiful Icons

---

<p align="center">
  <b>⭐ If you found this project helpful, please give it a star!</b>
</p>

<p align="center">
  Made with ❤️ and ☕ by <a href="https://github.com/Vixcy300">Vignesh</a>
</p>
