import { useEffect, useRef, useState } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import Chat from "./Chat";
import MeetingControls from "./MeetingControls";

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
    screenShareStream,
    remoteScreenShares,
    isAudioEnabled,
    isVideoEnabled,
    joinRoom,
    leaveRoom,
    startLocalMedia,
    startCallWith,
    stopLocalTracks,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare
  } = useWebRTC(roomId, userId, { signalingUrl });

  useEffect(() => {
    if (localVideoRef.current) {
      // Prioritize screen share stream for local view
      const streamToShow =
        isScreenSharing && screenShareStream
          ? screenShareStream
          : localStreamRef.current;

      if (streamToShow) {
        console.log("🎥 Setting local video stream:", streamToShow);
        localVideoRef.current.srcObject = streamToShow;
      }
    }
  }, [localStreamRef, isScreenSharing, screenShareStream]);

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
      // autoPlay attribute on video element will handle playback
      // Only call play() if autoPlay fails due to user gesture requirement
      localVideoRef.current.play().catch((error) => {
        // Silently handle AbortError - it's a race condition when updating srcObject
        if (error.name !== "AbortError") {
          console.warn("⚠️ Could not autoplay local video immediately:", error);
        }
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
    <div
      style={{
        display: "grid",
        gap: 12,
        minHeight: "100vh",
        position: "relative"
      }}
    >
      {/* Screen Share Notification */}
      {isScreenSharing && (
        <div
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            color: "white",
            padding: "12px 24px",
            borderRadius: "30px",
            fontSize: "14px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 1000,
            boxShadow: "0 8px 32px rgba(240, 147, 251, 0.5)",
            border: "2px solid rgba(255,255,255,0.3)",
            backdropFilter: "blur(20px)",
            animation: "slideDown 0.5s ease"
          }}
        >
          <span style={{ fontSize: "20px" }}>🖥️</span>
          <span>You are sharing your screen</span>
          <button
            onClick={stopScreenShare}
            style={{
              background: "rgba(255,255,255,0.2)",
              color: "white",
              border: "none",
              borderRadius: "20px",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.2)";
            }}
          >
            Stop Sharing
          </button>
        </div>
      )}

      {/* Remote Screen Share Notifications */}
      {Object.entries(remoteScreenShares).length > 0 && (
        <div
          style={{
            position: "fixed",
            top: isScreenSharing ? 80 : 20,
            right: 20,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            zIndex: 1000,
            animation: "slideInRight 0.5s ease"
          }}
        >
          {Object.entries(remoteScreenShares).map(([peerId, isSharing]) =>
            isSharing ? (
              <div
                key={peerId}
                style={{
                  background:
                    "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
                  color: "#333",
                  padding: "10px 16px",
                  borderRadius: "25px",
                  fontSize: "13px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 16px rgba(250, 112, 154, 0.4)",
                  border: "2px solid rgba(255,255,255,0.3)",
                  backdropFilter: "blur(20px)"
                }}
              >
                <span style={{ fontSize: "16px" }}>🖥️</span>
                <span>{peerId} is presenting</span>
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center"
        }}
      >
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="room id"
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ddd"
          }}
        />
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          placeholder="your id"
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ddd"
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
              cursor: "pointer"
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
              cursor: "pointer"
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
              cursor: "pointer"
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
              cursor: "pointer"
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
          borderRadius: "6px"
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
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "12px",
            overflow: "hidden",
            position: "relative",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            transition: "transform 0.3s ease"
          }}
        >
          {/* Header Badge */}
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              background: isScreenSharing
                ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                : "rgba(0,0,0,0.7)",
              backdropFilter: "blur(10px)",
              color: "white",
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "600",
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
            }}
          >
            {isScreenSharing ? "🖥️ Screen Share" : "👤 You"}
          </div>

          {/* Media Status Indicators */}
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              display: "flex",
              gap: "8px"
            }}
          >
            {!isAudioEnabled && (
              <div
                style={{
                  background: "rgba(220, 53, 69, 0.9)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  padding: "6px",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  boxShadow: "0 4px 12px rgba(220, 53, 69, 0.4)"
                }}
                title="Microphone Off"
              >
                🔇
              </div>
            )}
            {!isVideoEnabled && (
              <div
                style={{
                  background: "rgba(220, 53, 69, 0.9)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  padding: "6px",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  boxShadow: "0 4px 12px rgba(220, 53, 69, 0.4)"
                }}
                title="Camera Off"
              >
                📷
              </div>
            )}
          </div>

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "240px",
              objectFit: "cover",
              filter: !isVideoEnabled ? "blur(20px)" : "none"
            }}
            onLoadedMetadata={() => {
              console.log("✅ Local video loaded");
            }}
            onError={(e) => {
              console.error("❌ Local video error:", e);
            }}
          />

          {/* No Video Placeholder */}
          {!isVideoEnabled && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                fontSize: "48px"
              }}
            >
              👤
            </div>
          )}
        </div>

        {/* Remote Videos */}
        {Object.entries(remoteStreams).length === 0 &&
          connectedPeers.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
                border: "2px dashed rgba(255,255,255,0.3)",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "240px",
                color: "white",
                fontSize: "16px",
                fontWeight: "600",
                gap: "12px",
                boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
              }}
            >
              <div style={{ fontSize: "48px", animation: "pulse 2s infinite" }}>
                ⏳
              </div>
              <div>Waiting for remote video...</div>
            </div>
          )}
        {Object.entries(remoteStreams).map(([peerId, stream]) => {
          const isRemoteScreenSharing = remoteScreenShares[peerId];
          return (
            <div
              key={peerId}
              style={{
                background: isRemoteScreenSharing
                  ? "linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
                  : "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
                borderRadius: "12px",
                overflow: "hidden",
                position: "relative",
                boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                transition: "transform 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {/* Header Badge */}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  left: 12,
                  background: isRemoteScreenSharing
                    ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                    : "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(10px)",
                  color: "white",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "13px",
                  fontWeight: "600",
                  zIndex: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.2)"
                }}
              >
                {isRemoteScreenSharing ? "🖥️" : "👤"} {peerId}
              </div>

              {/* Screen Share Badge */}
              {isRemoteScreenSharing && (
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "rgba(255, 193, 7, 0.95)",
                    backdropFilter: "blur(10px)",
                    color: "#333",
                    padding: "6px 12px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "700",
                    zIndex: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 4px 12px rgba(255, 193, 7, 0.4)",
                    animation: "pulse 2s infinite"
                  }}
                >
                  ✨ Presenting
                </div>
              )}

              <video
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "240px",
                  objectFit: isRemoteScreenSharing ? "contain" : "cover",
                  background: "#000"
                }}
                ref={(el) => {
                  if (el && stream) {
                    // Only set srcObject if it's different to avoid interrupting playback
                    if (el.srcObject !== stream) {
                      console.log(
                        `🎥 Setting remote video for ${peerId}:`,
                        stream
                      );
                      console.log(`🎥 Stream details:`, {
                        id: stream.id,
                        active: stream.active,
                        tracks: stream.getTracks().length,
                        videoTracks: stream.getVideoTracks().length,
                        audioTracks: stream.getAudioTracks().length
                      });
                      el.srcObject = stream;
                      // Don't manually call play() - autoPlay attribute handles it
                      // This avoids conflicts when stream updates rapidly
                    }
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
          );
        })}
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
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
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

      {/* CSS Animations */}
      <style>{`
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        @keyframes slideInRight {
          0% {
            opacity: 0;
            transform: translateX(20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
      `}</style>
    </div>
  );
}
