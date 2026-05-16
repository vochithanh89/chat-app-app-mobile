import React from "react";
import { RTCView } from "react-native-webrtc";

type Props = {
  stream?: any;
  streamURL?: string;
  style?: any;
  objectFit?: "cover" | "contain";
  zOrder?: number;
};

const RTCVideoView = ({ stream: _stream, ...props }: Props) => <RTCView {...props} />;

export default RTCVideoView;
