import React from "react";
import {
  Image,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface AvatarProps {
  source?: { uri: string } | number;
  size?: "small" | "medium" | "large" | "xlarge";
  name?: string;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  showStoryBorder?: boolean;
  onPress?: () => void;
  className?: string;
}

const AvatarComponent: React.FC<AvatarProps> = ({
  source,
  size = "medium",
  name,
  showOnlineStatus = false,
  isOnline = false,
  showStoryBorder = false,
  onPress,
  className = "",
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return "w-8 h-8";
      case "medium":
        return "w-12 h-12";
      case "large":
        return "w-16 h-16";
      case "xlarge":
        return "w-20 h-20";
      default:
        return "w-12 h-12";
    }
  };

  const getInnerSizeStyles = () => {
    switch (size) {
      case "small":
        return "w-8 h-8";
      case "medium":
        return "w-12 h-12";
      case "large":
        return "w-16 h-16";
      case "xlarge":
        return "w-20 h-20";
      default:
        return "w-12 h-12";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    const names = name.split(" ");
    return names.length > 1 
      ? names[0][0] + names[names.length - 1][0]
      : names[0][0];
  };

  const renderAvatar = () => {
    if (source) {
      return (
        <Image
          source={source}
          className={`${getInnerSizeStyles()} rounded-full`}
        />
      );
    }

    return (
      <View className={`
        ${getInnerSizeStyles()} rounded-full bg-gray-300 
        items-center justify-center
      `}>
        <Text className="text-gray-600 font-semibold">
          {getInitials(name)}
        </Text>
      </View>
    );
  };

  const Avatar = (
    <View className={`relative ${className}`}>
      {showStoryBorder && (
        <View className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 p-0.5">
          <View className="w-full h-full rounded-full bg-white" />
        </View>
      )}
      
      <TouchableOpacity 
        onPress={onPress}
        disabled={!onPress}
        className={`
          ${showStoryBorder ? "absolute inset-0.5" : "relative"}
          ${onPress ? "active:opacity-80" : ""}
        `}
      >
        {renderAvatar()}
      </TouchableOpacity>

      {showOnlineStatus && (
        <View className={`
          absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white
          ${isOnline ? "bg-green-500" : "bg-gray-400"}
        `} />
      )}
    </View>
  );

  return Avatar;
};

export default AvatarComponent;
