import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

const API = "http://192.168.0.161:8080";

export default function App() {
  const [roomId, setRoomId] = useState("demo");
  const [isHost, setIsHost] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [socket, setSocket] = useState(null);
  const [hearts, setHearts] = useState([]);
  const [err, setErr] = useState("");

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const lkRoomRef = useRef(null);         // 目前 Room
  const reconnectTimerRef = useRef(null); // Viewer 自動重連計時器

  // 建立 Socket.IO 連線
  useEffect(() => {
    const s = io(API);
    setSocket(s);
    return () => s.disconnect();
  }, []);

  // 收到聊天室/愛心事件
  useEffect(() => {
    if (!socket) return;
    socket.on("chat", (msg) => setMessages((m) => [...m, msg]));
    socket.on("heart", ({ left }) => spawnHeart(left));
    socket.on("sys", (msg) =>
      setMessages((m) => [...m, { user: "system", text: msg }])
    );
  }, [socket]);

  // 本地漂浮愛心
  const spawnHeart = (left) => {
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random());
    setHearts((h) => [...h, { id, left }]);
    setTimeout(() => setHearts((h) => h.filter((x) => x.id !== id)), 1600);
  };

  // 進房（Socket.IO + LiveKit）
  const join = async () => {
    setErr("");
    try {
      if (!socket) throw new Error("Socket 尚未連線");

      // 若已有連線，先乾淨斷開
      if (lkRoomRef.current) {
        try { lkRoomRef.current.disconnect?.(); } catch { }
        lkRoomRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      if (audioRef?.current) audioRef.current.srcObject = null;

      socket.emit("joinRoom", { roomId, userId: isHost ? "Host" : "Viewer" });

      const { Room, createLocalTracks } = await import("livekit-client");

      // 後端拿 token
      const { token, url } = await fetch(`${API}/rooms/${roomId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: isHost ? "host" : "viewer",
          displayName: isHost ? "Host" : "Viewer",
          isHost,
        }),
      }).then((r) => r.json());

      const room = new Room();
      lkRoomRef.current = room;
      await room.connect(url, token);

      // 斷線處理（Viewer 自動重連）
      room.on("disconnected", () => {
        if (videoRef.current) videoRef.current.srcObject = null;
        if (audioRef?.current) audioRef.current.srcObject = null;
        if (!isHost) {
          reconnectTimerRef.current = setTimeout(() => {
            console.log("🔄 嘗試自動重連…");
            join().catch((e) => console.error("自動重連失敗:", e));
          }, 2000);
        }
      });

      if (isHost) {
        // 主播：嘗試視訊+音訊，失敗降級僅音訊
        let tracks = [];
        try {
          tracks = await createLocalTracks({ audio: true, video: true });
        } catch (e) {
          console.warn("video+audio 失敗，改為 audio-only：", e);
          tracks = await createLocalTracks({ audio: true, video: false });
          setErr("找不到攝影機或無權限，已以『僅音訊』開播。");
        }

        for (const t of tracks) await room.localParticipant.publishTrack(t);

        const vTrack = tracks.find((t) => t.kind === "video");
        if (vTrack && videoRef.current) {
          const ms = new MediaStream([vTrack.mediaStreamTrack]);
          videoRef.current.srcObject = ms;
        }
      } else {
        // ===== Viewer：處理「新訂閱」的軌 =====
        room.on("trackSubscribed", (track) => {
          if (track.kind === "video" && videoRef.current) {
            const ms = new MediaStream([track.mediaStreamTrack]);
            videoRef.current.srcObject = ms;
          }
          if (track.kind === "audio" && audioRef?.current) {
            const ms = new MediaStream([track.mediaStreamTrack]);
            audioRef.current.srcObject = ms;
            audioRef.current.muted = false;
            audioRef.current.play().catch(() => { });
          }
        });

        room.on("trackUnsubscribed", (track) => {
          if (track.kind === "video" && videoRef.current) videoRef.current.srcObject = null;
          if (track.kind === "audio" && audioRef?.current) audioRef.current.srcObject = null;
        });

        // ===== 進房時把「現有發佈」也附掛/訂閱 =====
        const attachPub = (pub) => {
          // 若已訂閱，直接附掛
          if (pub.isSubscribed && pub.track) {
            const t = pub.track;
            if (t.kind === "video" && videoRef.current) {
              videoRef.current.srcObject = new MediaStream([t.mediaStreamTrack]);
            }
            if (t.kind === "audio" && audioRef?.current) {
              audioRef.current.srcObject = new MediaStream([t.mediaStreamTrack]);
              audioRef.current.muted = false;
              audioRef.current.play().catch(() => { });
            }
            return;
          }
          // 未訂閱：等 subscribed 或主動要求訂閱
          pub.on?.("subscribed", (t) => {
            if (t.kind === "video" && videoRef.current) {
              videoRef.current.srcObject = new MediaStream([t.mediaStreamTrack]);
            }
            if (t.kind === "audio" && audioRef?.current) {
              audioRef.current.srcObject = new MediaStream([t.mediaStreamTrack]);
              audioRef.current.muted = false;
              audioRef.current.play().catch(() => { });
            }
          });
          try { pub.setSubscribed?.(true); } catch { }
        };

        // 目前已在房內的遠端參與者
        room.remoteParticipants.forEach((p) => {
          p.trackPublications.forEach((pub) => attachPub(pub));
          p.on?.("trackPublished", (pub) => attachPub(pub));
        });

        // 未來才加入的遠端參與者
        room.on("participantConnected", (p) => {
          p.trackPublications.forEach((pub) => attachPub(pub));
          p.on?.("trackPublished", (pub) => attachPub(pub));
        });
      }
    } catch (e) {
      console.error(e);
      setErr("Join 失敗：" + (e?.message || e));
    }
  };

  const send = () => {
    if (!text.trim() || !socket) return;
    socket.emit("chat", { roomId, user: isHost ? "Host" : "Viewer", text });
    setText("");
  };

  const onHeart = () => {
    if (!socket) return;
    const left = Math.random() * 80 + 10;
    socket.emit("heart", { roomId, left });
    spawnHeart(left);
  };

  return (
    <div style={{ padding: 16, position: "relative" }}>
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(0.9); opacity: 0; }
          10%  { opacity: 1; }
          100% { transform: translateY(-140px) scale(1.2); opacity: 0; }
        }
        .heart {
          position: absolute;
          bottom: 150px;
          font-size: 28px;
          animation: floatUp 1.6s ease-out forwards;
          pointer-events: none;
          user-select: none;
        }
      `}</style>

      <h3>Live MVP (LiveKit + Socket.IO)</h3>

      {err && (
        <div style={{ color: "white", background: "#d33", padding: 8, marginBottom: 8, borderRadius: 6 }}>
          {err}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="roomId" />
        <label>
          <input type="checkbox" checked={isHost} onChange={(e) => setIsHost(e.target.checked)} /> Host
        </label>
        <button onClick={join}>Join</button>
      </div>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isHost}
        style={{ width: 640, height: 360, background: "#000", marginTop: 12, borderRadius: 6 }}
      />
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />

      {hearts.map((h) => (
        <div key={h.id} className="heart" style={{ left: `${h.left}%` }}>❤️</div>
      ))}

      <div style={{ marginTop: 12 }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="message..." />
        <button onClick={send}>Send</button>
        <button onClick={onHeart}>❤️</button>
      </div>

      <div style={{ marginTop: 12, maxHeight: 180, overflow: "auto", border: "1px solid #ccc", padding: 8 }}>
        {messages.map((m, i) => (<div key={i}><b>{m.user}</b>: {m.text}</div>))}
      </div>
    </div>
  );
}
