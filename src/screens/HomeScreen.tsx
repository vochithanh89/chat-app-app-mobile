import React, { useState } from "react";
import {
  FlatList,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

// Import new components
import ButtonComponent from "../components/common/ButtonComponent";
import AvatarComponent from "../components/common/AvatarComponent";
import ChatItemComponent from "../components/list/ChatItemComponent";

type RootStackParamList = {
  Chat: { user: any };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState({ x: 0, y: 0, visible: false });
  const stories = [
    { id: "1", name: "Bạn A", avatar: "https://vienmoitruong5014.org.vn/wp-content/uploads/2023/03/anh-cho-con-de-thuong_022907461.jpg" },
    {
      id: "2",
      name: "Status của bạn",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face",
    },
    { id: "3", name: "Nhóm bạn", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face" },
    { id: "4", name: "Công việc", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face" },
  ];

  const chats = [
    {
      id: "1",
      name: "Bạn A",
      lastMsg: "Ok, gặp tối nay nhé",
      time: "18:30",
      unread: 2,
      avatar: "https://vienmoitruong5014.org.vn/wp-content/uploads/2023/03/anh-cho-con-de-thuong_022907461.jpg",
      online: true,
      pinned: false,
    },
    {
      id: "2",
      name: "Nhóm bạn", 
      lastMsg: "Đang nhập...",
      time: "17:45",
      unread: 5,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face",
      online: false,
      typing: true,
    },
    {
      id: "3",
      name: "Mẹ",
      lastMsg: "Mẹ nấu cơm chưa?",
      time: "16:20",
      unread: 0,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face",
      online: false,
    },
  ];

  const renderStory = ({
    item,
  }: {
    item: { id: string; name: string; avatar: string };
  }) => (
    <TouchableOpacity className="items-center mr-4">
      <View className="relative">
        <View className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 p-0.5">
          <View className="w-full h-full rounded-full bg-white p-0.5">
            <AvatarComponent
              source={{ uri: item.avatar }}
              size="medium"
              className="w-14 h-14"
            />
          </View>
        </View>
      </View>
      <Text className="text-xs text-gray-600 mt-1 text-center" numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const handleLongPress = (item: any, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    setSelectedChat(item.id);
    setShowMenu({ x: pageX, y: pageY, visible: true });
  };

  const handleMenuAction = (action: string, item: any) => {
    switch (action) {
      case 'pin':
        // Handle pin logic
        break;
      case 'delete':
        // Handle delete logic
        break;
      case 'mute':
        // Handle mute logic
        break;
    }
    setShowMenu({ x: 0, y: 0, visible: false });
    setSelectedChat(null);
  };

  const renderChatItem = ({ item }: { item: any }) => (
    <ChatItemComponent
      item={item}
      onPress={(user) => navigation.navigate('Chat', { user })}
      onLongPress={handleLongPress}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-500 px-4 py-5">
        {/* Search bar */}
        <View className="bg-white rounded-full px-4 py-3 flex-row items-center shadow-sm">
          <Ionicons name="search" size={18} color="#0068FF" className="mr-3" />
          <TextInput
            placeholder="Tìm kiếm tin nhắn, Zalo OA..."
            className="flex-1 text-sm text-gray-700"
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity className="ml-2 p-1">
            <Ionicons name="qr-code-outline" size={18} color="#0068FF" />
          </TouchableOpacity>
          <TouchableOpacity className="ml-2 p-1">
            <Ionicons name="add-outline" size={18} color="#0068FF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chat List */}
      <View className="flex-1 bg-white">
        <FlatList
          data={chats}
          renderItem={renderChatItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Floating Action Button */}
      <ButtonComponent
        icon="refresh"
        onPress={() => {}}
        variant="icon"
        className="absolute bottom-20 right-4 w-12 h-12 bg-white rounded-full shadow-lg border border-gray-200"
      />

      {/* Context Menu Overlay */}
      {showMenu.visible && (
        <TouchableOpacity 
          className="absolute inset-0 bg-black/50" 
          onPress={() => setShowMenu({ x: 0, y: 0, visible: false })}
        >
          <View 
            className="absolute bg-white rounded-lg shadow-lg p-2 min-w-40"
            style={{ top: showMenu.y, left: showMenu.x - 160 }}
          >
            <TouchableOpacity 
              className="flex-row items-center p-3 border-b border-gray-100"
              onPress={() => handleMenuAction('pin', chats.find(c => c.id === selectedChat))}
            >
              <Ionicons name="push" size={16} color="#0068FF" className="mr-3" />
              <Text className="text-sm text-gray-700">Ghim</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center p-3 border-b border-gray-100"
              onPress={() => handleMenuAction('mute', chats.find(c => c.id === selectedChat))}
            >
              <Ionicons name="notifications-off" size={16} color="#666" className="mr-3" />
              <Text className="text-sm text-gray-700">Tắt thông báo</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center p-3"
              onPress={() => handleMenuAction('delete', chats.find(c => c.id === selectedChat))}
            >
              <Ionicons name="trash" size={16} color="#EF4444" className="mr-3" />
              <Text className="text-sm text-red-500">Xóa</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;
