import React from "react";
import {
  TouchableOpacity,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ButtonProps {
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "icon";
  size?: "small" | "medium" | "large" | "full";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  textColor?: string;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
}

const ButtonComponent: React.FC<ButtonProps> = ({
  title,
  icon,
  onPress,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  className = "",
  textColor,
  iconPosition = "left",
  fullWidth = false,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-blue-500";
      case "secondary":
        return "bg-gray-400";
      case "outline":
        return "bg-transparent border border-blue-500";
      case "ghost":
        return "bg-transparent";
      case "icon":
        return "bg-transparent";
      default:
        return "bg-blue-500";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return "px-3 py-2";
      case "medium":
        return "px-4 py-3";
      case "large":
        return "px-6 py-4";
      case "full":
        return "w-full p-3";
      default:
        return "px-4 py-3";
    }
  };

  const getTextStyles = () => {
    if (textColor) {
      return textColor;
    }
    
    switch (variant) {
      case "primary":
        return "text-white font-semibold";
      case "secondary":
        return "text-white font-semibold";
      case "outline":
        return "text-blue-500 font-semibold";
      case "ghost":
        return "text-gray-700 font-medium";
      case "icon":
        return "";
      default:
        return "text-white font-semibold";
    }
  };

  const getIconSize = () => {
    switch (size) {
      case "small":
        return 16;
      case "medium":
        return 20;
      case "large":
        return 24;
      default:
        return 20;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "primary":
        return "#ffffff";
      case "secondary":
        return "#ffffff";
      case "outline":
        return "#3B82F6";
      case "ghost":
        return "#374151";
      case "icon":
        return "#374151";
      default:
        return "#ffffff";
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`
        rounded-lg items-center justify-center flex-row
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? "opacity-50" : ""}
        ${className}
      `}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <>
          {icon && iconPosition === "left" && (
            <Ionicons
              name={icon}
              size={getIconSize()}
              color={getIconColor()}
              className={title ? "mr-2" : ""}
            />
          )}
          {title && (
            <Text className={`${getTextStyles()}`}>
              {title}
            </Text>
          )}
          {icon && iconPosition === "right" && (
            <Ionicons
              name={icon}
              size={getIconSize()}
              color={getIconColor()}
              className={title ? "ml-2" : ""}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

export default ButtonComponent;
