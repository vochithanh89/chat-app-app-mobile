const browserWebRTC = globalThis as any;

export const RTCPeerConnection = browserWebRTC.RTCPeerConnection;
export const RTCIceCandidate = browserWebRTC.RTCIceCandidate;
export const RTCSessionDescription = browserWebRTC.RTCSessionDescription;
export const mediaDevices = browserWebRTC.navigator?.mediaDevices;

export type MediaStream = any;
