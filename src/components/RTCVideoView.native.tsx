import React from "react";
import { View } from "react-native";

declare const require: any;

type Props = {
  stream?: any;
  streamURL?: string;
  style?: any;
  objectFit?: "cover" | "contain";
  zOrder?: number;
};

const loadRTCView = () => {
  try {
    return require("react-native-webrtc").RTCView;
  } catch {
    return null;
  }
};

const NativeRTCView = loadRTCView();

const RTCVideoView = ({ stream: _stream, streamURL: _streamURL, objectFit: _objectFit, zOrder: _zOrder, style, ...props }: Props) => {
  if (!NativeRTCView) {
    return <View style={style} />;
  }

  return <NativeRTCView streamURL={_streamURL} style={style} objectFit={_objectFit} zOrder={_zOrder} {...props} />;
};

export default RTCVideoView;
