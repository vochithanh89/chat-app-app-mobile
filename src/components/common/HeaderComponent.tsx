import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

interface HeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  textColor?: string;
  className?: string;
}

const HeaderComponent: React.FC<HeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  rightComponent,
  backgroundColor = "#ffffff",
  textColor = "#1f2937",
  className = "",
}) => {
  return (
    <SafeAreaView>
      <View 
        className={`
          flex-row items-center justify-between p-4 border-b border-gray-100
          ${className}
        `}
        style={{ backgroundColor }}
      >
        {/* Left side - Back button */}
        <View className="flex-1">
          {showBackButton && (
            <TouchableOpacity 
              onPress={onBackPress}
              className="p-2"
            >
              <Ionicons 
                name="chevron-back" 
                size={24} 
                color={textColor === "#ffffff" ? "#ffffff" : "#0068FF"} 
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Center - Title */}
        <View className="flex-2 items-center">
          {title && (
            <Text 
              className={`text-xl font-semibold ${textColor === "#ffffff" ? "text-white" : "text-gray-900"}`}
              style={{ color: textColor }}
            >
              {title}
            </Text>
          )}
        </View>

        {/* Right side - Custom component */}
        <View className="flex-1 items-end">
          {rightComponent}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default HeaderComponent;
