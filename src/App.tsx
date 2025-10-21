import "./App.css";
import WebRTCRoom from "./components/WebRTCRoom";

function App() {
  const signalingUrl =
    import.meta.env.VITE_SIGNALING_URL || "http://localhost:3000";
  return (
    <div style={{ padding: 16 }}>
      <h2>WebRTC Demo</h2>
      <WebRTCRoom signalingUrl={signalingUrl} />
    </div>
  );
}

export default App;
