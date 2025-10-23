# WebRTC Testing Guide

## How to Test the WebRTC Connection

### Step 1: Start the Development Server

```bash
npm run dev
```

### Step 2: Open Multiple Browser Windows/Tabs

1. Open the app in one browser window/tab
2. Open the app in another browser window/tab (or use incognito mode)

### Step 3: Test the Connection

1. **First User:**

   - Enter a room ID (e.g., "test-room")
   - Enter a user ID (e.g., "user1")
   - Click "Join"
   - Click "Start Camera"
   - You should see your own video

2. **Second User:**
   - Enter the same room ID ("test-room")
   - Enter a different user ID (e.g., "user2")
   - Click "Join"
   - Click "Start Camera"
   - You should see your own video AND the first user's video

### Step 4: Check Console Logs

Open the browser developer tools (F12) and check the console for these logs:

- `✅ Socket connected:` - WebSocket connection established
- `👥 Existing users:` - When users join the room
- `📞 Starting call with` - When WebRTC calls are initiated
- `📹 Received track from` - When remote video tracks are received
- `🎥 Setting remote stream for` - When remote streams are set to video elements

### Troubleshooting

#### If you can't see remote videos:

1. Check if both users have started their cameras
2. Check the console for error messages
3. Ensure both users are in the same room
4. Check if the signaling server is running and accessible

#### Common Issues:

- **Permission denied**: Make sure to allow camera/microphone access
- **Network issues**: Check if the signaling server URL is correct
- **Firewall**: Ensure WebRTC traffic is not blocked

### Expected Behavior:

- Both users should see each other's video streams
- The status should show "Connected peers: 1" for each user
- Remote streams count should show "1" for each user
- Console should show successful track reception and stream setting
