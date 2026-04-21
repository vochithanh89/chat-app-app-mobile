import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  SafeAreaView,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { conversationAPI, friendshipAPI } from "../services/api";
import {
  normalizeConversation,
  normalizeUser,
  pickUserFromConversation,
} from "../services/chatMappers";
import { useAuth } from "../contexts/AuthContext";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face";

const ContactsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const currentUserId = user?.uuid || user?.id || null;
  const [activeTab, setActiveTab] = useState<"friends" | "requests" | "sent" | "blocked" | "groups">("friends");
  const [friends, setFriends] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [friendsResponse, receivedResponse, sentResponse, blockedResponse, conversationsResponse] =
        await Promise.all([
          friendshipAPI.getFriends(),
          friendshipAPI.getReceivedRequests(),
          friendshipAPI.getSentRequests(),
          friendshipAPI.getBlockedUsers(),
          conversationAPI.getConversations(),
        ]);

      const friendItems =
        friendsResponse?.data?.friends ||
        friendsResponse?.friends ||
        [];
      const receivedItems =
        receivedResponse?.data?.requests ||
        receivedResponse?.requests ||
        [];
      const sentItems =
        sentResponse?.data?.requests ||
        sentResponse?.requests ||
        [];
      const blockedItems =
        blockedResponse?.data?.blocked ||
        blockedResponse?.blocked ||
        [];
      const conversationItems =
        conversationsResponse?.data?.conversations ||
        conversationsResponse?.conversations ||
        [];

      setFriends(Array.isArray(friendItems) ? friendItems.map(normalizeUser) : []);
      setReceivedRequests(Array.isArray(receivedItems) ? receivedItems : []);
      setSentRequests(Array.isArray(sentItems) ? sentItems : []);
      setBlockedUsers(Array.isArray(blockedItems) ? blockedItems.map(normalizeUser) : []);
      setGroups(
        Array.isArray(conversationItems)
          ? conversationItems
              .map((item) => normalizeConversation(item, currentUserId))
              .filter((item) => item.isGroup)
          : [],
      );
    } catch (error) {
      console.log("Contacts load error:", error);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll]),
  );

  const groupedFriends = useMemo(() => {
    const grouped = friends.reduce((acc: Record<string, any[]>, friend: any) => {
      const letter = friend.name?.charAt(0)?.toUpperCase() || "#";
      if (!acc[letter]) {
        acc[letter] = [];
      }
      acc[letter].push(friend);
      return acc;
    }, {});

    return Object.keys(grouped)
      .sort()
      .map((key) => ({
        title: key,
        data: grouped[key].sort((a: any, b: any) => a.name.localeCompare(b.name)),
      }));
  }, [friends]);

  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await friendshipAPI.searchUsers(query.trim());
      const users = response?.data?.users || response?.users || [];
      setSearchResults(Array.isArray(users) ? users.map(normalizeUser) : []);
    } catch (error) {
      console.log("Search users error:", error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleViewProfile = async (targetUser: any) => {
    try {
      const targetId = targetUser?.uuid || targetUser?.id;
      const response = await friendshipAPI.getUserById(targetId);
      const profile = normalizeUser(
        response?.data?.user ||
          response?.user ||
          targetUser,
      );

      navigation.navigate("Profile", {
        user: profile,
        friends,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to load user profile");
    }
  };

  const openChatWithUser = (targetUser: any) => {
    navigation.navigate("Chat", {
      user: normalizeUser(targetUser),
    });
  };

  const openGroupChat = (conversation: any) => {
    navigation.navigate("Chat", {
      user: pickUserFromConversation(conversation, currentUserId),
      conversationId: conversation.id,
    });
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friendshipAPI.acceptRequest(requestId);
      loadAll();
    } catch {
      Alert.alert("Error", "Failed to accept request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendshipAPI.rejectRequest(requestId);
      loadAll();
    } catch {
      Alert.alert("Error", "Failed to reject request");
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await friendshipAPI.cancelRequest(requestId);
      loadAll();
    } catch {
      Alert.alert("Error", "Failed to cancel request");
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await friendshipAPI.unblockUser(userId);
      loadAll();
    } catch {
      Alert.alert("Error", "Failed to unblock user");
    }
  };

  const renderUserRow = (item: any, actions?: React.ReactNode) => (
    <View className="flex-row items-center p-3 bg-white border-b border-gray-50">
      <TouchableOpacity className="flex-row items-center flex-1" onPress={() => handleViewProfile(item)}>
        <View className="relative">
          <Image
            source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
            className="w-12 h-12 rounded-full"
          />
          {item.isOnline && (
            <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </View>

        <View className="flex-1 ml-3">
          <Text className="font-semibold text-base text-gray-900">
            {item.name || "Unknown"}
          </Text>
          {!!item.email && <Text className="text-sm text-gray-500">{item.email}</Text>}
        </View>
      </TouchableOpacity>

      {actions}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="bg-blue-500 mt-9 px-4 py-5">
        <View className="bg-white rounded-full px-4 py-3 flex-row items-center shadow-sm">
          <Ionicons name="search" size={18} color="#0068FF" />
          <TextInput
            placeholder={isSearchMode ? "Search users by email..." : "Search friends, contacts..."}
            className="flex-1 text-sm text-gray-700 ml-3"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setIsSearchMode(true)}
          />
          <TouchableOpacity
            className="ml-2"
            onPress={() => {
              setIsSearchMode(!isSearchMode);
              if (isSearchMode) {
                setSearchQuery("");
                setSearchResults([]);
              }
            }}
          >
            <Ionicons name={isSearchMode ? "close" : "person-add-outline"} size={18} color="#0068FF" />
          </TouchableOpacity>
        </View>

        {isSearchMode && (
          <View className="mt-2 bg-white rounded-lg shadow-lg max-h-60">
            {searchLoading ? (
              <View className="p-4 items-center">
                <Text className="text-gray-500">Searching...</Text>
              </View>
            ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
              <View className="p-4 items-center">
                <Text className="text-gray-500">No users found</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item, index) => item.id || item.uuid || `${index}`}
                renderItem={({ item }) =>
                  renderUserRow(
                    item,
                    <TouchableOpacity className="p-2" onPress={() => handleViewProfile(item)}>
                      <Ionicons name="chevron-forward" size={18} color="#0068FF" />
                    </TouchableOpacity>,
                  )
                }
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        )}
      </View>

      <View className="bg-white border-b border-gray-200">
        <View className="flex-row">
          {[
            ["friends", `Friends${friends.length ? ` (${friends.length})` : ""}`],
            ["requests", `Requests${receivedRequests.length ? ` (${receivedRequests.length})` : ""}`],
            ["sent", `Sent${sentRequests.length ? ` (${sentRequests.length})` : ""}`],
            ["blocked", `Blocked${blockedUsers.length ? ` (${blockedUsers.length})` : ""}`],
            ["groups", `Groups${groups.length ? ` (${groups.length})` : ""}`],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              className={`flex-1 py-3 ${activeTab === key ? "border-b-2 border-blue-500" : ""}`}
              onPress={() => setActiveTab(key as any)}
            >
              <Text className={`text-center font-medium text-[12px] ${activeTab === key ? "text-blue-500" : "text-gray-500"}`}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {activeTab === "friends" && (
        <SectionList
          sections={groupedFriends}
          keyExtractor={(item, index) => item.id || item.uuid || `${index}`}
          renderSectionHeader={({ section }) => (
            <View className="bg-gray-100 px-4 py-3">
              <Text className="font-semibold text-sm text-gray-700">{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) =>
            renderUserRow(
              item,
              <View className="flex-row">
                <TouchableOpacity className="p-2" onPress={() => openChatWithUser(item)}>
                  <Ionicons name="chatbubble-outline" size={20} color="#0068FF" />
                </TouchableOpacity>
              </View>,
            )
          }
        />
      )}

      {activeTab === "requests" && (
        <FlatList
          data={receivedRequests}
          keyExtractor={(item, index) => item.friendshipId || item.uuid || `${index}`}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="person-add-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-3">No friend requests</Text>
            </View>
          }
          renderItem={({ item }) =>
            renderUserRow(normalizeUser(item.from || {}), (
              <View className="flex-row">
                <TouchableOpacity
                  className="px-3 py-1 bg-green-500 rounded-full mr-2"
                  onPress={() => handleAcceptRequest(item.friendshipId)}
                >
                  <Text className="text-white text-sm font-medium">Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="px-3 py-1 bg-red-500 rounded-full"
                  onPress={() => handleRejectRequest(item.friendshipId)}
                >
                  <Text className="text-white text-sm font-medium">Reject</Text>
                </TouchableOpacity>
              </View>
            ))
          }
        />
      )}

      {activeTab === "sent" && (
        <FlatList
          data={sentRequests}
          keyExtractor={(item, index) => item.friendshipId || item.uuid || `${index}`}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="paper-plane-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-3">No sent requests</Text>
            </View>
          }
          renderItem={({ item }) =>
            renderUserRow(normalizeUser(item.to || {}), (
              <TouchableOpacity
                className="px-3 py-1 bg-gray-500 rounded-full"
                onPress={() => handleCancelRequest(item.friendshipId)}
              >
                <Text className="text-white text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
            ))
          }
        />
      )}

      {activeTab === "blocked" && (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item, index) => item.id || item.uuid || `${index}`}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="close-circle-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-3">No blocked users</Text>
            </View>
          }
          renderItem={({ item }) =>
            renderUserRow(item, (
              <TouchableOpacity
                className="px-3 py-1 bg-green-500 rounded-full"
                onPress={() => handleUnblock(item.id)}
              >
                <Text className="text-white text-sm font-medium">Unblock</Text>
              </TouchableOpacity>
            ))
          }
        />
      )}

      {activeTab === "groups" && (
        <FlatList
          data={groups}
          keyExtractor={(item, index) => item.id || item.uuid || `${index}`}
          ListEmptyComponent={
            <View className="flex-1 justify-center items-center py-20">
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-3">No groups yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center p-3 bg-white border-b border-gray-50"
              onPress={() => openGroupChat(item)}
            >
              <Image
                source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
                className="w-12 h-12 rounded-full"
              />
              <View className="flex-1 ml-3">
                <Text className="font-medium text-gray-800">{item.name}</Text>
                <Text className="text-sm text-gray-500">
                  {item.members?.length || 0} members
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default ContactsScreen;