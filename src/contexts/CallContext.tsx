import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { socketService } from '../services/socketService';
import { useAuth } from './AuthContext';
import { userAPI, friendshipAPI, messageAPI, conversationAPI } from '../services/api';
import { normalizeUser } from '../services/chatMappers';
import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
} from 'react-native-webrtc';

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

  const callStateRef = useRef(callState);
  const activeCallRef = useRef(activeCall);
  const connectedAtRef = useRef<number | null>(null);

  // WebRTC Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteIceCandidatesQueue = useRef<any[]>([]);
  
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
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
    setActiveCall(null);
    setCallState('idle');
    setIsMicMuted(false);
    setIsCameraOff(false);
  };

  const getMediaStream = async (type: 'video' | 'audio') => {
    try {
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

  const endCall = () => {
    const active = activeCallRef.current;
    if (active && !active.isGroup) {
      const to = active.isCaller ? active.to : active.from;
      if (to) socketService.emit('call:reject', { to, conversationId: active.conversationId });
    } else if (active && active.isGroup) {
      socketService.emit('group-call:leave', { conversationId: active.conversationId, fromUserId: currentUser?.id });
    }
    resetCallState();
  };

  const fetchParticipantProfile = async (userId: string) => {
    try {
      const res = await friendshipAPI.getUserById(userId);
      const user = normalizeUser(res?.data || res);
      if (user) {
        setParticipants(p => ({ ...p, [userId]: { name: user.name, avatar: user.avatar } }));
      }
    } catch(e) {}
  };

  const initGroupPeer = (targetUserId: string, conversationId: string) => {
    if (!targetUserId) return null;
    if (peerConnectionsRef.current[targetUserId]) return peerConnectionsRef.current[targetUserId];
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
        setIsCameraOff(!tracks[0].enabled);
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
        const initialAvatar = payload.caller?.avatar || payload.userInfo?.avatar || null;
        const initialName = payload.caller?.name || payload.userInfo?.name || null;
        
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
        friendshipAPI.getUserById(payload.from).then((res: any) => {
          const rawUser = res?.data?.data || res?.data?.user || res?.user || res?.data || res;
          const user = normalizeUser(rawUser);
          if (user && user.name !== 'Unknown User') {
            setActiveCall((prev: any) => prev && prev.from === payload.from ? { ...prev, name: user.name, avatar: user.avatar } : prev);
          } else {
            throw new Error('User not found or name is Unknown User');
          }
        }).catch((err) => {
          console.log('Falling back to conversation data for caller info', err?.message || err);
          if (payload.conversationId) {
            conversationAPI.getConversationById(payload.conversationId).then((cRes: any) => {
              const conv = cRes?.data?.conversation || cRes?.conversation || cRes?.data || cRes;
              if (conv && Array.isArray(conv.members)) {
                const callerMember = conv.members.find((m: any) => (m?.user?.uuid === payload.from || m?.user?.id === payload.from || m?.user_id === payload.from || String(m?.id) === String(payload.from)));
                if (callerMember) {
                  const callerUser = normalizeUser(callerMember.user || callerMember);
                  setActiveCall((prev: any) => prev && prev.from === payload.from ? {
                    ...prev,
                    name: callerUser.name !== 'Unknown User' ? callerUser.name : prev.name,
                    avatar: callerUser.avatar
                  } : prev);
                }
              }
            }).catch(console.error);
          }
        });
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
         
         setActiveCall({ 
            conversationId: payload.conversationId, 
            type: payload.type, 
            isCaller: false, 
            isGroup: true,
            name: 'Group Call',
            from: payload.fromUserId
         });
         setCallState('incoming');
         
         if (payload.fromUserId) {
            friendshipAPI.getUserById(payload.fromUserId).then((res: any) => {
              const user = normalizeUser(res?.data || res);
              if (user) setActiveCall((prev: any) => prev && prev.isGroup ? { ...prev, avatar: user.avatar, name: user.name } : prev);
            }).catch(() => {});
         }
      }),
      socketService.on('group-call:join', async (payload: any) => {
         const { conversationId, fromUserId } = payload;
         if (!fromUserId) return;
         if (callStateRef.current !== 'group-connected' || activeCallRef.current?.conversationId !== conversationId) return;
         if (fromUserId === currentUser?.id) return;
         
         const pc = initGroupPeer(fromUserId, conversationId);
         if (!pc) return;
         try {
           const offer = await pc.createOffer({});
           await pc.setLocalDescription(offer);
           socketService.emit('group-call:signal', {
              targetUserId: fromUserId,
              conversationId,
              fromUserId: currentUser?.id,
              payload: { type: 'offer', sdp: offer.sdp }
           });
         } catch(e) { console.error("Mesh Offer Error", e); }
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
             while(queue.length > 0) { await pc.addIceCandidate(new RTCIceCandidate(queue.shift())); }
           } else if (signal.type === 'answer') {
             await pc.setRemoteDescription(new RTCSessionDescription(signal));
             let queue = groupIceQueuesRef.current[fromUserId] || [];
             while(queue.length > 0) { await pc.addIceCandidate(new RTCIceCandidate(queue.shift())); }
           } else if (signal.type === 'ice-candidate') {
             if (pc.remoteDescription && pc.remoteDescription.type) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
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
      })
    ];
    return () => offs.forEach(off => off?.());
  }, [currentUser?.id]);

  return (
    <CallContext.Provider value={{
      callState, activeCall, localStream, remoteStream, remoteStreams, participants,
      isMicMuted, isCameraOff,
      startCall, acceptCall, rejectCall, endCall,
      startGroupCall, joinGroupCall,
      toggleMic, toggleCamera
    }}>
      {children}
    </CallContext.Provider>
  );
};
