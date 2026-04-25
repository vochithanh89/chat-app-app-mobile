import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { conversationAPI, friendshipAPI } from "../services/api";
import {
  normalizeConversation,
  normalizeUser,
  pickUserFromConversation,
} from "../services/chatMappers";
import { useAuth } from "../contexts/AuthContext";
import AvatarComponent from "../components/common/AvatarComponent";
import { useCall } from "../contexts/CallContext";

type RootStackParamList = {
  Chat: { user: any; conversationId?: string };
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, "Chat">;

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face";

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const { ongoingGroupCalls } = useCall();
  const currentUserId = user?.uuid || user?.id || null;
  const [activeTab, setActiveTab] = useState<"messages" | "groups">("messages");
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);

  // Create group states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);

  const loadConversations = useCallback(
    async (silent = false) => {
      try {
        if (!silent) {
          setLoading(true);
        }

        const response = await conversationAPI.getConversations();
        const rawConversations =
          response?.data?.conversations || response?.conversations || [];

        setConversations(
          Array.isArray(rawConversations)
            ? rawConversations.map((item) =>
                normalizeConversation(item, currentUserId)
              )
            : []
        );
      } catch (error) {
        console.log("Load conversations error:", error);
        setConversations([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [currentUserId]
  );

  // Load friends for group creation
  const loadFriends = async () => {
    try {
      const response = await friendshipAPI.getFriends();
      const friendsData = response?.data?.friends || response?.friends || [];
      setFriends(
        Array.isArray(friendsData) 
          ? friendsData.map((f: any) => normalizeUser(f)) 
          : []
      );
    } catch (error) {
      console.error("Error loading friends:", error);
      setFriends([]);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConversations();
      loadFriends();
    }, [loadConversations])
  );

  // Create group handler
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên nhóm");
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert(
        "Thiếu thành viên",
        "Nhóm phải có ít nhất 2 người. Vui lòng chọn ít nhất một bạn bè để thêm vào nhóm.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    try {
      setCreatingGroup(true);
      const groupData = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        member_ids: selectedMembers,
      };

      await conversationAPI.createGroup(groupData);

      // Reset form
      setGroupName("");
      setGroupDescription("");
      setSelectedMembers([]);
      setShowCreateGroupModal(false);

      // Reload conversations
      loadConversations();

      const totalMembers = selectedMembers.length + 1;
      Alert.alert(
        "Thành công",
        `Đã tạo nhóm "${groupName.trim()}" với ${totalMembers} thành viên!`
      );
    } catch (error: any) {
      console.error("Error creating group:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo nhóm. Vui lòng thử lại.";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Toggle member selection
  const toggleMemberSelection = (friendId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

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
          <Text
            className="text-base font-semibold text-gray-900 flex-1"
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <Text className="text-xs text-gray-500 ml-2">
            {item.time || ""}
          </Text>
        </View>

        {item.isGroup && ongoingGroupCalls[item.id] ? (
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            <Text className="text-sm text-green-600 font-medium">Cuộc gọi đang diễn ra</Text>
          </View>
        ) : (
          <Text className="text-sm text-gray-500" numberOfLines={1}>
            {item.lastMsg || "No messages yet"}
          </Text>
        )}
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
      {/* Search Bar */}
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

      {/* Tabs */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row">
          <TouchableOpacity
            className={`flex-1 py-3 ${
              activeTab === "messages" ? "border-b-2 border-blue-500" : ""
            }`}
            onPress={() => setActiveTab("messages")}
          >
            <Text
              className={`text-center font-medium ${
                activeTab === "messages" ? "text-blue-500" : "text-gray-500"
              }`}
            >
              Direct Messages
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-3 ${
              activeTab === "groups" ? "border-b-2 border-blue-500" : ""
            }`}
            onPress={() => setActiveTab("groups")}
          >
            <Text
              className={`text-center font-medium ${
                activeTab === "groups" ? "text-blue-500" : "text-gray-500"
              }`}
            >
              Group Chats
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
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
          {/* Create Group Button - Only in Group tab */}
          {activeTab === "groups" && (
            <TouchableOpacity
              className="flex-row items-center p-4 bg-white border-b border-gray-50"
              onPress={() => setShowCreateGroupModal(true)}
            >
              <View className="w-12 h-12 rounded-full bg-blue-500 justify-center items-center mr-3">
                <Ionicons name="add" size={20} color="white" />
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-base text-gray-900">
                  Create Group
                </Text>
                <Text className="text-sm text-gray-500">
                  Start a group conversation
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {filteredConversations.length === 0 ? (
            <View className="items-center justify-center py-20">
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-3">
                {activeTab === "messages"
                  ? "No direct conversations yet"
                  : "No group conversations yet"}
              </Text>
            </View>
          ) : (
            filteredConversations.map(renderConversation)
          )}
        </ScrollView>
      )}

      {/* Create Group Modal */}
      <Modal
        visible={showCreateGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateGroupModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200 pt-8">
              <TouchableOpacity
                onPress={() => setShowCreateGroupModal(false)}
              >
                <Text className="text-blue-500 font-medium">Hủy</Text>
              </TouchableOpacity>
              <Text className="font-semibold text-lg">Tạo nhóm mới</Text>
              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={creatingGroup || !groupName.trim()}
              >
                <Text
                  className={`font-medium ${
                    creatingGroup || !groupName.trim()
                      ? "text-gray-300"
                      : "text-blue-500"
                  }`}
                >
                  {creatingGroup ? "Đang tạo..." : "Tạo"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="p-4 pb-8">
              {/* Group Name */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Tên nhóm
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-gray-800"
                  placeholder="Nhập tên nhóm"
                  value={groupName}
                  onChangeText={setGroupName}
                  maxLength={50}
                />
              </View>

              {/* Group Description */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Mô tả (tùy chọn)
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-gray-800 h-20"
                  placeholder="Nhập mô tả nhóm"
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  multiline
                  maxLength={200}
                />
              </View>

              {/* Select Members */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">
                  Thêm thành viên
                </Text>
                {friends.length > 0 ? (
                  friends.map((friend) => (
                    <TouchableOpacity
                      key={friend.id}
                      className="flex-row items-center p-3 border-b border-gray-100"
                      onPress={() => toggleMemberSelection(friend.id)}
                    >
                      <Image
                        source={{
                          uri: friend.avatarUrl || FALLBACK_AVATAR,
                        }}
                        className="w-10 h-10 rounded-full"
                      />
                      <View className="flex-1 ml-3">
                        <Text className="font-medium text-gray-800">
                          {friend.name}
                        </Text>
                      </View>
                      <View
                        className={`w-6 h-6 rounded-full border-2 ${
                          selectedMembers.includes(friend.id)
                            ? "bg-blue-500 border-blue-500"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedMembers.includes(friend.id) && (
                          <Ionicons name="checkmark" size={14} color="white" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text className="text-gray-500 text-center py-4">
                    Chưa có bạn bè nào để thêm vào nhóm
                  </Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default HomeScreen;
