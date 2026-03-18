import React from "react";
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

type RootStackParamList = {
  Chat: { user: any };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Chat'>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
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
      <View className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 p-0.5">
        <Image
          source={{ uri: item.avatar }}
          className="w-15 h-15 rounded-full bg-white"
        />
      </View>
      <Text className="text-xs text-gray-600 mt-1 text-center" numberOfLines={1}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderChatItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      className="flex-row items-center p-3 bg-white border-b border-gray-50"
      onPress={() => navigation.navigate('Chat', { user: item })}
    >
      <View className="relative">
        <Image
          source={{ uri: item.avatar }}
          className="w-12 h-12 rounded-full"
        />
        {item.online && (
          <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </View>
      <View className="flex-1 ml-3">
        <View className="flex-row justify-between items-center">
          <Text className="font-semibold text-base text-gray-900">{item.name}</Text>
          <Text className="text-xs text-gray-500">{item.time}</Text>
        </View>
        <View className="flex-row items-center mt-1">
          {item.pinned && <Ionicons name="push" size={12} color="#0068FF" className="mr-1" />}
          <Text numberOfLines={1} className="text-gray-600 text-sm flex-1">
            {item.typing ? "Đang nhập..." : item.lastMsg}
          </Text>
        </View>
      </View>
      {item.unread > 0 && (
        <View className="bg-red-500 w-5 h-5 rounded-full justify-center items-center ml-2">
          <Text className="text-white text-xs font-bold">
            {item.unread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Zalo Header */}
      <View className="bg-white px-4 py-2 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            {/* Logo Zalo */}
            <View className="flex-row items-center">
              <Image
                source={{
                  uri: "https://via.placeholder.com/80x30/0068FF/FFFFFF?text=Zalo",
                }}
                className="h-6 w-20"
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
        
        {/* Search bar với icons */}
        <View className="mt-2 flex-row items-center">
          <View className="flex-1 bg-blue-50 rounded-full px-4 py-2.5 flex-row items-center mr-2">
            <Ionicons name="search" size={18} color="#0068FF" className="mr-2" />
            <TextInput
              placeholder="Tìm kiếm tin nhắn, Zalo OA..."
              className="flex-1 text-sm text-gray-700"
              placeholderTextColor="gray"
            />
          </View>
          <TouchableOpacity className="p-2">
            <Ionicons name="qr-code-outline" size={20} color="#0068FF" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2">
            <Ionicons name="add-circle-outline" size={20} color="#0068FF" />
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
      <TouchableOpacity className="absolute bottom-20 right-4 w-12 h-12 bg-white rounded-full justify-center items-center shadow-lg border border-gray-200">
        <Ionicons name="refresh" size={20} color="#0068FF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default HomeScreen;
