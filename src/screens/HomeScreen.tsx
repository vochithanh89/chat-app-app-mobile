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
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<'messages' | 'groups'>('messages');

  // AI Assistant item
  const aiAssistant = {
    id: "ai-assistant",
    name: "AI Assistant",
    lastMsg: "How can I help you today?",
    time: "Online",
    avatar: "https://cdn-icons-png.flaticon.com/512/1698/1698535.png",
    isAI: true,
    online: true,
  };

  const directMessages = [
    {
      id: "1",
      name: "Alice Johnson",
      lastMsg: "Hey! How are you doing?",
      time: "2 min ago",
      unread: 1,
      avatar: "https://vienmoitruong5014.org.vn/wp-content/uploads/2023/03/anh-cho-con-de-thuong_022907461.jpg",
      online: true,
      pinned: false,
    },
    {
      id: "2",
      name: "Bob Smith",
      lastMsg: "See you tomorrow!",
      time: "1 hour ago",
      unread: 0,
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face",
      online: false,
    },
    {
      id: "3",
      name: "Carol White",
      lastMsg: "Thanks for the help!",
      time: "3 hours ago",
      unread: 0,
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face",
      online: false,
    },
  ];

  const groupChats = [
    {
      id: "4",
      name: "Development Team",
      lastMsg: "Meeting at 3 PM",
      time: "30 min ago",
      unread: 3,
      avatar: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=60&h=60&fit=crop&crop=face",
      online: false,
      isGroup: true,
    },
    {
      id: "5",
      name: "Project Alpha",
      lastMsg: "Deadline extended",
      time: "2 hours ago",
      unread: 0,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face",
      online: false,
      isGroup: true,
    },
  ];

  const renderAIAssistant = () => (
    <TouchableOpacity
      className="flex-row items-center p-4 bg-white border-b border-gray-50"
      onPress={() => navigation.navigate('Chat', { user: aiAssistant })}
    >
      <View className="relative mr-3">
        <View className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 justify-center items-center">
          <Ionicons name="sparkles" size={20} color="white" />
        </View>
        <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
      </View>

      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="font-semibold text-base text-gray-900 flex-1" numberOfLines={1}>
            AI Assistant
          </Text>
          <Text className="text-xs text-green-400 ml-2">
            Online
          </Text>
        </View>

        <Text className="text-sm text-gray-500" numberOfLines={1}>
          How can I help you today?
        </Text>
      </View>
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
    <TouchableOpacity
      className={`flex-row items-center p-4 bg-white border-b border-gray-50`}
      onPress={() => navigation.navigate('Chat', { user: item })}
      onLongPress={(event) => handleLongPress(item, event)}
      delayLongPress={500}
    >
      <View className="relative mr-3">
        <AvatarComponent
          source={{ uri: item.avatar }}
          size="medium"
          showOnlineStatus
          isOnline={!!item.online}
        />
        {item.isGroup && (
          <View className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
            <Ionicons name="people" size={8} color="white" />
          </View>
        )}
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
              item.typing ? "text-blue-400 italic" : item.missed ? "text-red-400" : "text-gray-500"
            }`}
          >
            {item.typing ? "Typing..." : item.lastMsg}
          </Text>
        </View>
      </View>

      {!!(item.unread && item.unread > 0) && (
        <View className="bg-blue-500 min-w-[20px] h-5 rounded-full justify-center items-center ml-2 px-1">
          <Text className="text-white text-[10px] font-bold">
            {item.unread > 99 ? "99+" : item.unread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header with Search */}
      <View className="bg-blue-500 px-4 py-4">
        {/* Search bar */}
        <View className="bg-white rounded-full px-4 py-3 flex-row items-center shadow-sm">
          <Ionicons name="search" size={18} color="#0068FF" className="mr-3" />
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            className="flex-1 text-sm text-gray-700"
          />
        </View>
      </View>

      {/* Chat List */}
      <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
        {/* AI Assistant - Show on both tabs */}
        {renderAIAssistant()}
        
        {/* Tabs */}
        <View className="bg-white border-b border-gray-200">
          <View className="flex-row">
            <TouchableOpacity 
              className={`flex-1 py-3 ${activeTab === 'messages' ? 'border-b-2 border-blue-500' : ''}`}
              onPress={() => setActiveTab('messages')}
            >
              <Text className={`text-center font-medium ${activeTab === 'messages' ? 'text-blue-500' : 'text-gray-500'}`}>
                Direct Messages
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={`flex-1 py-3 ${activeTab === 'groups' ? 'border-b-2 border-blue-500' : ''}`}
              onPress={() => setActiveTab('groups')}
            >
              <Text className={`text-center font-medium ${activeTab === 'groups' ? 'text-blue-500' : 'text-gray-500'}`}>
                Group Chats
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'messages' ? (
          <View>
            {directMessages.map((item) => (
              <View key={item.id}>
                {renderChatItem({ item })}
              </View>
            ))}
          </View>
        ) : (
          <View>
            {/* Create Group Button */}
            <View className="flex-row items-center p-4 bg-white border-b border-gray-50">
              <View className="w-12 h-12 rounded-full bg-blue-500 justify-center items-center mr-3">
                <Ionicons name="add" size={20} color="black" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-base text-gray-900">Create Group</Text>
                <Text className="text-sm text-gray-500">Start a group conversation</Text>
              </View>
              {/* <Ionicons name="add" size={16} color="#666" /> */}
            </View>
            {groupChats.map((item) => (
              <View key={item.id}>
                {renderChatItem({ item })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Context Menu Overlay */}
      {showMenu.visible && (
        <TouchableOpacity 
          className="absolute inset-0 bg-black/50" 
          onPress={() => setShowMenu({ x: 0, y: 0, visible: false })}
        >
          <View 
            className="absolute bg-white rounded-lg shadow-lg p-2 min-w-40 border border-gray-200"
            style={{ top: showMenu.y, left: showMenu.x - 160 }}
          >
            <TouchableOpacity 
              className="flex-row items-center p-3 border-b border-gray-200"
              onPress={() => handleMenuAction('pin', [...directMessages, ...groupChats].find(c => c.id === selectedChat))}
            >
              <Ionicons name="push" size={16} color="#0068FF" className="mr-3" />
              <Text className="text-sm text-gray-800">Pin</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center p-3 border-b border-gray-200"
              onPress={() => handleMenuAction('mute', [...directMessages, ...groupChats].find(c => c.id === selectedChat))}
            >
              <Ionicons name="notifications-off" size={16} color="#666" className="mr-3" />
              <Text className="text-sm text-gray-800">Mute</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center p-3"
              onPress={() => handleMenuAction('delete', [...directMessages, ...groupChats].find(c => c.id === selectedChat))}
            >
              <Ionicons name="trash" size={16} color="#EF4444" className="mr-3" />
              <Text className="text-sm text-red-400">Delete</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;
