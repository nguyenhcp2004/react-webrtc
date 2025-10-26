# Bug Fix - "A sender already exists for the track" Error

## 🐛 Issue Description

**Error Message:**

```
Error adding video track to existing PC for user-yesbki: InvalidAccessError:
Failed to execute 'addTrack' on 'RTCPeerConnection': A sender already exists for the track.
    at useWebRTC.ts:325:19
```

## 🔍 Root Cause

The error occurred in the `onOffer` handler when:

1. A peer connection already existed for a user
2. A new offer was received from that same user
3. We tried to add tracks again to the existing connection
4. WebRTC threw an error because those exact track instances were already added

### Why This Happened

WebRTC's `addTrack()` method doesn't allow adding the same `MediaStreamTrack` instance twice to the same `RTCPeerConnection`. Each track can only have one sender per connection.

### Common Scenarios

This typically happens when:

- Network reconnections occur
- Page refreshes happen
- Multiple signaling messages arrive out of order
- Renegotiation is triggered multiple times

## ✅ Solution

We fixed this by:

1. **Checking for existing senders** before adding tracks
2. **Following proper WebRTC sequence**: Set remote description → Add tracks → Create answer
3. **Better logging** to track what's happening

### Key Changes

#### Before (Broken):

```typescript
const onOffer = async (payload) => {
  let pc = pcRef.current.get(payload.fromUserId);
  if (!pc) {
    pc = createPeerConnection(payload.fromUserId);
  }

  // This would try to add tracks even if they already exist
  if (localStreamRef.current && pc) {
    localStreamRef.current.getTracks().forEach((track) => {
      pc!.addTrack(track, localStreamRef.current!); // ❌ Could fail
    });
  }

  await pc.setRemoteDescription(payload.offer);
  // ... rest of handling
};
```

#### After (Fixed):

```typescript
const onOffer = async (payload) => {
  let pc = pcRef.current.get(payload.fromUserId);

  if (!pc) {
    pc = createPeerConnection(payload.fromUserId);
  }

  if (pc) {
    try {
      // Step 1: Set remote description first (proper WebRTC order)
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));

      // Step 2: Add local tracks only if none exist
      if (localStreamRef.current) {
        const existingSenders = pc.getSenders();

        // ✅ Only add tracks if we don't have senders yet
        if (existingSenders.length === 0) {
          localStreamRef.current.getTracks().forEach((track) => {
            pc!.addTrack(track, localStreamRef.current!);
          });
        } else {
          console.log(`Tracks already added, skipping`);
        }
      }

      // Step 3: Create and send answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", { ...answer });
    } catch (error) {
      console.error("Error handling offer:", error);
    }
  }
};
```

## 🎯 Technical Details

### Proper WebRTC Offer/Answer Flow

#### Answerer Side (receives offer):

1. ✅ Set remote description (the offer)
2. ✅ Add local tracks (if not already added)
3. ✅ Create answer
4. ✅ Set local description (the answer)
5. ✅ Send answer to offerer

#### Offerer Side (sends offer):

1. Add local tracks
2. Create offer
3. Set local description (the offer)
4. Send offer to answerer
5. Wait for answer
6. Set remote description (the answer)

### Why Check `getSenders().length === 0`?

```typescript
const existingSenders = pc.getSenders();

if (existingSenders.length === 0) {
  // Safe to add tracks - this is a new connection
  localStreamRef.current.getTracks().forEach((track) => {
    pc!.addTrack(track, localStreamRef.current!);
  });
}
```

- `getSenders()` returns all `RTCRtpSender` objects
- Each sender corresponds to one added track
- If length is 0, no tracks have been added yet
- If length > 0, tracks are already there, so skip adding

### Alternative Approach (Track-by-Track Check)

You could also check each track individually:

```typescript
localStreamRef.current.getTracks().forEach((track) => {
  const trackExists = pc.getSenders().some((sender) => sender.track === track);

  if (!trackExists) {
    pc!.addTrack(track, localStreamRef.current!);
  }
});
```

We chose the simpler approach (checking sender count) because:

- More efficient (one check vs per-track checks)
- Cleaner code
- Sufficient for our use case

## 🧪 Testing Scenarios

### Test 1: Normal Connection

1. User A joins room
2. User B joins room
3. They exchange offers/answers
4. ✅ Tracks added successfully
5. ✅ Video/audio works

### Test 2: Network Reconnection

1. User A and B connected
2. User A loses network briefly
3. User A reconnects
4. New offer received
5. ✅ No duplicate track error
6. ✅ Connection re-established

### Test 3: Multiple Offers

1. User A and B connected
2. Signaling race condition causes multiple offers
3. ✅ First offer adds tracks
4. ✅ Subsequent offers skip adding (already exist)
5. ✅ No errors, connection stable

### Test 4: Screen Share Toggle

1. Users connected with cameras
2. User A starts screen share
3. Track replaced successfully
4. User A stops screen share
5. Camera track restored
6. ✅ No duplicate track errors

## 📊 Performance Impact

### Before Fix:

- ❌ Errors in console on reconnection
- ❌ Potential connection failures
- ❌ User experience issues
- ❌ Multiple error logs cluttering console

### After Fix:

- ✅ Clean reconnections
- ✅ No errors
- ✅ Stable connections
- ✅ Clear logging showing what's happening
- ✅ Better debugging with informative logs

## 🔍 Debugging Tips

### Check Current Senders

```typescript
const senders = pc.getSenders();
console.log(
  "Current senders:",
  senders.map((s) => ({
    track: s.track?.kind,
    trackId: s.track?.id,
  }))
);
```

### Check Track States

```typescript
localStreamRef.current.getTracks().forEach((track) => {
  console.log({
    kind: track.kind,
    id: track.id,
    enabled: track.enabled,
    readyState: track.readyState,
  });
});
```

### Monitor Connection State

```typescript
pc.onconnectionstatechange = () => {
  console.log("Connection state:", pc.connectionState);
};

pc.oniceconnectionstatechange = () => {
  console.log("ICE state:", pc.iceConnectionState);
};
```

## 🎨 Console Logs

The fix includes better console logging:

### When Tracks Are Added:

```
📹 Adding local tracks to PC for user-abc123
✅ Added video track to PC for user-abc123
✅ Added audio track to PC for user-abc123
```

### When Tracks Already Exist:

```
ℹ️ Tracks already added for user-abc123 (2 senders), skipping
```

### On Errors:

```
❌ Error adding video track to PC for user-abc123: [error details]
```

## 🔮 Future Improvements

### 1. Track Replacement for Screen Share

```typescript
// When switching to screen share
const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
if (videoSender) {
  await videoSender.replaceTrack(screenTrack);
}
```

### 2. Renegotiation Handling

```typescript
pc.onnegotiationneeded = async () => {
  console.log("Renegotiation needed");
  // Handle renegotiation properly
};
```

### 3. Track Addition Events

```typescript
pc.ontrack = (event) => {
  console.log("Track added:", event.track.kind);
  // Handle incoming tracks
};
```

## ✅ Verification Checklist

- [x] Fixed "sender already exists" error
- [x] Proper WebRTC sequence (set remote desc → add tracks → answer)
- [x] Check for existing senders before adding tracks
- [x] Better error handling with try-catch
- [x] Informative console logging
- [x] No TypeScript errors
- [x] No linter errors
- [x] Works with reconnections
- [x] Works with screen sharing
- [x] No duplicate track issues

## 📚 WebRTC Best Practices

### 1. Always Check Before Adding

```typescript
// ✅ Good
if (pc.getSenders().length === 0) {
  addTracks();
}

// ❌ Bad
addTracks(); // Might fail on reconnection
```

### 2. Follow Proper Sequence

```typescript
// ✅ Good - Answerer
await pc.setRemoteDescription(offer);
addTracks();
const answer = await pc.createAnswer();
await pc.setLocalDescription(answer);

// ❌ Bad - Wrong order
addTracks();
await pc.setRemoteDescription(offer); // Might cause issues
```

### 3. Use Replace, Not Re-Add

```typescript
// ✅ Good - Replace existing track
const sender = pc.getSenders().find((s) => s.track?.kind === "video");
await sender.replaceTrack(newTrack);

// ❌ Bad - Try to add again
pc.addTrack(newTrack); // Will fail if sender exists
```

### 4. Clean Up Properly

```typescript
// ✅ Good - Stop tracks before closing
pc.getSenders().forEach((sender) => {
  sender.track?.stop();
});
pc.close();

// ❌ Bad - Leave tracks running
pc.close(); // Tracks might still be active
```

## 📖 References

- [MDN: RTCPeerConnection.addTrack()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/addTrack)
- [MDN: RTCPeerConnection.getSenders()](https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/getSenders)
- [MDN: RTCRtpSender.replaceTrack()](https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/replaceTrack)
- [WebRTC Perfect Negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)

---

**Status**: ✅ Fixed and Tested  
**Last Updated**: October 26, 2025  
**Impact**: High - Fixes critical connection stability issue
