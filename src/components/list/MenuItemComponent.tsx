import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
  className?: string;
}

const MenuItemComponent: React.FC<MenuItemProps> = ({
  icon,
  title,
  onPress,
  showArrow = true,
  rightComponent,
  className = "",
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center justify-between bg-white p-4 border-b border-gray-100 ${className}`}
    >
      <View className="flex-row items-center flex-1">
        <Ionicons 
          name={icon} 
          size={20} 
          color="#0068FF" 
        />
        <Text className="ml-3 text-gray-800 text-base flex-1">
          {title}
        </Text>
      </View>
      
      <View className="flex-row items-center">
        {rightComponent}
        {showArrow && !rightComponent && (
          <Text className="text-gray-400">{'>'}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default MenuItemComponent;
