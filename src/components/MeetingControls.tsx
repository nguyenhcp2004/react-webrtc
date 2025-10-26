import { useState, useEffect } from "react";

interface Props {
  roomId: string;
  userId: string;
  socket: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isHandRaised: boolean;
  onToggleHand: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  onStartScreenShare: () => void;
  onStopScreenShare: () => void;
  isScreenSharing: boolean;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
}

export default function MeetingControls({
  roomId,
  userId,
  socket,
  isHandRaised,
  onToggleHand,
  isRecording,
  onToggleRecording,
  onStartScreenShare,
  onStopScreenShare,
  isScreenSharing,
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
}: Props) {
  const [raisedHands, setRaisedHands] = useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleHandRaised = (data: { userId: string; timestamp: number }) => {
      console.log("Hand raised event received:", data);
      setRaisedHands((prev) => {
        const newList = [
          ...prev.filter((id) => id !== data.userId),
          data.userId,
        ];
        console.log("Updated raised hands:", newList);
        return newList;
      });
    };

    const handleHandLowered = (data: { userId: string; timestamp: number }) => {
      console.log("Hand lowered event received:", data);
      setRaisedHands((prev) => {
        const newList = prev.filter((id) => id !== data.userId);
        console.log("Updated raised hands:", newList);
        return newList;
      });
    };

    socket.on("hand-raised", handleHandRaised);
    socket.on("hand-lowered", handleHandLowered);

    return () => {
      socket.off("hand-raised", handleHandRaised);
      socket.off("hand-lowered", handleHandLowered);
    };
  }, [socket]);

  const handleHandToggle = () => {
    console.log("Hand toggle clicked", {
      socket: !!socket,
      roomId,
      userId,
      isHandRaised,
    });
    if (!socket) {
      console.error("Socket not available");
      return;
    }

    if (isHandRaised) {
      socket.emit("lower-hand", { roomId, userId });
      console.log("Emitted lower-hand");
    } else {
      socket.emit("raise-hand", { roomId, userId });
      console.log("Emitted raise-hand");
    }
    onToggleHand();
  };

  const handleRecordingToggle = () => {
    if (!socket) return;

    if (isRecording) {
      socket.emit("stop-recording", { roomId, userId });
    } else {
      socket.emit("start-recording", { roomId, userId });
    }
    onToggleRecording();
  };

  const handleScreenShareToggle = async () => {
    try {
      if (isScreenSharing) {
        onStopScreenShare();
      } else {
        await onStartScreenShare();
      }
    } catch (error) {
      console.error("Screen share error:", error);
    }
  };

  return (
    <>
      {/* Main Control Bar */}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "16px",
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,30,0.95))",
          backdropFilter: "blur(20px)",
          padding: "16px 24px",
          borderRadius: "60px",
          zIndex: 1000,
          boxShadow:
            "0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Audio Toggle Button */}
        <button
          onClick={onToggleAudio}
          style={{
            background: isAudioEnabled
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              : "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 56,
            height: 56,
            cursor: "pointer",
            fontSize: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
            boxShadow: isAudioEnabled
              ? "0 4px 16px rgba(102, 126, 234, 0.4)"
              : "0 4px 16px rgba(220, 53, 69, 0.4)",
          }}
          title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {isAudioEnabled ? "🎤" : "🔇"}
        </button>

        {/* Video Toggle Button */}
        <button
          onClick={onToggleVideo}
          style={{
            background: isVideoEnabled
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              : "linear-gradient(135deg, #dc3545 0%, #c82333 100%)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 56,
            height: 56,
            cursor: "pointer",
            fontSize: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
            boxShadow: isVideoEnabled
              ? "0 4px 16px rgba(102, 126, 234, 0.4)"
              : "0 4px 16px rgba(220, 53, 69, 0.4)",
          }}
          title={isVideoEnabled ? "Turn Off Camera" : "Turn On Camera"}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {isVideoEnabled ? "📹" : "📷"}
        </button>

        {/* Divider */}
        <div
          style={{
            width: "1px",
            height: "56px",
            background:
              "linear-gradient(180deg, transparent, rgba(255,255,255,0.2), transparent)",
          }}
        />

        {/* Screen Share Button */}
        <button
          onClick={handleScreenShareToggle}
          style={{
            background: isScreenSharing
              ? "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
              : "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 56,
            height: 56,
            cursor: "pointer",
            fontSize: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
            boxShadow: isScreenSharing
              ? "0 4px 16px rgba(240, 147, 251, 0.5)"
              : "0 4px 16px rgba(250, 112, 154, 0.4)",
          }}
          title={isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {isScreenSharing ? "🛑" : "🖥️"}
        </button>

        {/* Hand Raise Button */}
        <button
          onClick={handleHandToggle}
          style={{
            background: isHandRaised
              ? "linear-gradient(135deg, #ffc107 0%, #ff9800 100%)"
              : "linear-gradient(135deg, #6c757d 0%, #495057 100%)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 56,
            height: 56,
            cursor: "pointer",
            fontSize: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
            boxShadow: isHandRaised
              ? "0 4px 16px rgba(255, 193, 7, 0.4)"
              : "0 4px 16px rgba(108, 117, 125, 0.3)",
          }}
          title={isHandRaised ? "Lower Hand" : "Raise Hand"}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1) rotate(15deg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1) rotate(0deg)";
          }}
        >
          ✋
        </button>

        {/* Recording Button */}
        <button
          onClick={handleRecordingToggle}
          style={{
            background: isRecording
              ? "linear-gradient(135deg, #dc3545 0%, #c82333 100%)"
              : "linear-gradient(135deg, #28a745 0%, #218838 100%)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 56,
            height: 56,
            cursor: "pointer",
            fontSize: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.3s ease",
            boxShadow: isRecording
              ? "0 4px 16px rgba(220, 53, 69, 0.5)"
              : "0 4px 16px rgba(40, 167, 69, 0.3)",
            animation: isRecording ? "recordingPulse 2s infinite" : "none",
          }}
          title={isRecording ? "Stop Recording" : "Start Recording"}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          {isRecording ? "⏹️" : "⏺️"}
        </button>
      </div>

      {/* Raised Hands Indicator */}
      {raisedHands.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #ffc107 0%, #ff9800 100%)",
            backdropFilter: "blur(20px)",
            color: "#333",
            padding: "12px 20px",
            borderRadius: "30px",
            fontSize: "14px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 999,
            boxShadow: "0 8px 32px rgba(255, 193, 7, 0.4)",
            border: "2px solid rgba(255,255,255,0.3)",
            animation: "bounceIn 0.5s ease",
          }}
        >
          <span style={{ fontSize: "20px" }}>✋</span>
          <span>
            {raisedHands.length} hand{raisedHands.length > 1 ? "s" : ""} raised
          </span>
          <div
            style={{
              fontSize: "12px",
              marginLeft: "4px",
              opacity: 0.8,
              fontWeight: "600",
            }}
          >
            ({raisedHands.join(", ")})
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes recordingPulse {
          0%, 100% { 
            box-shadow: 0 4px 16px rgba(220, 53, 69, 0.5);
          }
          50% { 
            box-shadow: 0 4px 32px rgba(220, 53, 69, 0.8), 0 0 0 8px rgba(220, 53, 69, 0.2);
          }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(20px) scale(0.8);
          }
          50% {
            transform: translateX(-50%) translateY(-5px) scale(1.05);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0) scale(1);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </>
  );
}
