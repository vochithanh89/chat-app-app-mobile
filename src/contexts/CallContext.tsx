import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Platform } from 'react-native';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import { userAPI, friendshipAPI, messageAPI, conversationAPI } from '../services/api';
import { normalizeUser } from '../services/chatMappers';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  type MediaStream,
} from '../services/webrtc';

interface CallContextType {
  callState: 'idle' | 'incoming' | 'outgoing' | 'connected' | 'group-connected';
  activeCall: any;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  participants: Record<string, any>;
  isMicMuted: boolean;
  isCameraOff: boolean;
  startCall: (receiverId: string, type: 'video' | 'audio', existingConvId?: string | null, userInfo?: any) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  startGroupCall: (conversationId: string, type: 'video' | 'audio', groupName: string) => Promise<void>;
  joinGroupCall: (conversationId: string, type?: 'video' | 'audio') => Promise<void>;
  toggleMic: () => void;
  toggleCamera: () => void;
  ongoingGroupCalls: Record<string, any>;
  participantCameraOff: Record<string, boolean>;
}

const CallContext = createContext<CallContextType | null>(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within a CallProvider');
  return context;
};

export const CallProvider = ({ children }: { children: ReactNode }) => {
  const { user: currentUser } = useAuth();

  // States
  const [callState, setCallState] = useState<'idle' | 'incoming' | 'outgoing' | 'connected' | 'group-connected'>('idle');
  const [activeCall, setActiveCall] = useState<any>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [participants, setParticipants] = useState<Record<string, any>>({});

  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [ongoingGroupCalls, setOngoingGroupCalls] = useState<Record<string, any>>({});
  const [participantCameraOff, setParticipantCameraOff] = useState<Record<string, boolean>>({});

  const callStateRef = useRef(callState);
  const activeCallRef = useRef(activeCall);
  const connectedAtRef = useRef<number | null>(null);

  // WebRTC Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<any | null>(null);
  const remoteIceCandidatesQueue = useRef<any[]>([]);
  
  const peerConnectionsRef = useRef<Record<string, any>>({});
  const groupIceQueuesRef = useRef<Record<string, any[]>>({});

  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  const cleanStreams = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteStreams({});
    setParticipants({});
  };

  const closeConnections = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    groupIceQueuesRef.current = {};
    remoteIceCandidatesQueue.current = [];
  };

  const resetCallState = (options = { avoidLogging: false }) => {
    const currentState = callStateRef.current;
    const callData = activeCallRef.current;

    closeConnections();
    cleanStreams();
    connectedAtRef.current = null;
    if (callData?.conversationId) {
      setOngoingGroupCalls(prev => {
        const n = {...prev};
        delete n[callData.conversationId];
        return n;
      });
    }
    setActiveCall(null);
    setCallState('idle');
    setIsMicMuted(false);
    setIsCameraOff(false);
  };

  const getMediaStream = async (type: 'video' | 'audio') => {
    try {
      if (!mediaDevices?.getUserMedia) {
        console.warn(`WebRTC media devices are not available on ${Platform.OS}`);
        return null;
      }
      const isVideo = type === 'video';
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? { facingMode: 'user' } : false,
      });
      localStreamRef.current = stream as MediaStream;
      setLocalStream(stream as MediaStream);
      setIsCameraOff(!isVideo);
      setIsMicMuted(false);
      return stream;
    } catch (e) {
      console.error('Error accessing media', e);
      return null;
    }
  };

  useEffect(() => {
    let timeout: any;
    if (callState === 'outgoing' && !activeCallRef.current?.isGroup) {
      timeout = setTimeout(() => {
        if (callStateRef.current === 'outgoing') endCall();
      }, 30000);
    }
    return () => clearTimeout(timeout);
  }, [callState]);

  const initPeerConnection = (otherUserId: string, conversationId: string) => {
    if (!RTCPeerConnection) {
      console.warn(`RTCPeerConnection is not available on ${Platform.OS}`);
      return null;
    }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => pc.addTrack(track, localStreamRef.current!));
    }
    pc.ontrack = (e: any) => {
      if (e.streams && e.streams[0]) {
        setRemoteStream(e.streams[0]);
      }
    };
    pc.onicecandidate = (e: any) => {
      if (e.candidate) socketService.emit('call:ice-candidate', { to: otherUserId, candidate: e.candidate, conversationId });
    };
    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async (receiverId: string, type: 'video' | 'audio', existingConvId: string | null = null, userInfo: any = null) => {
    if (callStateRef.current !== 'idle') return;
    const stream = await getMediaStream(type);
    if (!stream) return;

    let convId = existingConvId || ('mobile-rtc-' + Date.now().toString(36));
    setActiveCall({ to: receiverId, conversationId: convId, type, isCaller: true, name: userInfo?.name, avatar: userInfo?.avatar, isGroup: false });
    setCallState('outgoing');

    const pc = initPeerConnection(receiverId, convId);
    if (!pc) {
      resetCallState({ avoidLogging: true });
      return;
    }
    fetchParticipantProfile(receiverId);
    try {
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);
      socketService.emit('call:request', { to: receiverId, offer: { type: offer.type, sdp: offer.sdp }, type, conversationId: convId });
    } catch (error) {
      resetCallState({ avoidLogging: true });
    }
  };

  const acceptCall = async () => {
    if (callStateRef.current !== 'incoming' || !activeCallRef.current) return;
    
    if (activeCallRef.current.isGroup) {
       joinGroupCall(activeCallRef.current.conversationId, activeCallRef.current.type);
       return;
    }

    setCallState('connected');
    connectedAtRef.current = Date.now();
    
    const callData = activeCallRef.current;
    const stream = await getMediaStream(callData.type);
    if (!stream) { rejectCall(); return; }

    const pc = initPeerConnection(callData.from, callData.conversationId);
    if (!pc) {
      rejectCall();
      return;
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
      while (remoteIceCandidatesQueue.current.length > 0) {
        await pc.addIceCandidate(new RTCIceCandidate(remoteIceCandidatesQueue.current.shift()));
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.emit('call:answer', { to: callData.from, answer: { type: answer.type, sdp: answer.sdp }, conversationId: callData.conversationId });
    } catch (error) { resetCallState(); }
  };

  const rejectCall = () => {
    const active = activeCallRef.current;
    if (active && !active.isGroup && callStateRef.current === 'incoming') {
      socketService.emit('call:reject', { to: active.from, conversationId: active.conversationId });
    }
    resetCallState();
  };

  const endCall = async () => {
    const active = activeCallRef.current;
    const durationMs = connectedAtRef.current ? Date.now() - connectedAtRef.current : 0;
    
    if (active && !active.isGroup) {
      const to = active.isCaller ? active.to : active.from;
      if (to) socketService.emit('call:reject', { to, conversationId: active.conversationId });
    } else if (active && active.isGroup) {
      const convId = active.conversationId;
      socketService.emit('group-call:leave', { conversationId: convId, fromUserId: currentUser?.id });
      
      // Clear local ongoing call indicator
      setOngoingGroupCalls(prev => {
        const n = {...prev};
        delete n[convId];
        return n;
      });

      // If we were the ones who started it or it's a significant call, send end log
      if (active.isCaller || durationMs > 2000) {
        const minutes = Math.floor(durationMs / 60000);
        const seconds = Math.floor((durationMs % 60000) / 1000);
        const durationStr = `(${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')})`;
        try {
          await messageAPI.sendMessage(convId, {
            content: `Cuộc gọi nhóm kết thúc ${durationStr}`
          });
        } catch(e) {
          console.error("Failed to send call end message:", e);
        }
      }
    }
    resetCallState();
  };

  const fetchParticipantProfile = async (userId: string) => {
    if (!userId || participants[userId]) return;
    try {
      const res = await friendshipAPI.getUserById(userId);
      const user = normalizeUser(res?.data?.data || res?.data?.user || res?.data || res);
      if (user && user.name !== 'Unknown User') {
        setParticipants(p => ({ ...p, [userId]: { name: user.name, avatar: user.avatar } }));
        return;
      }
    } catch(e) {}
    
    try {
      const res2 = await userAPI.getUserById(userId);
      const user2 = normalizeUser(res2?.data?.data || res2?.data?.user || res2?.data || res2);
      if (user2) {
        setParticipants(p => ({ ...p, [userId]: { name: user2.name, avatar: user2.avatar } }));
      }
    } catch(e) {}
  };

  const initGroupPeer = (targetUserId: string, conversationId: string) => {
    if (!targetUserId) return null;
    if (!RTCPeerConnection) {
      console.warn(`RTCPeerConnection is not available on ${Platform.OS}`);
      return null;
    }
    
    // Check if existing peer connection is still usable
    const existingPc = peerConnectionsRef.current[targetUserId];
    if (existingPc) {
      const state = existingPc.connectionState || existingPc.iceConnectionState;
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        // Destroy stale connection and recreate
        try { existingPc.close(); } catch(e) {}
        delete peerConnectionsRef.current[targetUserId];
        delete groupIceQueuesRef.current[targetUserId];
      } else {
        return existingPc;
      }
    }

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnectionsRef.current[targetUserId] = pc;
    groupIceQueuesRef.current[targetUserId] = [];
    fetchParticipantProfile(targetUserId);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track: any) => pc.addTrack(track, localStreamRef.current!));
    }

    pc.ontrack = (event: any) => {
      if (event.streams && event.streams[0]) {
        setRemoteStreams(prev => ({ ...prev, [targetUserId]: event.streams[0] }));
      }
    };

    pc.onicecandidate = (event: any) => {
      if (event.candidate) {
        socketService.emit('group-call:signal', {
           targetUserId,
           conversationId,
           fromUserId: currentUser?.id,
           payload: { type: 'ice-candidate', candidate: event.candidate }
        });
      }
    };
    return pc;
  };

  const startGroupCall = async (conversationId: string, type: 'video' | 'audio', groupName: string) => {
    if (callStateRef.current !== 'idle') return;
    const stream = await getMediaStream(type);
    if (!stream) return;

    const newActiveCall = { conversationId, type, isCaller: true, name: groupName, isGroup: true };
    setActiveCall(newActiveCall);
    activeCallRef.current = newActiveCall; 

    setCallState('group-connected');
    callStateRef.current = 'group-connected';
    connectedAtRef.current = Date.now();
    
    socketService.emit('group-call:ring', { conversationId, type, fromUserId: currentUser?.id });
    socketService.emit('group-call:join', { conversationId, fromUserId: currentUser?.id });

    // Fetch all members to pre-populate participants
    try {
      const cRes = await conversationAPI.getConversationById(conversationId);
      const conv = cRes?.data?.conversation || cRes?.conversation || cRes?.data || cRes;
      if (conv && Array.isArray(conv.members)) {
        const newParts: any = {};
        conv.members.forEach((m: any) => {
          const u = normalizeUser(m.user || m);
          if (u.id) newParts[u.id] = { name: u.name, avatar: u.avatar };
        });
        setParticipants(prev => ({ ...prev, ...newParts }));
      }
    } catch(e) {}

    // Send chat notification
    try {
      await messageAPI.sendMessage(conversationId, {
        content: `[GROUP_CALL:STARTED]`
      });
    } catch(e) {}
  };

  const joinGroupCall = async (conversationId: string, type: 'video' | 'audio' = 'audio') => {
    if (callStateRef.current !== 'idle' && callStateRef.current !== 'incoming') {
       resetCallState({ avoidLogging: true });
    }
    
    const stream = await getMediaStream(type); 
    if (!stream) return;

    const newActiveCall = { conversationId, type, isCaller: false, name: 'Group Call', isGroup: true };
    setActiveCall(newActiveCall);
    activeCallRef.current = newActiveCall; 
    
    setCallState('group-connected');
    callStateRef.current = 'group-connected';
    connectedAtRef.current = Date.now();
    
    socketService.emit('group-call:join', { conversationId, fromUserId: currentUser?.id });

    // Fetch all members to pre-populate participants
    try {
      const cRes = await conversationAPI.getConversationById(conversationId);
      const conv = cRes?.data?.conversation || cRes?.conversation || cRes?.data || cRes;
      if (conv && Array.isArray(conv.members)) {
        const newParts: any = {};
        conv.members.forEach((m: any) => {
          const u = normalizeUser(m.user || m);
          if (u.id) newParts[u.id] = { name: u.name, avatar: u.avatar };
        });
        setParticipants(prev => ({ ...prev, ...newParts }));
      }
    } catch(e) {}
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getAudioTracks();
      if (tracks.length > 0) {
        tracks[0].enabled = !tracks[0].enabled;
        setIsMicMuted(!tracks[0].enabled);
      }
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getVideoTracks();
      if (tracks.length > 0) {
        tracks[0].enabled = !tracks[0].enabled;
        const newCameraOff = !tracks[0].enabled;
        setIsCameraOff(newCameraOff);
        
        // Signal camera state to other participants
        const active = activeCallRef.current;
        if (active?.conversationId) {
          socketService.emit('group-call:camera-state', {
            conversationId: active.conversationId,
            fromUserId: currentUser?.id,
            cameraOff: newCameraOff
          });
        }
      }
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    
    const offs = [
      socketService.on('call:incoming', (payload: any) => {
        if (callStateRef.current !== 'idle') {
           socketService.emit('call:reject', { to: payload.from, conversationId: payload.conversationId });
           return;
        }
        remoteIceCandidatesQueue.current = [];
        const initialAvatar = payload.caller?.avatar || payload.userInfo?.avatar || payload.callerAvatar || null;
        const initialName = payload.caller?.name || payload.userInfo?.name || payload.callerName || null;
        
        setActiveCall({ 
          from: payload.from, 
          offer: payload.offer, 
          type: payload.type, 
          conversationId: payload.conversationId, 
          isCaller: false, 
          isGroup: false,
          name: initialName,
          avatar: initialAvatar
        });
        setCallState('incoming');
        fetchParticipantProfile(payload.from);

        // Try multiple APIs to resolve caller name
        const resolveCallerInfo = async () => {
          try {
            // Try friendshipAPI first
            const res = await friendshipAPI.getUserById(payload.from);
            const rawUser = res?.data?.data || res?.data?.user || res?.user || res?.data || res;
            const user = normalizeUser(rawUser);
            if (user && user.name && user.name !== 'Unknown User') {
              setActiveCall((prev: any) => prev && prev.from === payload.from ? { ...prev, name: user.name, avatar: user.avatar || prev.avatar } : prev);
              return;
            }
          } catch(e) {}

          try {
            // Try userAPI
            const res2 = await userAPI.getUserById(payload.from);
            const rawUser2 = res2?.data?.data || res2?.data?.user || res2?.user || res2?.data || res2;
            const user2 = normalizeUser(rawUser2);
            if (user2 && user2.name && user2.name !== 'Unknown User') {
              setActiveCall((prev: any) => prev && prev.from === payload.from ? { ...prev, name: user2.name, avatar: user2.avatar || prev.avatar } : prev);
              return;
            }
          } catch(e) {}

          // Fallback: conversation members
          if (payload.conversationId) {
            try {
              const cRes = await conversationAPI.getConversationById(payload.conversationId);
              const conv = cRes?.data?.conversation || cRes?.conversation || cRes?.data || cRes;
              if (conv && Array.isArray(conv.members)) {
                const callerMember = conv.members.find((m: any) => 
                  m?.user?.uuid === payload.from || m?.user?.id === payload.from || 
                  m?.user_id === payload.from || String(m?.id) === String(payload.from)
                );
                if (callerMember) {
                  const callerUser = normalizeUser(callerMember.user || callerMember);
                  if (callerUser.name !== 'Unknown User') {
                    setActiveCall((prev: any) => prev && prev.from === payload.from ? { ...prev, name: callerUser.name, avatar: callerUser.avatar || prev.avatar } : prev);
                  }
                }
              }
            } catch(e) {}
          }
        };
        resolveCallerInfo();
      }),
      socketService.on('call:accepted', async (payload: any) => {
        const pc = peerConnectionRef.current;
        if (callStateRef.current === 'outgoing' && pc) {
          try {
             await pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
             setCallState('connected');
             connectedAtRef.current = Date.now();
             while(remoteIceCandidatesQueue.current.length > 0) {
               await pc.addIceCandidate(new RTCIceCandidate(remoteIceCandidatesQueue.current.shift()));
             }
          } catch(e) {}
        }
      }),
      socketService.on('call:ice-candidate', async (payload: any) => {
        if (!payload.candidate) return;
        const pc = peerConnectionRef.current;
        if (pc && pc.remoteDescription && pc.remoteDescription.type) {
           pc.addIceCandidate(new RTCIceCandidate(payload.candidate)).catch(console.error);
        } else {
           remoteIceCandidatesQueue.current.push(payload.candidate);
        }
      }),
      socketService.on('call:reject', resetCallState),

      socketService.on('group-call:ring', (payload: any) => {
         if (payload.fromUserId === currentUser?.id || callStateRef.current !== 'idle') return;
         
         const groupName = payload.groupName || payload.name || 'Group Call';
         setActiveCall({ 
            conversationId: payload.conversationId, 
            type: payload.type, 
            isCaller: false, 
            isGroup: true,
            name: groupName,
            from: payload.fromUserId
         });
         setCallState('incoming');
         setOngoingGroupCalls(prev => ({
            ...prev,
            [payload.conversationId]: {
               type: payload.type,
               name: groupName,
               startedBy: payload.fromUserId
            }
         }));
         
         // Fetch caller info for avatar + fetch conversation name
         const resolveGroupInfo = async () => {
           // Get caller avatar/name
           if (payload.fromUserId) {
             try {
               const res = await friendshipAPI.getUserById(payload.fromUserId);
               const user = normalizeUser(res?.data?.data || res?.data?.user || res?.data || res);
               if (user && user.name !== 'Unknown User') {
                 setActiveCall((prev: any) => prev && prev.isGroup ? { ...prev, avatar: user.avatar, callerName: user.name } : prev);
               }
             } catch(e) {
               try {
                 const res2 = await userAPI.getUserById(payload.fromUserId);
                 const user2 = normalizeUser(res2?.data?.data || res2?.data?.user || res2?.data || res2);
                 if (user2) setActiveCall((prev: any) => prev && prev.isGroup ? { ...prev, avatar: user2.avatar, callerName: user2.name } : prev);
               } catch(e2) {}
             }
           }
           // Get conversation/group name
           if (payload.conversationId && groupName === 'Group Call') {
             try {
               const cRes = await conversationAPI.getConversationById(payload.conversationId);
               const conv = cRes?.data?.conversation || cRes?.conversation || cRes?.data || cRes;
               if (conv?.name) {
                 setActiveCall((prev: any) => prev && prev.isGroup ? { ...prev, name: conv.name } : prev);
               }
             } catch(e) {}
           }
         };
         resolveGroupInfo();
      }),
      socketService.on('group-call:join', async (payload: any) => {
         const { conversationId, fromUserId } = payload;
         if (!fromUserId) return;

         // Track ongoing call regardless of our state
         setOngoingGroupCalls(prev => ({
            ...prev,
            [conversationId]: {
               ...prev[conversationId],
               active: true
            }
         }));

         if (callStateRef.current !== 'group-connected' || activeCallRef.current?.conversationId !== conversationId) return;
         if (fromUserId === currentUser?.id) return;
         
         const pc = initGroupPeer(fromUserId, conversationId);
         if (!pc) return;
         
         // Guard: only create offer if stable
         if (pc.signalingState !== 'stable') {
            console.warn(`Signaling state for ${fromUserId} is ${pc.signalingState}, skipping offer`);
            return;
         }

         try {
           const offer = await pc.createOffer({});
           await pc.setLocalDescription(offer);
           socketService.emit('group-call:signal', {
              targetUserId: fromUserId,
              conversationId,
              fromUserId: currentUser?.id,
              payload: { type: 'offer', sdp: offer.sdp }
           });
         } catch(e: any) { 
           console.warn("Mesh Offer Error, recreating peer:", e?.message);
           // Destroy stale peer and retry once
           try { pc.close(); } catch(ce) {}
           delete peerConnectionsRef.current[fromUserId];
           delete groupIceQueuesRef.current[fromUserId];
           const newPc = initGroupPeer(fromUserId, conversationId);
           if (newPc && newPc.signalingState === 'stable') {
             try {
               const retryOffer = await newPc.createOffer({});
               await newPc.setLocalDescription(retryOffer);
               socketService.emit('group-call:signal', {
                 targetUserId: fromUserId,
                 conversationId,
                 fromUserId: currentUser?.id,
                 payload: { type: 'offer', sdp: retryOffer.sdp }
               });
             } catch(re) { console.error("Mesh Offer Retry Failed", re); }
           }
         }
      }),
      socketService.on('group-call:signal', async (payload: any) => {
         const targetUserId = payload.targetUserId || payload.to;
         if (!targetUserId || targetUserId !== currentUser?.id) return; 
         
         const { fromUserId, conversationId, payload: signal } = payload;
         if (!fromUserId) return;
         if (callStateRef.current !== 'group-connected' || activeCallRef.current?.conversationId !== conversationId) return;

         const pc = initGroupPeer(fromUserId, conversationId);
         if (!pc) return;

         try {
           if (signal.type === 'offer') {
             // Guard: only set remote offer if in correct state
             if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
               console.warn(`Skipping offer for ${fromUserId}: signalingState=${pc.signalingState}`);
               return;
             }
             // If we already sent an offer (glare), use tiebreaker
             if (pc.signalingState === 'have-local-offer') {
               const iAmPolite = (currentUser?.id || '') < fromUserId;
               if (!iAmPolite) {
                 console.warn(`Glare detected for ${fromUserId}: ignoring offer (I am impolite)`);
                 return;
               }
               // Polite: rollback and accept their offer
               await pc.setLocalDescription({ type: 'rollback' });
             }
             
             await pc.setRemoteDescription(new RTCSessionDescription(signal));
             const answer = await pc.createAnswer();
             await pc.setLocalDescription(answer);
             socketService.emit('group-call:signal', {
               targetUserId: fromUserId,
               conversationId,
               fromUserId: currentUser?.id,
               payload: { type: 'answer', sdp: answer.sdp }
             });
             let queue = groupIceQueuesRef.current[fromUserId] || [];
             while(queue.length > 0) {
               try { await pc.addIceCandidate(new RTCIceCandidate(queue.shift())); } catch(e) {}
             }
           } else if (signal.type === 'answer') {
             // Guard: only set answer if we're expecting one
             if (pc.signalingState !== 'have-local-offer') {
               console.warn(`Skipping answer from ${fromUserId}: signalingState=${pc.signalingState}`);
               return;
             }
             await pc.setRemoteDescription(new RTCSessionDescription(signal));
             let queue = groupIceQueuesRef.current[fromUserId] || [];
             while(queue.length > 0) {
               try { await pc.addIceCandidate(new RTCIceCandidate(queue.shift())); } catch(e) {}
             }
           } else if (signal.type === 'ice-candidate') {
             if (pc.remoteDescription && pc.remoteDescription.type) {
                try { await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)); } catch(e) {}
             } else {
                groupIceQueuesRef.current[fromUserId] = groupIceQueuesRef.current[fromUserId] || [];
                groupIceQueuesRef.current[fromUserId].push(signal.candidate);
             }
           }
         } catch(e) { console.error("Signal specific error", e); }
      }),
      socketService.on('group-call:leave', (payload: any) => {
         const { fromUserId } = payload;
         if (!fromUserId) return;
         
         if (callStateRef.current === 'incoming' && activeCallRef.current?.from === fromUserId) {
             resetCallState();
             return;
         }

         if (peerConnectionsRef.current[fromUserId]) {
           peerConnectionsRef.current[fromUserId].close();
           delete peerConnectionsRef.current[fromUserId];
           setRemoteStreams(prev => { const n = {...prev}; delete n[fromUserId]; return n; });
           setParticipants(prev => { const n = {...prev}; delete n[fromUserId]; return n; });
           
           if (Object.keys(peerConnectionsRef.current).length === 0 && callStateRef.current === 'group-connected') {
               endCall();
           }
         }
      }),
      socketService.on('group-call:camera-state', (payload: any) => {
         const { fromUserId, cameraOff } = payload;
         if (!fromUserId || fromUserId === currentUser?.id) return;
         setParticipantCameraOff(prev => ({ ...prev, [fromUserId]: !!cameraOff }));
      })
    ];
    return () => offs.forEach(off => off?.());
  }, [currentUser?.id]);

  return (
    <CallContext.Provider value={{
      callState, activeCall, localStream, remoteStream, remoteStreams, participants,
      isMicMuted, isCameraOff, participantCameraOff,
      startCall, acceptCall, rejectCall, endCall,
      startGroupCall, joinGroupCall,
      toggleMic, toggleCamera,
      ongoingGroupCalls
    }}>
      {children}
    </CallContext.Provider>
  );
};
