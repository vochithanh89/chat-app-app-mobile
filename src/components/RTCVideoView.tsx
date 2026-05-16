import React from "react";

type Props = {
  stream?: any;
  streamURL?: string;
  style?: any;
  objectFit?: "cover" | "contain";
  muted?: boolean;
  zOrder?: number;
};

const RTCVideoView = ({ stream: _stream, streamURL: _streamURL, style }: Props) => {
  return <div style={style as React.CSSProperties} />;
};

export default RTCVideoView;
