import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AvatarComponent from "../common/AvatarComponent";

interface ChatItemProps {
  item: {
    id: string;
    name: string;
    lastMsg: string;
    time: string;
    unread?: number;
    avatar: string;
    online?: boolean;
    pinned?: boolean;
    typing?: boolean;
    missed?: boolean;
  };
  onPress: (item: any) => void;
  onLongPress?: (item: any, event: any) => void;
  className?: string;
}

const ChatItemComponent: React.FC<ChatItemProps> = ({
  item,
  onPress,
  onLongPress,
  className = "",
}) => {
  return (
    <TouchableOpacity
      className={`flex-row items-center p-4 bg-white border-b border-gray-50 active:bg-gray-50 ${className}`}
      onPress={() => onPress(item)}
      onLongPress={(event) => onLongPress?.(item, event)}
      delayLongPress={500}
    >
      <View className="relative mr-3">
        <AvatarComponent
          source={{ uri: item.avatar }}
          size="medium"
          showOnlineStatus={item.name !== "AI Assistant"}
          isOnline={!!item.online}
        />
      </View>

      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="font-semibold text-base text-gray-900 flex-1" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs text-gray-500 ml-2">
            {item.time}
          </Text>
        </View>

        <View className="flex-row items-center">
          {!!item.pinned && (
            <Ionicons name="push" size={12} color="#0068FF" style={{ marginRight: 4 }} />
          )}
          <Text
            numberOfLines={1}
            className={`text-sm flex-1 ${
              item.typing ? "text-blue-500 italic" : item.missed ? "text-red-500" : "text-gray-600"
            }`}
          >
            {item.typing ? "Đang nhập..." : item.lastMsg}
          </Text>
        </View>
      </View>

      {!!(item.unread && item.unread > 0) && (
        <View className="bg-red-500 min-w-[20px] h-5 rounded-full justify-center items-center ml-2 px-1">
          <Text className="text-white text-[10px] font-bold">
            {item.unread > 99 ? "99+" : item.unread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default ChatItemComponent;