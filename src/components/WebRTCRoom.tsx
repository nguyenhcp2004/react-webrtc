import { useEffect, useRef, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";

type Props = {
  signalingUrl: string;
};

export default function WebRTCRoom({ signalingUrl }: Props) {
  const [roomId, setRoomId] = useState("demo-room");
  const [userId, setUserId] = useState(
    () => `user-${Math.random().toString(36).slice(2, 8)}`
  );
  const [joined, setJoined] = useState(false);
  const [started, setStarted] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    localStreamRef,
    remoteStreams,
    connectedPeers,
    joinRoom,
    leaveRoom,
    startLocalMedia,
    startCallWith,
    stopLocalTracks
  } = useWebRTC(roomId, userId, { signalingUrl });

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [localStreamRef.current]);

  const handleJoin = async () => {
    await joinRoom();
    setJoined(true);
  };

  const handleStartMedia = async () => {
    const stream = await startLocalMedia();
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    setStarted(true);

    // Auto-call existing peers
    for (const peerId of connectedPeers) {
      await startCallWith(peerId);
    }
  };

  const handleCallAll = async () => {
    for (const peerId of connectedPeers) {
      await startCallWith(peerId);
    }
  };

  const handleLeave = async () => {
    stopLocalTracks();
    leaveRoom();
    setJoined(false);
    setStarted(false);
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="room id"
        />
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="your id"
        />
        {!joined ? (
          <button onClick={handleJoin}>Join</button>
        ) : (
          <button onClick={handleLeave}>Leave</button>
        )}
        {joined && !started && (
          <button onClick={handleStartMedia}>Start Camera</button>
        )}
        {joined && started && (
          <button onClick={handleCallAll}>Call Peers</button>
        )}
      </div>

      <div style={{ fontSize: "14px", color: "#666" }}>
        <div>
          Status: {joined ? "Joined" : "Not joined"} |{" "}
          {started ? "Media started" : "No media"}
        </div>
        <div>
          Connected peers: {connectedPeers.length} ({connectedPeers.join(", ")})
        </div>
        <div>Remote streams: {Object.keys(remoteStreams).length}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div>Local</div>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", background: "#000" }}
          />
        </div>

        <div>
          <div>Remotes</div>
          <div style={{ display: "grid", gap: 8 }}>
            {Object.entries(remoteStreams).map(([peerId, stream]) => (
              <video
                key={peerId}
                autoPlay
                playsInline
                style={{ width: "100%", background: "#000" }}
                ref={(el) => {
                  if (el) el.srcObject = stream;
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
