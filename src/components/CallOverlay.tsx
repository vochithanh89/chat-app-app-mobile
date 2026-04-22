import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Modal, Dimensions } from 'react-native';
import { RTCView } from 'react-native-webrtc';
import { useCall } from '../contexts/CallContext';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const CallOverlay = () => {
  const {
    callState, activeCall, localStream, remoteStream, remoteStreams, participants,
    isMicMuted, isCameraOff,
    acceptCall, rejectCall, endCall,
    toggleMic, toggleCamera
  } = useCall();

  if (callState === 'idle') return null;

  const isIncoming = callState === 'incoming';
  const isOutgoing = callState === 'outgoing';
  const isConnected = callState === 'connected' || callState === 'group-connected';
  const isVideo = activeCall?.type === 'video';

  const avatar = activeCall?.avatar || 'https://via.placeholder.com/150';
  const name = activeCall?.name || 'Unknown User';

  const renderGroupGrid = () => {
    const streamKeys = Object.keys(remoteStreams);
    if (streamKeys.length === 0) {
      return <Text style={styles.waitingText}>Waiting for others to join...</Text>;
    }
    
    return (
      <View style={styles.gridContainer}>
        {streamKeys.map(key => {
          const stream = remoteStreams[key];
          const part = participants[key] || { name: 'Unknown' };
          return (
            <View key={key} style={styles.gridItem}>
              {stream && stream.toURL() ? (
                <RTCView
                  streamURL={stream.toURL()}
                  style={styles.gridVideo}
                  objectFit="cover"
                />
              ) : (
                <View style={styles.gridFallback}>
                  <Text style={styles.gridFallbackText}>{part.name[0]}</Text>
                </View>
              )}
              <Text style={styles.gridName}>{part.name}</Text>
            </View>
          );
        })}
      </View>
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
            
            {/* Background / Main Video */}
            {activeCall.isGroup ? (
               renderGroupGrid()
            ) : (
              isVideo && remoteStream && remoteStream.toURL() ? (
                <RTCView
                  streamURL={remoteStream.toURL()}
                  style={styles.remoteVideo}
                  objectFit="cover"
                />
              ) : (
                <View style={styles.audioFallback}>
                  <Image source={{ uri: avatar }} style={styles.avatarAudio} />
                  <Text style={styles.nameTextAudio}>{name}</Text>
                  <Text style={styles.timeText}>00:00</Text>
                </View>
              )
            )}

            {/* PIP Local Video */}
            {isVideo && localStream && localStream.toURL() && !isCameraOff && (
              <View style={styles.localVideoContainer}>
                <RTCView
                  streamURL={localStream.toURL()}
                  style={styles.localVideo}
                  objectFit="cover"
                  zOrder={1}
                />
              </View>
            )}

            {/* Controls */}
            <View style={styles.controlsContainer}>
              <TouchableOpacity style={[styles.controlBtn, isMicMuted && styles.controlBtnMuted]} onPress={toggleMic}>
                <Ionicons name={isMicMuted ? "mic-off" : "mic"} size={24} color="#fff" />
              </TouchableOpacity>
              {isVideo && (
                <TouchableOpacity style={[styles.controlBtn, isCameraOff && styles.controlBtnMuted]} onPress={toggleCamera}>
                  <Ionicons name={isCameraOff ? "videocam-off" : "videocam"} size={24} color="#fff" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.controlBtn, { backgroundColor: '#FF3B30' }]} onPress={endCall}>
                <Ionicons name="call" size={24} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
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
  },
  nameText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
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
    top: 50,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
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
    gap: 30,
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
  waitingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: height / 2,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    paddingTop: 50,
  },
  gridItem: {
    width: width / 2 - 20,
    height: height / 3,
    margin: 5,
    borderRadius: 10,
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
    backgroundColor: '#555',
  },
  gridFallbackText: {
    fontSize: 40,
    color: '#fff',
  },
  gridName: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 5,
    fontSize: 12,
  }
});

export default CallOverlay;
