# capstone-course-project

#  Live-MVP Progress Report (Detailed Technical Version)
**Author:** Henry (Zongyi Chen)  
**Project:** Live MVP – Real-time Streaming Platform  
**Date:** November 10, 2025  
**Institution:** NTUST Capstone Project  

---

##  1. Project Overview

The **Live-MVP (LiveKit + Socket.IO)** project is an experimental live streaming platform that enables:
- A **host** to broadcast real-time video/audio using **WebRTC (via LiveKit)**  
- **Viewers** to join instantly using room IDs  
- **Real-time chat** and **heart reactions** synchronized across all participants  

The project demonstrates the integration of:
- **WebRTC streaming** (LiveKit SDK)
- **Socket.IO real-time messaging**
- **Express-based backend APIs**
- **React-based frontend user interface**
- **ngrok-based external HTTPS tunneling** for cross-device testing

---

##  2. System Architecture

###  High-Level Architecture
```
[Host Browser] ─┬─> [Frontend (React + LiveKit SDK)]
                 │        │
                 │        └──> LiveKit Cloud / Self-hosted server
                 │
                 └─> [Socket.IO Channel] <─┬─ [Viewer Browser(s)]
                                            │
                                            └─> Express Backend (Token + Signaling)
```

###  Components
| Component | Description |
|------------|--------------|
| **Frontend (React + Vite)** | Handles UI, streaming logic, and real-time messaging |
| **Backend (Node.js + Express)** | Provides REST APIs and Socket.IO signaling |
| **LiveKit SDK** | Provides WebRTC session management (audio/video tracks) |
| **Socket.IO** | Handles chat and reaction events |
| **ngrok** | Provides public HTTPS access for external devices |
| **Vite config** | Enables LAN and ngrok connections (`--host 0.0.0.0`) |

---

##  3. Frontend Technical Details (React + Vite)
- React controls room, state, and chat synchronization.  
- LiveKit handles audio/video stream publishing and subscription.  
- Socket.IO manages real-time text and emoji events.  
- ngrok tunnels allow external HTTPS device connections.

---

##  4. Backend Technical Details (Express + Socket.IO)
- REST API endpoint `/rooms/:roomId/join` generates LiveKit token.  
- Socket.IO manages `joinRoom`, `chat`, `heart` events in per-room isolation.  
- Backend serves as both signaling layer and token generator.

---

##  5. Implemented Functionalities Summary

| Feature | Status | Description |
|----------|---------|-------------|
| Host video/audio streaming | ✅ | Publishes via LiveKit SDK |
| Viewer stream subscription | ✅ | Subscribes to remote tracks |
| Chat room | ✅ | Real-time Socket.IO chat |
| Floating hearts | ✅ | Synced emoji animation |
| HTTPS public testing | ✅ | Achieved via ngrok |
| Audio-only fallback | ✅ | Handles missing webcam |
| Firebase Auth | 🚧 Planned | User login system |
| Database logging | 🚧 Planned | Firebase/MongoDB integration |

---

##  6. Issues and Fixes

| Problem | Cause | Fix |
|----------|--------|-----|
| No video/audio on HTTPS | WebRTC requires secure context | Used ngrok tunnel |
| Viewer can’t see host | Join timing issue | Added event sync logic |
| Permission denied | Missing camera access | Added fallback to audio-only |
| Domain blocked | Vite restricted hosts | Updated allowedHosts in config |

---

##  7. Future Work

| Next Step | Description |
|------------|--------------|
| Firebase Auth | User authentication |
| Database logging | Chat/message storage |
| Recording | Enable stream saving |
| Tailwind CSS | Improve UI responsiveness |
| Deployment | Vercel (frontend) + Render (backend) |

---

## 8. 總結

本專案完成了跨裝置可用的「即時影音直播平台」：  
- 主播可開啟鏡頭與音訊進行直播  
- 觀眾可即時觀看、發送訊息與愛心互動  
- 全部透過 **React + Socket.IO + LiveKit (WebRTC)** 整合實現  
- 已支援 **HTTPS ngrok 測試**，可在不同裝置跨網路使用  

接下來將整合：  
- Firebase Auth 登入機制  
- Firebase Realtime Database 儲存聊天記錄  
- Tailwind CSS 美化前端介面  
- 部署至雲端以提供穩定服務  

---

📍 *Prepared by Henry Chen (Zongyi Chen), NTUST – Live-MVP Progress Report (Technical Detailed Version)*
