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
  variant?: "primary" | "secondary" | "icon";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  textColor?: string;
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
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-blue-500";
      case "secondary":
        return "bg-gray-200";
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
        return "text-gray-800 font-medium";
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

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`
        rounded-lg items-center justify-center flex-row
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${disabled || loading ? "opacity-50" : ""}
        ${className}
      `}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={getIconSize()}
              color={variant === "primary" ? "#ffffff" : "#0068FF"}
              className={title ? "mr-2" : ""}
            />
          )}
          {title && (
            <Text className={`${getTextStyles()} ${icon ? "ml-2" : ""}`}>
              {title}
            </Text>
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

export default ButtonComponent;
