import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";

type Props = {
  stream?: any;
  streamURL?: string;
  style?: any;
  objectFit?: "cover" | "contain";
  muted?: boolean;
  zOrder?: number;
};

const streamRegistry = new Map<string, any>();

export const registerWebRTCStream = (stream?: any) => {
  if (!stream) return "";
  const id = stream.id || `${Date.now()}`;
  streamRegistry.set(id, stream);
  return id;
};

const RTCVideoView = ({ stream, streamURL, style, objectFit = "cover", muted = true }: Props) => {
  const videoRef = useRef<any>(null);

  useEffect(() => {
    const target = videoRef.current;
    if (!target) return;

    const nextStream = stream || (streamURL ? streamRegistry.get(streamURL) : null) || null;
    target.srcObject = nextStream;
    if (nextStream) {
      target.play().catch(() => {});
    }

    return () => {
      target.srcObject = null;
    };
  }, [stream, streamURL]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      style={StyleSheet.flatten([style, { objectFit }]) as React.CSSProperties}
    />
  );
};

export default RTCVideoView;
