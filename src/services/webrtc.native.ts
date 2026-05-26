declare const require: any;

type WebRTCModule = {
  RTCPeerConnection?: any;
  RTCIceCandidate?: any;
  RTCSessionDescription?: any;
  mediaDevices?: any;
};

const loadWebRTC = (): WebRTCModule => {
  try {
    return require("react-native-webrtc");
  } catch (error: any) {
    console.warn(
      "react-native-webrtc native module is not available. Use a custom Expo dev build to enable calls.",
      error?.message ?? error,
    );
    return {};
  }
};

const webRTC = loadWebRTC();

export const RTCPeerConnection = webRTC.RTCPeerConnection;
export const RTCIceCandidate = webRTC.RTCIceCandidate;
export const RTCSessionDescription = webRTC.RTCSessionDescription;
export const mediaDevices = webRTC.mediaDevices;

export type MediaStream = any;
