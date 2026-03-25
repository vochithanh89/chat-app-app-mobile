import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AvatarComponent from "../common/AvatarComponent";

interface CallItemProps {
  item: {
    id: string;
    name: string;
    avatar: string;
    time: string;
    date: string;
    type: "incoming" | "outgoing";
    duration: string;
    missed: boolean;
  };
  onPress?: () => void;
  className?: string;
}

const CallItemComponent: React.FC<CallItemProps> = ({
  item,
  onPress,
  className = "",
}) => {
  return (
    <TouchableOpacity 
      className={`flex-row items-center p-4 bg-white border-b border-gray-50 ${className}`}
      onPress={onPress}
    >
      <View className="relative mr-3">
        <AvatarComponent
          source={{ uri: item.avatar }}
          size="medium"
        />
      </View>
      
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="font-semibold text-base text-gray-900 flex-1">
            {item.name}
          </Text>
          <Text className="text-xs text-gray-500">
            {item.time}
          </Text>
        </View>
        
        <View className="flex-row items-center">
          <Ionicons
            name="call"
            size={14}
            color={item.missed ? "#EF4444" : "#10B981"}
            style={{
              transform: [{ rotateY: item.type === "outgoing" ? "180deg" : "0deg" }],
            }}
            className="mr-1"
          />
          <Text 
            numberOfLines={1} 
            className={`text-sm flex-1 ${
              item.missed ? "text-red-500" : "text-gray-600"
            }`}
          >
            {item.missed ? "Cuộc gọi nhỡ" : `${item.duration} • ${item.date}`}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity className="ml-2 p-2">
        <Ionicons 
          name="call" 
          size={20} 
          color="#0068FF" 
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export default CallItemComponent;
