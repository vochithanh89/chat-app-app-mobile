import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";

const ChatScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = route.params as { user: any };
  const [message, setMessage] = useState('');
  const messages = [
    {
      id: "1",
      text: "Chào bạn, hôm nay thế nào?",
      user: "other",
      time: "18:00",
    },
    {
      id: "2",
      text: "Tốt lắm, đang code UI Zalo đây!",
      user: "me",
      time: "18:01",
    },
    {
      id: "3",
      text: "Hay quá! Dùng Tailwind à?",
      user: "other",
      time: "18:02",
    },
  ];

  const renderMessage = ({
    item,
  }: {
    item: { id: string; text: string; user: string; time: string };
  }) => (
    <View
      className={`p-3 my-2 ${item.user === "me" ? "self-end ml-10" : "self-start mr-10"}`}
    >
      <View
        className={`max-w-[70%] p-3 rounded-2xl ${item.user === "me" ? "bg-zalo rounded-tr-sm" : "bg-gray-200 rounded-tl-sm"}`}
      >
        <Text
          className={`${item.user === "me" ? "text-white" : "text-gray-900"} text-sm`}
        >
          {item.text}
        </Text>
        <Text className="text-xs text-gray-400 mt-1">{item.time}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-white p-3 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#0068FF" />
          </TouchableOpacity>
          <Image
            source={{ uri: user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face" }}
            className="w-10 h-10 rounded-full mr-3"
          />
          <View className="flex-1">
            <Text className="font-bold text-lg">{user?.name || "Người dùng"}</Text>
            <Text className="text-gray-500 text-sm">{user?.online ? "Đang hoạt động" : "Offline"}</Text>
          </View>
          <Ionicons
            name="videocam"
            size={24}
            color="#0068FF"
            className="mr-2"
          />
          <Ionicons name="call" size={24} color="#0068FF" className="mr-2" />
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={24} color="#0068FF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      />

      {/* Input bar Zalo style */}
      <View className="bg-white px-2 py-1.5 border-t border-gray-200">
        <View className="flex-row items-center">
          {message.trim() === '' ? (
            <>
              <TouchableOpacity className="mr-1.5">
                <Ionicons name="add-circle-outline" size={20} color="#0068FF" />
              </TouchableOpacity>
              <TextInput
                placeholder="Nhập tin nhắn..."
            className="flex-1 px-4 py-0.5 border border-gray-300 rounded-full mt-1 mr-1.5 text-sm"
                multiline
              />
              <TouchableOpacity className="mr-1.5">
                <Ionicons name="happy-outline" size={20} color="gray" />
              </TouchableOpacity>
              <TouchableOpacity className="mr-1.5">
                <Ionicons name="image-outline" size={20} color="#0068FF" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity className="mr-1.5">
                <Ionicons name="add-circle-outline" size={20} color="#0068FF" />
              </TouchableOpacity>
              <TextInput
                placeholder="Nhập tin nhắn..."
                value={message}
                onChangeText={setMessage}
                className="flex-1 px-4 py-1.5 border border-gray-300 rounded-full mr-1.5 text-sm text-center"
                multiline
              />
              <TouchableOpacity className="bg-blue-500 p-1 rounded-full">
                <Ionicons name="send" size={14} color="white" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ChatScreen;
