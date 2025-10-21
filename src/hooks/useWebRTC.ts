import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type PeerId = string;

type UseWebRTCOptions = {
  signalingUrl: string;
  namespace?: string;
  iceServers?: RTCIceServer[];
};

export function useWebRTC(
  roomId: string,
  userId: string,
  options: UseWebRTCOptions
) {
  const { signalingUrl, namespace = "/webrtc", iceServers } = options;

  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<Map<PeerId, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<PeerId, MediaStream>
  >({});
  const [connectedPeers, setConnectedPeers] = useState<PeerId[]>([]);

  const rtcConfig = useMemo<RTCConfiguration>(
    () => ({
      iceServers: iceServers ?? [{ urls: ["stun:stun.l.google.com:19302"] }]
    }),
    [iceServers]
  );

  const ensureSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    const socket = io(`${signalingUrl}${namespace}`, {
      transports: ["websocket"]
    });

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socketRef.current = socket;
    return socket;
  }, [namespace, signalingUrl]);

  const createPeerConnection = useCallback(
    (peerUserId: PeerId) => {
      const pc = new RTCPeerConnection(rtcConfig);

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socketRef.current?.emit("ice-candidate", {
            roomId,
            targetUserId: peerUserId,
            candidate: e.candidate
          });
        }
      };

      pc.ontrack = (e) => {
        const stream = e.streams[0];
        setRemoteStreams((prev) => ({ ...prev, [peerUserId]: stream }));
      };

      pcRef.current.set(peerUserId, pc);
      return pc;
    },
    [roomId, rtcConfig]
  );

  const joinRoom = useCallback(async () => {
    const socket = ensureSocket();
    console.log("Joining room:", { roomId, userId });
    socket.emit("join-room", { roomId, userId });
  }, [ensureSocket, roomId, userId]);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit("leave-room", { roomId, userId });
    socketRef.current?.disconnect();
    socketRef.current = null;
    pcRef.current.forEach((pc) => pc.close());
    pcRef.current.clear();
    setRemoteStreams({});
    setConnectedPeers([]);
  }, [roomId, userId]);

  const startLocalMedia = useCallback(
    async (
      constraints: MediaStreamConstraints = { audio: true, video: true }
    ) => {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      return stream;
    },
    []
  );

  const startCallWith = useCallback(
    async (peerUserId: PeerId) => {
      const socket = ensureSocket();
      const pc = createPeerConnection(peerUserId);

      // Add local tracks to the new peer connection
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("offer", { roomId, targetUserId: peerUserId, offer });
    },
    [createPeerConnection, ensureSocket, roomId]
  );

  const stopLocalTracks = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
  }, []);

  useEffect(() => {
    const socket = ensureSocket();

    const onExistingUsers = async (
      payload: { userId: string; socketId: string }[]
    ) => {
      console.log("Existing users:", payload);
      for (const user of payload) {
        if (user.userId !== userId) {
          setConnectedPeers((prev) =>
            prev.includes(user.userId) ? prev : [...prev, user.userId]
          );

          // Auto-start call if we have local media
          if (localStreamRef.current) {
            console.log(`Auto-calling existing user: ${user.userId}`);
            await startCallWith(user.userId);
          }
        }
      }
    };
    const onUserJoined = async (payload: {
      userId: string;
      socketId: string;
    }) => {
      console.log("New user joined:", payload);
      setConnectedPeers((prev) =>
        prev.includes(payload.userId) ? prev : [...prev, payload.userId]
      );

      // Auto-start call if we have local media
      if (localStreamRef.current) {
        console.log(`Auto-calling new user: ${payload.userId}`);
        await startCallWith(payload.userId);
      }
    };
    const onUserLeft = (payload: { userId: string }) => {
      setConnectedPeers((prev) => prev.filter((p) => p !== payload.userId));
      const pc = pcRef.current.get(payload.userId);
      pc?.close();
      pcRef.current.delete(payload.userId);
      setRemoteStreams((prev) => {
        const next = { ...prev };
        delete next[payload.userId];
        return next;
      });
    };
    const onOffer = async (payload: {
      offer: RTCSessionDescriptionInit;
      fromUserId: string;
    }) => {
      let pc = pcRef.current.get(payload.fromUserId);
      if (!pc) pc = createPeerConnection(payload.fromUserId);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("answer", {
        roomId,
        targetUserId: payload.fromUserId,
        answer
      });
    };
    const onAnswer = async (payload: {
      answer: RTCSessionDescriptionInit;
      fromUserId: string;
    }) => {
      const pc = pcRef.current.get(payload.fromUserId);
      if (pc)
        await pc.setRemoteDescription(
          new RTCSessionDescription(payload.answer)
        );
    };
    const onCandidate = async (payload: {
      candidate: RTCIceCandidateInit;
      fromUserId: string;
    }) => {
      const pc = pcRef.current.get(payload.fromUserId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    };

    socket.on("existing-users", onExistingUsers);
    socket.on("user-joined", onUserJoined);
    socket.on("user-left", onUserLeft);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onCandidate);

    return () => {
      socket.off("existing-users", onExistingUsers);
      socket.off("user-joined", onUserJoined);
      socket.off("user-left", onUserLeft);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onCandidate);
    };
  }, [createPeerConnection, ensureSocket, roomId, startCallWith, userId]);

  const startScreenShare = useCallback(async () => {
    const getDisplayMedia = (
      navigator.mediaDevices as unknown as {
        getDisplayMedia?: (c?: unknown) => Promise<MediaStream>;
      }
    ).getDisplayMedia;
    if (!getDisplayMedia)
      throw new Error("getDisplayMedia is not supported in this browser");
    const displayStream: MediaStream = await getDisplayMedia({
      video: true
    } as unknown);
    const screenTrack = displayStream.getVideoTracks()[0];
    pcRef.current.forEach((pc) => {
      const sender = pc
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);
    });
    return displayStream;
  }, []);

  return {
    socket: socketRef,
    localStreamRef,
    remoteStreams,
    connectedPeers,
    joinRoom,
    leaveRoom,
    startLocalMedia,
    startCallWith,
    stopLocalTracks,
    startScreenShare
  };
}
