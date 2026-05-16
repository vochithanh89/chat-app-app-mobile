import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Dimensions, ScrollView } from 'react-native';
import RTCVideoView from './RTCVideoView';
import { useCall } from '../contexts/CallContext';
import { useAuth } from '../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { formatImageUrl } from '../services/chatMappers';

const { width, height } = Dimensions.get('window');

const CallOverlay = () => {
  const {
    callState, activeCall, localStream, remoteStream, remoteStreams, participants,
    isMicMuted, isCameraOff, participantCameraOff,
    acceptCall, rejectCall, endCall,
    toggleMic, toggleCamera
  } = useCall();
  const { user: currentUser } = useAuth();
  const myAvatar = formatImageUrl(currentUser?.avatarUrl || currentUser?.avatar_url || currentUser?.avatar);

  // Call timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (callState !== 'connected' && callState !== 'group-connected') { setElapsed(0); return; }
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [callState]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const getStreamURL = (stream: any) => {
    if (!stream) return "";
    return typeof stream.toURL === "function" ? stream.toURL() : stream.id || "";
  };

  if (callState === 'idle') return null;

  const isIncoming = callState === 'incoming';
  const isOutgoing = callState === 'outgoing';
  const isConnected = callState === 'connected' || callState === 'group-connected';
  const isVideo = activeCall?.type === 'video';

  const avatar = activeCall?.avatar || 'https://via.placeholder.com/150';
  const name = activeCall?.name || 'Unknown User';
  const callerName = activeCall?.callerName; // For group calls

  // Calculate adaptive grid layout
  const getGridLayout = (count: number) => {
    if (count <= 1) return { cols: 1, itemWidth: width - 20, itemHeight: height * 0.6 };
    if (count === 2) return { cols: 1, itemWidth: width - 20, itemHeight: (height - 200) / 2 };
    if (count <= 4) return { cols: 2, itemWidth: (width - 30) / 2, itemHeight: (height - 200) / 2 };
    if (count <= 6) return { cols: 2, itemWidth: (width - 30) / 2, itemHeight: (height - 200) / 3 };
    return { cols: 3, itemWidth: (width - 40) / 3, itemHeight: (height - 200) / 3 };
  };

  const renderGroupGrid = () => {
    const streamKeys = Object.keys(remoteStreams);
    const totalParticipants = streamKeys.length;

    if (totalParticipants === 0) {
      return (
        <View style={styles.waitingContainer}>
          <Ionicons name="people-outline" size={60} color="#666" />
          <Text style={styles.waitingText}>Waiting for others to join...</Text>
          <Text style={styles.waitingSubText}>{name}</Text>
        </View>
      );
    }

    const layout = getGridLayout(totalParticipants);

    return (
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {streamKeys.map(key => {
          const stream = remoteStreams[key];
          const part = participants[key] || { name: 'User' };
          // Use signaled camera state (reliable) instead of track checks (unreliable for remote)
          const remoteCamOff = participantCameraOff[key] === true;
          const showVideo = isVideo && !remoteCamOff && stream && getStreamURL(stream);
          
          return (
            <View key={key} style={[styles.gridItem, { width: layout.itemWidth, height: layout.itemHeight }]}>
              {showVideo ? (
                <RTCVideoView
                  stream={stream}
                  streamURL={getStreamURL(stream)}
                  style={styles.gridVideo}
                  objectFit="cover"
                />
              ) : (
                <View style={styles.gridFallback}>
                  {part.avatar ? (
                    <Image source={{ uri: part.avatar }} style={styles.gridAvatarImage} />
                  ) : (
                    <View style={styles.gridAvatarCircle}>
                      <Text style={styles.gridFallbackText}>{(part.name || '?')[0]?.toUpperCase()}</Text>
                    </View>
                  )}
                  {isVideo && remoteCamOff && (
                    <View style={styles.cameraOffBadge}>
                      <Ionicons name="videocam-off" size={14} color="#fff" />
                    </View>
                  )}
                </View>
              )}
              <View style={styles.gridNameBadge}>
                <Text style={styles.gridName} numberOfLines={1}>{part.name && part.name !== 'Người dùng' ? part.name : (totalParticipants === 1 ? name : 'User')}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.container}>
        
        {/* INCOMING / OUTGOING UI */}
        {(isIncoming || isOutgoing) && (
          <View style={styles.ringingContainer}>
            <Image source={{ uri: avatar }} style={styles.avatarRinging} />
            <Text style={styles.nameText}>{name}</Text>
            {callerName && activeCall?.isGroup && (
              <Text style={styles.callerSubText}>from {callerName}</Text>
            )}
            <Text style={styles.statusText}>{isIncoming ? 'Incoming call...' : 'Ringing...'}</Text>
            
            <View style={styles.actionRow}>
              {isIncoming && (
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#4CD964' }]} onPress={acceptCall}>
                  <Ionicons name="call" size={30} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF3B30' }]} onPress={isIncoming ? rejectCall : endCall}>
                <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* CONNECTED UI */}
        {isConnected && (
          <View style={styles.connectedContainer}>
            
            {/* Header with name & timer */}
            <View style={styles.callHeader}>
              <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
              <Text style={styles.headerTimer}>{formatTime(elapsed)}</Text>
            </View>

            {/* Background / Main Video */}
            {activeCall?.isGroup ? (
               renderGroupGrid()
            ) : (() => {
              const otherKey = activeCall?.from || activeCall?.to;
              const otherPart = participants[otherKey] || {};
              const otherName = otherPart.name || name;
              const otherAvatar = otherPart.avatar || avatar;
              // Use signaled camera state for remote participant
              const remoteCamOff = otherKey ? participantCameraOff[otherKey] === true : false;
              const remoteHasVideo = isVideo && !remoteCamOff && remoteStream && getStreamURL(remoteStream);
              
              return remoteHasVideo ? (
                <View style={{ flex: 1 }}>
                  <RTCVideoView
                    stream={remoteStream}
                    streamURL={getStreamURL(remoteStream)}
                    style={styles.remoteVideo}
                    objectFit="cover"
                  />
                  <View style={styles.gridNameBadge}>
                    <Text style={styles.gridName} numberOfLines={1}>{otherName}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.audioFallback}>
                  <Image source={{ uri: otherAvatar }} style={styles.avatarAudio} />
                  <Text style={styles.nameTextAudio}>{otherName}</Text>
                  <Text style={styles.timeText}>{formatTime(elapsed)}</Text>
                  {isVideo && (
                    <View style={styles.cameraOffLabel}>
                      <Ionicons name="videocam-off" size={16} color="#999" />
                      <Text style={{ color: '#999', marginLeft: 6, fontSize: 13 }}>Camera đã tắt</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* PIP Local Video */}
            {isVideo && (
              <View style={styles.localVideoContainer}>
                {!isCameraOff && localStream && getStreamURL(localStream) ? (
                  <RTCVideoView
                    stream={localStream}
                    streamURL={getStreamURL(localStream)}
                    style={styles.localVideo}
                    objectFit="cover"
                    zOrder={1}
                  />
                ) : (
                  <View style={styles.localCameraOff}>
                    <Image source={{ uri: myAvatar }} style={styles.localCameraOffAvatar} />
                    <View style={styles.localCameraOffIcon}>
                      <Ionicons name="videocam-off" size={12} color="#fff" />
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Controls */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity style={[styles.controlBtn, isMicMuted && styles.controlBtnMuted]} onPress={toggleMic}>
                <Ionicons name={isMicMuted ? "mic-off" : "mic"} size={24} color="#fff" />
                <Text style={styles.controlLabel}>{isMicMuted ? 'Unmute' : 'Mute'}</Text>
              </TouchableOpacity>
              {isVideo && (
                <TouchableOpacity style={[styles.controlBtn, isCameraOff && styles.controlBtnMuted]} onPress={toggleCamera}>
                  <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={24} color="#fff" />
                  <Text style={styles.controlLabel}>{isCameraOff ? 'Camera On' : 'Camera Off'}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#FF3B30' }]} onPress={endCall}>
                <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
                <Text style={styles.controlLabel}>End</Text>
              </TouchableOpacity>
            </View>

          </View>
        )}

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  ringingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRinging: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  nameText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  callerSubText: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 18,
    color: '#aaa',
    marginBottom: 50,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 20,
  },
  actionBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectedContainer: {
    flex: 1,
  },
  callHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
  headerName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerTimer: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 2,
  },
  remoteVideo: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  audioFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarAudio: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  nameTextAudio: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  timeText: {
    fontSize: 16,
    color: '#aaa',
    marginTop: 10,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 90,
    right: 15,
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  localVideo: {
    flex: 1,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 25,
    paddingHorizontal: 20,
  },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnMuted: {
    backgroundColor: '#FF3B30',
  },
  controlLabel: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: '#999',
    fontSize: 16,
    marginTop: 15,
  },
  waitingSubText: {
    color: '#666',
    fontSize: 14,
    marginTop: 5,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 90,
    paddingBottom: 120,
    paddingHorizontal: 5,
  },
  gridItem: {
    margin: 5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  gridVideo: {
    flex: 1,
  },
  gridFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#444',
  },
  gridAvatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  gridFallbackText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
  gridNameBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  gridName: {
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '500',
    alignSelf: 'flex-start',
  },
  cameraOffBadge: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cameraOffLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  localCameraOff: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#333',
  },
  localCameraOffAvatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  localCameraOffIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(255,59,48,0.8)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CallOverlay;
