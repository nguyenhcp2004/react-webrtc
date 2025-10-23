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
  isScreenSharing
}: Props) {
  const [raisedHands, setRaisedHands] = useState<string[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleHandRaised = (data: { userId: string; timestamp: number }) => {
      console.log("Hand raised event received:", data);
      setRaisedHands((prev) => {
        const newList = [
          ...prev.filter((id) => id !== data.userId),
          data.userId
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
      isHandRaised
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

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "12px",
        background: "rgba(0,0,0,0.8)",
        padding: "12px 20px",
        borderRadius: "25px",
        zIndex: 1000
      }}
    >
      {/* Hand Raise Button */}
      <button
        onClick={handleHandToggle}
        style={{
          background: isHandRaised ? "#ffc107" : "#6c757d",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: 50,
          height: 50,
          cursor: "pointer",
          fontSize: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.3s ease"
        }}
        title={isHandRaised ? "Lower Hand" : "Raise Hand"}
      >
        {isHandRaised ? "✋" : "✋"}
      </button>

      {/* Screen Share Button */}
      <button
        onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
        style={{
          background: isScreenSharing ? "#dc3545" : "#28a745",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: 50,
          height: 50,
          cursor: "pointer",
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        title={isScreenSharing ? "Stop Screen Share" : "Start Screen Share"}
      >
        {isScreenSharing ? "🛑" : "📺"}
      </button>

      {/* Recording Button */}
      <button
        onClick={handleRecordingToggle}
        style={{
          background: isRecording ? "#dc3545" : "#ffc107",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: 50,
          height: 50,
          cursor: "pointer",
          fontSize: "18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
        title={isRecording ? "Stop Recording" : "Start Recording"}
      >
        {isRecording ? "⏹️" : "⏺️"}
      </button>

      {/* Raised Hands Indicator */}
      {raisedHands.length > 0 && (
        <div
          style={{
            background: "#ffc107",
            color: "#333",
            padding: "8px 12px",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            animation: "pulse 1s infinite"
          }}
        >
          ✋ {raisedHands.length} hand{raisedHands.length > 1 ? "s" : ""} raised
          <div style={{ fontSize: "12px", marginLeft: "4px" }}>
            ({raisedHands.join(", ")})
          </div>
        </div>
      )}
    </div>
  );
}
