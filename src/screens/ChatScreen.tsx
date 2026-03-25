import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";

// Import new components and hooks
import ButtonComponent from "../components/common/ButtonComponent";
import InputComponent from "../components/common/InputComponent";
import AvatarComponent from "../components/common/AvatarComponent";
import HeaderComponent from "../components/common/HeaderComponent";
import { useTabBarVisibility } from "../hooks/useTabBarVisibility";

type RootStackParamList = {
  HomeMain: undefined;
  Chat: { user: any };
  ChatOptions: { user: any };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { user } = route.params;
  const [message, setMessage] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState({ x: 0, y: 0, visible: false });
  const [showEmojiPicker, setShowEmojiPicker] = useState({ x: 0, y: 0, visible: false });
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showReactionDetails, setShowReactionDetails] = useState<{ x: number, y: number, visible: boolean, reaction: any }>({ x: 0, y: 0, visible: false, reaction: null });

  // Ẩn tab bar khi vào ChatScreen
  useTabBarVisibility(true);
  const messages = [
    {
      id: "1",
      text: "Chào bạn, hôm nay thế nào?",
      user: "other",
      time: "18:00",
      status: "read",
      reactions: [
        { emoji: "👍", users: ["Tôi"], count: 1 }
      ]
    },
    {
      id: "2",
      text: "Tốt lắm, đang code UI Zalo đây!",
      user: "me",
      time: "18:01",
      status: "read",
      reactions: [
        { emoji: "❤️", users: ["Bạn"], count: 1 },
        { emoji: "😂", users: ["Người khác"], count: 1 }
      ]
    },
    {
      id: "3",
      text: "Hay quá! Dùng Tailwind à?",
      user: "other",
      time: "18:02",
      status: "delivered",
      reactions: []
    },
    {
      id: "4",
      text: "Đúng rồi, rất tiện lợi!",
      user: "me",
      time: "18:03",
      status: "sent",
      reactions: []
    },
    {
      id: "5",
      text: "Ui, trông chuyên nghiệp ghê!",
      user: "other",
      time: "18:04",
      status: "sending",
      reactions: []
    }
  ];

  const handleLongPress = (messageId: string, event: any, isMe: boolean) => {
    const { pageX, pageY } = event.nativeEvent;
    const { width, height } = Dimensions.get('window');
    
    // Menu dimensions
    const menuWidth = 176;
    const menuHeight = 100; // Increased height for context menu
    const emojiHeight = 80; // Increased height for emoji picker
    const totalHeight = menuHeight + emojiHeight; // Total height with spacing
    
    // Calculate safe positions
    let safeX = pageX;
    let safeY = pageY;
    
    // Adjust horizontal position based on sender
    if (isMe) {
      // For my messages, position menu to the left
      safeX = pageX - menuWidth - 20;
      if (safeX < 20) {
        safeX = 20;
      }
    } else {
      // For other messages, position menu to the right
      if (pageX + menuWidth > width) {
        safeX = width - menuWidth - 20;
      }
      if (safeX < 20) {
        safeX = 20;
      }
    }
    
    // Prevent menu from going off screen vertically
    if (pageY + totalHeight > height) {
      safeY = height - totalHeight - 20;
    }
    if (pageY - totalHeight < 0) {
      safeY = totalHeight + 20;
    }
    
    setSelectedMessage(messageId);
    setShowMenu({ x: safeX, y: safeY, visible: true });
  };

  const handleMenuAction = (action: string) => {
    switch (action) {
      case 'reply':
        setReplyingTo(selectedMessage);
        break;
      case 'forward':
        // Handle forward logic
        break;
      case 'revoke':
        // Handle revoke logic
        break;
      case 'copy':
        // Handle copy logic
        break;
      case 'pin':
        // Handle pin logic
        break;
      case 'delete':
        // Handle delete logic
        break;
    }
    setShowMenu({ x: 0, y: 0, visible: false });
    setSelectedMessage(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    console.log(`Added reaction ${emoji} to message ${selectedMessage}`);
    setShowMenu({ x: 0, y: 0, visible: false });
    setSelectedMessage(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sending':
        return <Ionicons name="time" size={12} color="#9CA3AF" />;
      case 'sent':
        return <Ionicons name="checkmark" size={12} color="#9CA3AF" />;
      case 'delivered':
        return <Ionicons name="checkmark-done" size={12} color="#9CA3AF" />;
      case 'read':
        return <Ionicons name="checkmark-done" size={12} color="#0068FF" />;
      default:
        return null;
    }
  };

  const renderReactions = (reactions: any[]) => {
    if (reactions.length === 0) return null;
    
    return (
      <View className="flex-row flex-wrap mt-2">
        {reactions.map((reaction, index) => (
          <TouchableOpacity 
            key={index}
            className="flex-row items-center bg-gray-100 rounded-full px-2 py-1 mr-1 mb-1"
            onPress={(event) => handleReactionPress(reaction, event)}
          >
            <Text className="text-sm mr-1">{reaction.emoji}</Text>
            <Text className="text-xs text-gray-600">{reaction.count}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const handleReactionPress = (reaction: any, event: any) => {
    const { pageX, pageY } = event.nativeEvent;
    const { width, height } = Dimensions.get('window');
    
    // Modal dimensions
    const modalWidth = 200;
    const modalHeight = 150;
    
    // Calculate safe positions
    let safeX = pageX;
    let safeY = pageY;
    
    // Prevent modal from going off screen horizontally
    if (pageX + modalWidth > width) {
      safeX = width - modalWidth - 20;
    }
    if (pageX - modalWidth < 0) {
      safeX = 20;
    }
    
    // Prevent modal from going off screen vertically
    if (pageY + modalHeight > height) {
      safeY = height - modalHeight - 20;
    }
    if (pageY - modalHeight < 0) {
      safeY = modalHeight + 20;
    }
    
    setShowReactionDetails({ 
      x: safeX, 
      y: safeY, 
      visible: true, 
      reaction: reaction 
    });
  };

  const isGroupChat = false;

  const renderReactionDetails = () => {
    if (!showReactionDetails.visible || !showReactionDetails.reaction) return null;

    const { reaction } = showReactionDetails;
    
    return (
      <TouchableOpacity 
        className="absolute inset-0 bg-black/50" 
        onPress={() => setShowReactionDetails({ x: 0, y: 0, visible: false, reaction: null })}
      >
        <View 
          className="absolute bg-white rounded-lg shadow-lg p-3 min-w-48"
          style={{ 
            top: showReactionDetails.y, 
            left: showReactionDetails.x 
          }}
        >
          <View className="flex-row items-center mb-3 pb-2 border-b border-gray-100">
            <Text className="text-lg mr-2">{reaction.emoji}</Text>
            <Text className="font-semibold text-gray-800">{reaction.count} người</Text>
          </View>
          
          {isGroupChat ? (
            // Group chat - show list of users
            <View className="max-h-32">
              {reaction.users.map((user: string, index: number) => (
                <View key={index} className="flex-row items-center py-2">
                  <Image
                    source={{ uri: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face" }}
                    className="w-8 h-8 rounded-full mr-3"
                  />
                  <Text className="text-sm text-gray-700">{user}</Text>
                </View>
              ))}
            </View>
          ) : (
            // Single chat - show the other person
            <View className="flex-row items-center py-2">
              <Image
                source={{ uri: user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=face" }}
                className="w-8 h-8 rounded-full mr-3"
              />
              <Text className="text-sm text-gray-700">{user?.name || "Người dùng"}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getReplyingMessage = () => {
    if (!replyingTo) return null;
    return messages.find(msg => msg.id === replyingTo);
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const renderMessage = ({ item }: { item: any }) => (
    <View className={`mb-4 ${item.user === "me" ? "flex-row-reverse" : "flex-row"}`}>
      <TouchableOpacity 
        onLongPress={(event) => handleLongPress(item.id, event, item.user === "me")}
        delayLongPress={1000}
      >
        <View>
          <View className={`${item.user === "me" ? "max-w-[95%]" : "max-w-[95%]"} ${item.user === "me" ? "bg-blue-500" : "bg-white"} rounded-2xl p-3 shadow-sm`}>
            <Text className={`text-sm ${item.user === "me" ? "text-white" : "text-gray-800"}`}>
              {item.text}
            </Text>
            
            {/* Time and Status */}
            <View className={`flex-row items-center mt-1 ${item.user === "me" ? "justify-end" : "justify-start"}`}>
              <Text className={`text-xs ${item.user === "me" ? "text-blue-100" : "text-gray-400"} mr-1`}>
                {item.time}
              </Text>
              {item.user === "me" && getStatusIcon(item.status)}
            </View>
          </View>
          
          {/* Reactions - Outside message bubble */}
          {renderReactions(item.reactions)}
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-500 px-4 pt-3 pb-4 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="p-2 rounded-full mr-3"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          
          <View className="relative">
            <Image
              source={{ uri: user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face" }}
              className="w-12 h-12 rounded-full mr-3 border-2 border-white shadow-sm"
            />
            {user?.online && (
              <View className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
            )}
          </View>
          
          <View className="flex-1">
            <Text className="font-bold text-lg text-white">{user?.name || "Người dùng"}</Text>
            <View className="flex-row items-center">
              <Text className="text-blue-100 text-sm mr-1">
                {user?.online ? "Đang hoạt động" : "Offline"}
              </Text>
            </View>
          </View>
          
          <View className="flex-row">
            <TouchableOpacity className="p-2 bg-white/20 rounded-full mr-2">
              <Ionicons name="videocam" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="p-2 bg-white/20 rounded-full mr-2">
              <Ionicons name="call" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity className="p-2 bg-white/20 rounded-full" onPress={() => navigation.navigate('ChatOptions', { user })}>
              <Ionicons name="ellipsis-vertical" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Input bar*/}
      <View className="bg-white px-2 py-1.5 border-t border-gray-200">
        {/* Reply UI */}
        {replyingTo && (
          <View className="flex-row items-center bg-gray-50 p-2 mb-2 rounded-lg">
            <View className="w-1 bg-blue-500 h-6 mr-2 rounded-full" />
            <View className="flex-1">
              <Text className="text-xs text-gray-500 mb-1">Đang trả lời</Text>
              <Text className="text-sm text-gray-800 line-clamp-1">
                {getReplyingMessage()?.text}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelReply} className="p-1">
              <Ionicons name="close" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        
        <View className="flex-row items-center mt-2 mb-2">
          {message.length === 0 ? (
            <>
              <TouchableOpacity className="mr-1.5">
                <Ionicons name="happy-outline" size={24} color="gray" />
              </TouchableOpacity>
              <TextInput
                placeholder="Nhập tin nhắn..."
                value={message}
                onChangeText={setMessage}
                className="flex-1 px-4 py-0.5 mr-1.5 text-sm h-8"
                multiline={true}
              />
                <TouchableOpacity className="mr-1.5">
                <Ionicons name="add-circle-outline" size={24} color="gray" />
              </TouchableOpacity>
              <TouchableOpacity className="mr-1.5">
                <Ionicons name="image-outline" size={24} color="gray" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity className="mr-1.5">
                <Ionicons name="add-circle-outline" size={24} color="gray" />
              </TouchableOpacity>
              <TextInput
                placeholder="Nhập tin nhắn..."
                value={message}
                onChangeText={setMessage}
                className="flex-1 px-4 py-0.5 mr-1.5 text-sm h-8"
                multiline={true}
              />
              <TouchableOpacity className="bg-blue-500 p-2 rounded-full">
                <Ionicons name="send" size={14} color="white" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Context Menu Overlay */}
    {showMenu.visible && (
      <TouchableOpacity 
        className="absolute inset-0 bg-black/50" 
        onPress={() => setShowMenu({ x: 0, y: 0, visible: false })}
      >
        {/* Emoji Picker */}
        <View 
          className="absolute bg-white rounded-lg shadow-lg p-2 min-w-44"
          style={{ top: showMenu.y - 85, left: showMenu.x }}
        >
          <View className="flex-row justify-between items-center">
            {["❤️", "👍", "😂", "😮", "😢", "😡"].map((emoji, index) => (
              <TouchableOpacity 
                key={index}
                className="flex-1 items-center justify-center p-2"
                onPress={() => handleEmojiSelect(emoji)}
              >
                <Text className="text-2xl">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Context Menu */}
        <View 
          className="absolute bg-white rounded-lg shadow-lg p-2 min-w-44"
          style={{ top: showMenu.y, left: showMenu.x }}
        >
          <TouchableOpacity 
            className="flex-row items-center p-3 border-b border-gray-100"
            onPress={() => handleMenuAction("reply")}
          >
            <Ionicons name="arrow-undo" size={16} color="#0068FF" className="mr-3" />
            <Text className="text-sm text-gray-700">Trả lời</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center p-3 border-b border-gray-100"
            onPress={() => handleMenuAction("forward")}
          >
            <Ionicons name="share" size={16} color="#666" className="mr-3" />
            <Text className="text-sm text-gray-700">Chuyển tiếp</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center p-3 border-b border-gray-100"
            onPress={() => handleMenuAction("revoke")}
          >
            <Ionicons name="refresh" size={16} color="#666" className="mr-3" />
            <Text className="text-sm text-gray-700">Thu hồi</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center p-3 border-b border-gray-100"
            onPress={() => handleMenuAction("copy")}
          >
            <Ionicons name="copy" size={16} color="#666" className="mr-3" />
            <Text className="text-sm text-gray-700">Sao chép</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center p-3 border-b border-gray-100"
            onPress={() => handleMenuAction("pin")}
          >
            <Ionicons name="push" size={16} color="#0068FF" className="mr-3" />
            <Text className="text-sm text-gray-700">Ghim</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-row items-center p-3"
            onPress={() => handleMenuAction("delete")}
          >
            <Ionicons name="trash" size={16} color="#EF4444" className="mr-3" />
            <Text className="text-sm text-red-500">Xóa</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )}

    {/* Reaction Details Overlay */}
    {renderReactionDetails()}
    </SafeAreaView>
  );
};

export default ChatScreen;
