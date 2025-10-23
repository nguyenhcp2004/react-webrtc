import { useState, useEffect, useRef } from "react";

interface Message {
  userId: string;
  message: string;
  timestamp: number;
}

interface Props {
  roomId: string;
  userId: string;
  socket: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  isOpen: boolean;
  onToggle: () => void;
}

export default function Chat({
  roomId,
  userId,
  socket,
  isOpen,
  onToggle
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data: Message) => {
      console.log("New message event received:", data);
      setMessages((prev) => {
        const newMessages = [...prev, data];
        console.log("Updated messages:", newMessages);
        return newMessages;
      });
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.off("new-message", handleNewMessage);
    };
  }, [socket]);

  const sendMessage = () => {
    console.log("Send message clicked", {
      socket: !!socket,
      newMessage: newMessage.trim()
    });
    if (!newMessage.trim() || !socket) {
      console.error("Cannot send message:", {
        hasMessage: !!newMessage.trim(),
        hasSocket: !!socket
      });
      return;
    }

    const messageData = {
      roomId,
      userId,
      message: newMessage.trim(),
      timestamp: Date.now()
    };

    console.log("Emitting send-message:", messageData);
    socket.emit("send-message", messageData);
    setNewMessage("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          background: "#007bff",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: 60,
          height: 60,
          fontSize: "20px",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          zIndex: 1000
        }}
      >
        💬
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        width: 350,
        height: 500,
        background: "white",
        border: "1px solid #ddd",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f8f9fa",
          borderRadius: "12px 12px 0 0"
        }}
      >
        <h3 style={{ margin: 0, fontSize: "16px", color: "#333" }}>Chat</h3>
        <button
          onClick={onToggle}
          style={{
            background: "none",
            border: "none",
            fontSize: "18px",
            cursor: "pointer",
            color: "#666"
          }}
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.userId === userId ? "flex-end" : "flex-start"
            }}
          >
            <div
              style={{
                background: msg.userId === userId ? "#007bff" : "#f1f3f4",
                color: msg.userId === userId ? "white" : "#333",
                padding: "8px 12px",
                borderRadius: "18px",
                maxWidth: "80%",
                wordWrap: "break-word",
                fontSize: "14px"
              }}
            >
              {msg.message}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "#666",
                marginTop: "2px",
                marginLeft: msg.userId === userId ? 0 : "12px",
                marginRight: msg.userId === userId ? "12px" : 0
              }}
            >
              {msg.userId === userId ? "You" : msg.userId} •{" "}
              {formatTime(msg.timestamp)}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #eee",
          display: "flex",
          gap: "8px"
        }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "20px",
            outline: "none",
            fontSize: "14px"
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          style={{
            background: "#007bff",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 36,
            height: 36,
            cursor: "pointer",
            fontSize: "16px",
            opacity: newMessage.trim() ? 1 : 0.5
          }}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
