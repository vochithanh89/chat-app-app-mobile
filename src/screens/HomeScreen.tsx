import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { conversationAPI } from "../services/api";
import {
  normalizeConversation,
  pickUserFromConversation,
} from "../services/chatMappers";
import { useAuth } from "../contexts/AuthContext";
import AvatarComponent from "../components/common/AvatarComponent";

type RootStackParamList = {
  Chat: { user: any; conversationId?: string };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Chat">;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const currentUserId = user?.uuid || user?.id || null;
  const [activeTab, setActiveTab] = useState<"messages" | "groups">("messages");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);

  const loadConversations = useCallback(async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }

      const response = await conversationAPI.getConversations();
      const rawConversations =
        response?.data?.conversations ||
        response?.conversations ||
        [];

      setConversations(
        Array.isArray(rawConversations)
          ? rawConversations.map((item) => normalizeConversation(item, currentUserId))
          : [],
      );
    } catch (error) {
      console.log("Load conversations error:", error);
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  const filteredConversations = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return conversations.filter((item) => {
      const matchesTab =
        activeTab === "messages" ? !item.isGroup : item.isGroup;
      const matchesQuery =
        !query ||
        item.name?.toLowerCase().includes(query) ||
        item.lastMsg?.toLowerCase().includes(query);

      return matchesTab && matchesQuery;
    });
  }, [activeTab, conversations, searchText]);

  const openConversation = (item: any) => {
    navigation.navigate("Chat", {
      user: pickUserFromConversation(item, currentUserId),
      conversationId: item.id,
    });
  };

  const renderConversation = (item: any) => (
    <TouchableOpacity
      key={item.id}
      className="flex-row items-center px-4 py-4 bg-white border-b border-gray-100"
      onPress={() => openConversation(item)}
    >
      <View className="relative mr-3">
        <AvatarComponent
          source={{ uri: item.avatar }}
          size="medium"
          showOnlineStatus={!item.isGroup}
          isOnline={item.isOnline}
          name={item.name}
        />
        {item.isGroup && (
          <View className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1">
            <Ionicons name="people" size={9} color="white" />
          </View>
        )}
      </View>

      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-base font-semibold text-gray-900 flex-1" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-xs text-gray-500 ml-2">{item.time || ""}</Text>
        </View>

        <Text className="text-sm text-gray-500" numberOfLines={1}>
          {item.lastMsg || "No messages yet"}
        </Text>
      </View>

      {!!item.unread && (
        <View className="bg-blue-500 min-w-[20px] h-5 rounded-full items-center justify-center ml-2 px-1">
          <Text className="text-[10px] font-bold text-white">
            {item.unread > 99 ? "99+" : item.unread}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-blue-500 px-4 py-4">
        <View className="bg-white rounded-full px-4 py-3 flex-row items-center">
          <Ionicons name="search" size={18} color="#0068FF" />
          <TextInput
            placeholder="Search conversations..."
            placeholderTextColor="#9CA3AF"
            value={searchText}
            onChangeText={setSearchText}
            className="flex-1 text-sm text-gray-700 ml-3"
          />
        </View>
      </View>

      <View className="bg-white border-b border-gray-200">
        <View className="flex-row">
          <TouchableOpacity
            className={`flex-1 py-3 ${activeTab === "messages" ? "border-b-2 border-blue-500" : ""}`}
            onPress={() => setActiveTab("messages")}
          >
            <Text className={`text-center font-medium ${activeTab === "messages" ? "text-blue-500" : "text-gray-500"}`}>
              Direct Messages
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 ${activeTab === "groups" ? "border-b-2 border-blue-500" : ""}`}
            onPress={() => setActiveTab("groups")}
          >
            <Text className={`text-center font-medium ${activeTab === "groups" ? "text-blue-500" : "text-gray-500"}`}>
              Group Chats
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0068FF" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadConversations(true);
              }}
            />
          }
        >
          {filteredConversations.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-3">
                {activeTab === "messages" ? "No direct conversations yet" : "No group conversations yet"}
              </Text>
            </View>
          ) : (
            filteredConversations.map(renderConversation)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default HomeScreen;
