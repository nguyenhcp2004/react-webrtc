import { useEffect, useRef, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import Chat from "./Chat";
import MeetingControls from "./MeetingControls";

// RemoteVideo component to properly handle remote streams
function RemoteVideo({
  peerId,
  stream,
}: {
  peerId: string;
  stream: MediaStream;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log(`🎥 Setting remote stream for ${peerId}:`, stream);
      videoRef.current.srcObject = stream;

      // Ensure the video plays
      videoRef.current.play().catch((error) => {
        console.warn(`⚠️ Could not autoplay video for ${peerId}:`, error);
      });
    }
  }, [stream, peerId]);

  return (
    <div
      style={{
        background: "#000",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 10,
        }}
      >
        {peerId}
      </div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "100%", height: "200px", objectFit: "cover" }}
      />
    </div>
  );
}

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  const {
    socket,
    localStreamRef,
    remoteStreams,
    connectedPeers,
    isScreenSharing,
    joinRoom,
    leaveRoom,
    startLocalMedia,
    startCallWith,
    stopLocalTracks,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(roomId, userId, { signalingUrl });

  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      console.log("🎥 Setting local video stream:", localStreamRef.current);
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [localStreamRef]);

  // Debug remote streams
  useEffect(() => {
    console.log("📹 Remote streams updated:", Object.keys(remoteStreams));
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      console.log(`📹 Remote stream for ${peerId}:`, stream);
      console.log(
        `📹 Stream tracks:`,
        stream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState
        }))
      );
    });
  }, [remoteStreams]);

  const handleJoin = async () => {
    console.log("Joining room...", { roomId, userId });
    await joinRoom();
    setJoined(true);
    console.log("Socket after join:", socket?.current?.id);
  };

  const handleStartMedia = async () => {
    console.log("🎥 Starting local media...");
    const stream = await startLocalMedia();
    console.log("🎥 Local stream obtained:", stream);
    console.log("🎥 Stream tracks:", stream.getTracks());

    // Ensure local video is set up immediately
    if (localVideoRef.current && stream) {
      console.log("🎥 Setting local video immediately");
      localVideoRef.current.srcObject = stream;
      localVideoRef.current.play().catch((error) => {
        console.warn("⚠️ Could not autoplay local video immediately:", error);
      });
    }

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
    <div style={{ display: "grid", gap: 12, minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder='room id'
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ddd",
          }}
        />
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder='your id'
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ddd",
          }}
        />
        {!joined ? (
          <button
            onClick={handleJoin}
            style={{
              padding: "8px 16px",
              background: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Join
          </button>
        ) : (
          <button
            onClick={handleLeave}
            style={{
              padding: "8px 16px",
              background: "#dc3545",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Leave
          </button>
        )}
        {joined && !started && (
          <button
            onClick={handleStartMedia}
            style={{
              padding: "8px 16px",
              background: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Start Camera
          </button>
        )}
        {joined && started && (
          <button
            onClick={handleCallAll}
            style={{
              padding: "8px 16px",
              background: "#ffc107",
              color: "#333",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Call Peers
          </button>
        )}
        {joined && (
          <button
            onClick={() => {
              console.log("🔍 Debug info:", {
                roomId,
                userId,
                connectedPeers,
                remoteStreams: Object.keys(remoteStreams),
                socketId: socket?.current?.id
              });
              socket?.current?.emit("debug-room-state", { roomId });
            }}
            style={{
              padding: "8px 16px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer"
            }}
          >
            Debug
          </button>
        )}
      </div>

      {/* Status */}
      <div
        style={{
          fontSize: "14px",
          color: "#666",
          background: "#f8f9fa",
          padding: "12px",
          borderRadius: "6px",
        }}
      >
        <div>
          Status: {joined ? "✅ Joined" : "❌ Not joined"} |{" "}
          {started ? "📹 Media started" : "📷 No media"}
          {isScreenSharing && " | 🖥️ Screen sharing"}
          {isRecording && " | 🔴 Recording"}
        </div>
        <div>
          Connected peers: {connectedPeers.length} ({connectedPeers.join(", ")})
        </div>
        <div>Remote streams: {Object.keys(remoteStreams).length}</div>
        <div>Remote stream IDs: {Object.keys(remoteStreams).join(", ")}</div>
      </div>

      {/* Video Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            Object.keys(remoteStreams).length === 1
              ? "1fr 1fr"
              : "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          flex: 1,
          minHeight: "400px"
        }}
      >
        {/* Local Video */}
        <div
          style={{
            background: "#000",
            borderRadius: "8px",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              background: "rgba(0,0,0,0.7)",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              zIndex: 10,
            }}
          >
            {isScreenSharing ? "Screen Share" : "You"}
          </div>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ width: "100%", height: "240px", objectFit: "cover" }}
            onLoadedMetadata={() => {
              console.log("✅ Local video loaded");
            }}
            onError={(e) => {
              console.error("❌ Local video error:", e);
            }}
          />
        </div>

        {/* Remote Videos */}
        {Object.entries(remoteStreams).length === 0 &&
          connectedPeers.length > 0 && (
            <div
              style={{
                background: "#f8f9fa",
                border: "2px dashed #dee2e6",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "240px",
                color: "#6c757d",
                fontSize: "16px"
              }}
            >
              Waiting for remote video...
            </div>
          )}
        {Object.entries(remoteStreams).map(([peerId, stream]) => (
          <div
            key={peerId}
            style={{
              background: "#000",
              borderRadius: "8px",
              overflow: "hidden",
              position: "relative"
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                background: "rgba(0,0,0,0.7)",
                color: "white",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                zIndex: 10
              }}
            >
              {peerId}
            </div>
            <video
              autoPlay
              playsInline
              style={{ width: "100%", height: "240px", objectFit: "cover" }}
              ref={(el) => {
                if (el && stream) {
                  console.log(`🎥 Setting remote video for ${peerId}:`, stream);
                  console.log(`🎥 Stream details:`, {
                    id: stream.id,
                    active: stream.active,
                    tracks: stream.getTracks().length,
                    videoTracks: stream.getVideoTracks().length,
                    audioTracks: stream.getAudioTracks().length
                  });
                  el.srcObject = stream;

                  // Force play
                  el.play().catch((error) => {
                    console.warn(
                      `⚠️ Could not autoplay remote video for ${peerId}:`,
                      error
                    );
                  });
                }
              }}
              onLoadedMetadata={() => {
                console.log(`✅ Remote video loaded for ${peerId}`);
              }}
              onError={(e) => {
                console.error(`❌ Remote video error for ${peerId}:`, e);
              }}
            />
          </div>
        ))}
      </div>

      {/* Meeting Controls */}
      {joined && started && (
        <MeetingControls
          roomId={roomId}
          userId={userId}
          socket={socket?.current}
          isHandRaised={isHandRaised}
          onToggleHand={() => setIsHandRaised(!isHandRaised)}
          isRecording={isRecording}
          onToggleRecording={() => setIsRecording(!isRecording)}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          isScreenSharing={isScreenSharing}
        />
      )}

      {/* Chat */}
      {joined && (
        <Chat
          roomId={roomId}
          userId={userId}
          socket={socket?.current}
          isOpen={isChatOpen}
          onToggle={() => setIsChatOpen(!isChatOpen)}
        />
      )}
    </div>
  );
}
