import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { AccessToken } from "livekit-server-sdk";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 建立一個測試 API（之後會讓前端拿 token）
app.post("/rooms/:id/join", async (req, res) => {
  const { userId, displayName, isHost } = req.body;
  const roomName = req.params.id;

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: userId,
      name: displayName || userId,
    }
  );

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: !!isHost,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  res.json({ token, url: process.env.LIVEKIT_URL });
});

// Socket.IO 聊天 / 愛心
io.on("connection", (socket) => {
  socket.on("joinRoom", ({ roomId, userId }) => {
    socket.join(roomId);
    io.to(roomId).emit("sys", `${userId} joined`);
  });

  socket.on("chat", ({ roomId, user, text }) => {
    io.to(roomId).emit("chat", { user, text, ts: Date.now() });
  });

  socket.on("heart", ({ roomId }) => {
    io.to(roomId).emit("heart", { ts: Date.now() });
  });
});

server.listen(process.env.PORT, () => {
  console.log(`✅ Server running on port ${process.env.PORT}`);
});
