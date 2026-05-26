import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Vibration,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { conversationAPI, friendshipAPI } from "../services/api";
import {
  normalizeConversation,
  normalizeUser,
  pickUserFromConversation,
} from "../services/chatMappers";
import { useAuth } from "../contexts/AuthContext";
import { socketService } from "../services/socketService";
import { useTheme } from "../contexts/ThemeContext";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face";

const ContactsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isDarkMode: darkMode, colors } = useTheme();
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

  // Group modal states
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  const loadAll = useCallback(async () => {
    try {
      const [friendsRes, receivedRes, sentRes, blockedRes, convsRes] =
        await Promise.all([
          friendshipAPI.getFriends(),
          friendshipAPI.getReceivedRequests(),
          friendshipAPI.getSentRequests(),
          friendshipAPI.getBlockedUsers(),
          conversationAPI.getConversations(),
        ]);

      const friendItems = friendsRes?.data?.friends || friendsRes?.friends || [];
      const receivedItems = receivedRes?.data?.requests || receivedRes?.requests || [];
      const sentItems = sentRes?.data?.requests || sentRes?.requests || [];
      const blockedItems = blockedRes?.data?.blocked || blockedRes?.blocked || [];
      const convItems = convsRes?.data?.conversations || convsRes?.conversations || [];

      setFriends(Array.isArray(friendItems) ? friendItems.map(normalizeUser) : []);
      setReceivedRequests(Array.isArray(receivedItems) ? receivedItems : []);
      setSentRequests(Array.isArray(sentItems) ? sentItems : []);
      setBlockedUsers(Array.isArray(blockedItems) ? blockedItems.map(normalizeUser) : []);
      setGroups(
        Array.isArray(convItems)
          ? convItems.map((item) => normalizeConversation(item, currentUserId)).filter((item) => item.isGroup)
          : []
      );
    } catch (error) {
      console.log("Contacts load error:", error);
    }
  }, [currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadAll();

      const unsubPresence = socketService.on("presence:changed", () => {
        loadAll();
      });
      const unsubReceived = socketService.on("friend:request:received", async () => {
        loadAll();
        try {
          const storedNotif = await AsyncStorage.getItem("settings:notification");
          if (storedNotif !== "false") {
            Vibration.vibrate(500);
          }
        } catch (error) {
          console.error("Lỗi rung trong ContactsScreen:", error);
        }
      });
      const unsubSent = socketService.on("friend:request:sent", () => {
        loadAll();
      });
      const unsubAccepted = socketService.on("friend:request:accepted", () => {
        loadAll();
      });
      const unsubAdded = socketService.on("friend:added", () => {
        loadAll();
      });
      const unsubRejected = socketService.on("friend:request:rejected", () => {
        loadAll();
      });
      const unsubCancelled = socketService.on("friend:request:cancelled", () => {
        loadAll();
      });
      const unsubUnfriended = socketService.on("friend:unfriended", () => {
        loadAll();
      });
      const unsubBlocked = socketService.on("friend:blocked", () => {
        loadAll();
      });
      const unsubBlockedBy = socketService.on("friend:blocked-by", () => {
        loadAll();
      });
      const unsubUnblocked = socketService.on("friend:unblocked", () => {
        loadAll();
      });
      const unsubUnblockedBy = socketService.on("friend:unblocked-by", () => {
        loadAll();
      });
      const unsubJoined = socketService.on("conversation:joined", () => {
        loadAll();
      });
      const unsubRemoved = socketService.on("conversation:removed", () => {
        loadAll();
      });

      return () => {
        unsubPresence();
        unsubReceived();
        unsubSent();
        unsubAccepted();
        unsubAdded();
        unsubRejected();
        unsubCancelled();
        unsubUnfriended();
        unsubBlocked();
        unsubBlockedBy();
        unsubUnblocked();
        unsubUnblockedBy();
        unsubJoined();
        unsubRemoved();
      };
    }, [loadAll])
  );

  const groupedFriends = useMemo(() => {
    const grouped = friends.reduce((acc: Record<string, any[]>, friend: any) => {
      const letter = friend.name?.charAt(0)?.toUpperCase() || "#";
      if (!acc[letter]) acc[letter] = [];
      acc[letter].push(friend);
      return acc;
    }, {});
    return Object.keys(grouped)
      .sort()
      .map((key) => ({ title: key, data: grouped[key].sort((a: any, b: any) => a.name.localeCompare(b.name)) }));
  }, [friends]);

  // Search
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
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

  // Navigation
  const handleViewProfile = async (targetUser: any) => {
    try {
      const targetId = targetUser?.uuid || targetUser?.id;
      const response = await friendshipAPI.getUserById(targetId);
      const profile = normalizeUser(response?.data?.user || response?.user || targetUser);
      navigation.navigate("Profile", { user: profile, friends });
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải thông tin cá nhân");
    }
  };

  const openChatWithUser = (targetUser: any) => {
    navigation.navigate("Chat", { user: normalizeUser(targetUser) });
  };

  const openGroupChat = (conversation: any) => {
    navigation.navigate("Chat", {
      user: pickUserFromConversation(conversation, currentUserId),
      conversationId: conversation.id,
    });
  };

  // Friend actions
  const handleAcceptRequest = async (requestId: string) => {
    try { await friendshipAPI.acceptRequest(requestId); loadAll(); }
    catch { Alert.alert("Lỗi", "Không thể chấp nhận lời mời"); }
  };

  const handleRejectRequest = async (requestId: string) => {
    try { await friendshipAPI.rejectRequest(requestId); loadAll(); }
    catch { Alert.alert("Lỗi", "Không thể từ chối lời mời"); }
  };

  const handleCancelRequest = async (requestId: string) => {
    try { await friendshipAPI.cancelRequest(requestId); loadAll(); }
    catch { Alert.alert("Lỗi", "Không thể hủy lời mời"); }
  };

  const handleUnblock = async (userId: string) => {
    try { await friendshipAPI.unblockUser(userId); loadAll(); }
    catch { Alert.alert("Lỗi", "Không thể bỏ chặn người dùng"); }
  };

  // Group actions
  const handleCreateGroup = async () => {
    if (!groupName.trim()) { Alert.alert("Lỗi", "Vui lòng nhập tên nhóm"); return; }
    if (selectedMembers.length === 0) {
      Alert.alert("Thiếu thành viên", "Vui lòng chọn ít nhất một người bạn để thêm.", [{ text: "Đồng ý" }]);
      return;
    }
    try {
      setCreatingGroup(true);
      await conversationAPI.createGroup({ name: groupName.trim(), description: groupDescription.trim(), member_ids: selectedMembers });
      setGroupName(""); setGroupDescription(""); setSelectedMembers([]); setShowCreateGroupModal(false);
      loadAll();
      Alert.alert("Thành công", `Đã tạo nhóm "${groupName.trim()}" thành công!`);
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || error.message || "Không thể tạo nhóm.");
    } finally { setCreatingGroup(false); }
  };

  const toggleMemberSelection = (friendId: string) => {
    setSelectedMembers((prev) => prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]);
  };

  const handleGroupLongPress = (group: any) => { setSelectedGroup(group); setShowGroupInfoModal(true); };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    Alert.alert("Rời nhóm", `Bạn có chắc muốn rời khỏi nhóm "${selectedGroup.name}" không?`, [
      { text: "Hủy", style: "cancel" },
      { text: "Rời nhóm", style: "destructive", onPress: async () => {
        try { await conversationAPI.leaveGroup(selectedGroup.id); setShowGroupInfoModal(false); loadAll(); }
        catch { Alert.alert("Lỗi", "Không thể rời nhóm"); }
      }},
    ]);
  };

  const handleMuteGroup = () => { Alert.alert("Notification", "Mute feature coming soon"); setShowGroupInfoModal(false); };

  // Reusable row
  const renderUserRow = (item: any, actions?: React.ReactNode) => (
    <View className={`flex-row items-center p-3 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-50"}`}>
      <TouchableOpacity className="flex-row items-center flex-1" onPress={() => handleViewProfile(item)}>
        <View className="relative">
          <Image source={{ uri: item.avatarUrl || FALLBACK_AVATAR }} className="w-12 h-12 rounded-full" />
          {item.isOnline && <View className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 ${darkMode ? "border-gray-800" : "border-white"}`} />}
        </View>
        <View className="flex-1 ml-3">
          <Text className={`font-semibold text-base ${darkMode ? "text-gray-100" : "text-gray-900"}`}>{item.name || "Unknown"}</Text>
          {!!item.email && <Text className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{item.email}</Text>}
        </View>
      </TouchableOpacity>
      {actions}
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Search */}
      <View className={`${darkMode ? "bg-gray-900" : "bg-blue-500"} mt-9 px-4 py-5`}>
        <View className={`rounded-full px-4 py-3 flex-row items-center shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <Ionicons name="search" size={18} color="#0068FF" />
          <TextInput
            placeholder={isSearchMode ? "Tìm kiếm bằng email..." : "Tìm kiếm bạn bè..."}
            className={`flex-1 text-sm ml-3 ${darkMode ? "text-white" : "text-gray-700"}`}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setIsSearchMode(true)}
          />
          <TouchableOpacity className="ml-2" onPress={() => { setIsSearchMode(!isSearchMode); if (isSearchMode) { setSearchQuery(""); setSearchResults([]); } }}>
            <Ionicons name={isSearchMode ? "close" : "person-add-outline"} size={18} color="#0068FF" />
          </TouchableOpacity>
        </View>
        {isSearchMode && (
          <View className={`mt-2 rounded-lg shadow-lg max-h-60 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            {searchLoading ? (
              <View className="p-4 items-center"><Text className={darkMode ? "text-gray-300" : "text-gray-500"}>Searching...</Text></View>
            ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
              <View className="p-4 items-center"><Text className={darkMode ? "text-gray-300" : "text-gray-500"}>No users found</Text></View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item, i) => item.id || item.uuid || `${i}`}
                renderItem={({ item }) => renderUserRow(item,
                  <TouchableOpacity className="p-2" onPress={() => handleViewProfile(item)}>
                    <Ionicons name="chevron-forward" size={18} color="#0068FF" />
                  </TouchableOpacity>
                )}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View className={`border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <View className="flex-row">
          {([
            ["friends", `Bạn bè${friends.length ? ` (${friends.length})` : ""}`],
            ["requests", `Lời mời${receivedRequests.length ? ` (${receivedRequests.length})` : ""}`],
            ["sent", `Đã gửi${sentRequests.length ? ` (${sentRequests.length})` : ""}`],
            ["blocked", `Đã chặn${blockedUsers.length ? ` (${blockedUsers.length})` : ""}`],
            ["groups", `Nhóm${groups.length ? ` (${groups.length})` : ""}`],
          ] as const).map(([key, label]) => (
            <TouchableOpacity key={key} className={`flex-1 py-3 ${activeTab === key ? "border-b-2 border-blue-500" : ""}`} onPress={() => setActiveTab(key as any)}>
              <Text className={`text-center font-medium text-[12px] ${activeTab === key ? "text-blue-500" : (darkMode ? "text-gray-400" : "text-gray-500")}`}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Friends Tab */}
      {activeTab === "friends" && (
        <SectionList
          sections={groupedFriends}
          keyExtractor={(item, i) => item.id || item.uuid || `${i}`}
          renderSectionHeader={({ section }) => (
            <View className={`px-4 py-3 ${darkMode ? "bg-gray-800" : "bg-gray-100"}`}><Text className={`font-semibold text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{section.title}</Text></View>
          )}
          renderItem={({ item }) => renderUserRow(item,
            <View className="flex-row">
              <TouchableOpacity className="p-2" onPress={() => openChatWithUser(item)}>
                <Ionicons name="chatbubble-outline" size={20} color="#0068FF" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Requests Tab */}
      {activeTab === "requests" && (
        <FlatList
          data={receivedRequests}
          keyExtractor={(item, i) => item.friendshipId || item.uuid || `${i}`}
          ListEmptyComponent={<View className="flex-1 justify-center items-center py-20"><Ionicons name="person-add-outline" size={48} color={darkMode ? "#9CA3AF" : "#9CA3AF"} /><Text className={`${darkMode ? "text-gray-400" : "text-gray-500"} mt-3`}>Không có lời mời kết bạn nào</Text></View>}
          renderItem={({ item }) => renderUserRow(normalizeUser(item.from || {}), (
            <View className="flex-row">
              <TouchableOpacity className="px-3 py-1 bg-green-500 rounded-full mr-2" onPress={() => handleAcceptRequest(item.friendshipId)}>
                <Text className="text-white text-sm font-medium">Chấp nhận</Text>
              </TouchableOpacity>
              <TouchableOpacity className="px-3 py-1 bg-red-500 rounded-full" onPress={() => handleRejectRequest(item.friendshipId)}>
                <Text className="text-white text-sm font-medium">Từ chối</Text>
              </TouchableOpacity>
            </View>
          ))}
        />
      )}

      {/* Sent Tab */}
      {activeTab === "sent" && (
        <FlatList
          data={sentRequests}
          keyExtractor={(item, i) => item.friendshipId || item.uuid || `${i}`}
          ListEmptyComponent={<View className="flex-1 justify-center items-center py-20"><Ionicons name="paper-plane-outline" size={48} color={darkMode ? "#9CA3AF" : "#9CA3AF"} /><Text className={`${darkMode ? "text-gray-400" : "text-gray-500"} mt-3`}>Không có yêu cầu kết bạn đã gửi</Text></View>}
          renderItem={({ item }) => renderUserRow(normalizeUser(item.to || {}), (
            <TouchableOpacity className="px-3 py-1 bg-gray-500 rounded-full" onPress={() => handleCancelRequest(item.friendshipId)}>
              <Text className="text-white text-sm font-medium">Hủy yêu cầu</Text>
            </TouchableOpacity>
          ))}
        />
      )}

      {/* Blocked Tab */}
      {activeTab === "blocked" && (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item, i) => item.id || item.uuid || `${i}`}
          ListEmptyComponent={<View className="flex-1 justify-center items-center py-20"><Ionicons name="close-circle-outline" size={48} color={darkMode ? "#9CA3AF" : "#9CA3AF"} /><Text className={`${darkMode ? "text-gray-400" : "text-gray-500"} mt-3`}>Không có người dùng bị chặn</Text></View>}
          renderItem={({ item }) => renderUserRow(item, (
            <TouchableOpacity className="px-3 py-1 bg-green-500 rounded-full" onPress={() => handleUnblock(item.id)}>
              <Text className="text-white text-sm font-medium">Bỏ chặn</Text>
            </TouchableOpacity>
          ))}
        />
      )}

      {/* Groups Tab */}
      {activeTab === "groups" && (
        <View className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-white"}`}>
          <TouchableOpacity className={`flex-row items-center p-4 border-b ${darkMode ? "bg-blue-950/20 border-blue-900/30" : "bg-blue-50 border-blue-100"}`} onPress={() => setShowCreateGroupModal(true)}>
            <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center"><Ionicons name="add" size={24} color="white" /></View>
            <View className="flex-1 ml-3"><Text className={`font-medium ${darkMode ? "text-blue-400" : "text-blue-600"}`}>Tạo nhóm mới</Text><Text className={`text-sm ${darkMode ? "text-blue-300/70" : "text-blue-400"}`}>Tạo cuộc trò chuyện nhóm với bạn bè</Text></View>
            <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
          </TouchableOpacity>
          <FlatList
            data={groups}
            keyExtractor={(item, i) => item.id || item.uuid || `${i}`}
            ListEmptyComponent={<View className="flex-1 justify-center items-center py-20"><Ionicons name="people-outline" size={48} color={darkMode ? "#9CA3AF" : "#9CA3AF"} /><Text className={`${darkMode ? "text-gray-400" : "text-gray-500"} mt-3`}>Chưa tham gia nhóm nào</Text></View>}
            renderItem={({ item }) => (
              <TouchableOpacity className={`flex-row items-center p-3 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-50"}`} onPress={() => openGroupChat(item)} onLongPress={() => handleGroupLongPress(item)} delayLongPress={1500}>
                <Image source={{ uri: item.avatarUrl || FALLBACK_AVATAR }} className="w-12 h-12 rounded-full" />
                <View className="flex-1 ml-3"><Text className={`font-medium ${darkMode ? "text-gray-100" : "text-gray-800"}`}>{item.name}</Text><Text className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{item.members?.length || 0} thành viên</Text></View>
                <Ionicons name="chevron-forward" size={16} color={darkMode ? "#9CA3AF" : "#666"} />
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Create Group Modal */}
      <Modal visible={showCreateGroupModal} animationType="slide" transparent onRequestClose={() => setShowCreateGroupModal(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className={`rounded-t-3xl ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <View className={`flex-row items-center justify-between p-4 border-b pt-8 ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
              <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}><Text className="text-blue-500 font-medium">Hủy</Text></TouchableOpacity>
              <Text className={`font-semibold text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>Tạo nhóm mới</Text>
              <TouchableOpacity onPress={handleCreateGroup} disabled={creatingGroup || !groupName.trim()}>
                <Text className={`font-medium ${creatingGroup || !groupName.trim() ? (darkMode ? "text-gray-600" : "text-gray-300") : "text-blue-500"}`}>{creatingGroup ? "Đang tạo..." : "Tạo"}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="p-4 pb-8">
              <View className="mb-4">
                <Text className={`font-medium mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Tên nhóm</Text>
                <TextInput className={`border rounded-lg p-3 ${darkMode ? "border-gray-600 text-white bg-gray-700" : "border-gray-300 text-gray-800"}`} placeholder="Nhập tên nhóm" placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"} value={groupName} onChangeText={setGroupName} maxLength={50} />
              </View>
              <View className="mb-4">
                <Text className={`font-medium mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Mô tả (tùy chọn)</Text>
                <TextInput className={`border rounded-lg p-3 h-20 ${darkMode ? "border-gray-600 text-white bg-gray-700" : "border-gray-300 text-gray-800"}`} placeholder="Nhập mô tả nhóm" placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"} value={groupDescription} onChangeText={setGroupDescription} multiline maxLength={200} />
              </View>
              <View className="mb-4">
                <Text className={`font-medium mb-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Thêm thành viên</Text>
                {friends.length > 0 ? friends.map((friend) => (
                  <TouchableOpacity key={friend.id} className={`flex-row items-center p-3 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`} onPress={() => toggleMemberSelection(friend.id)}>
                    <Image source={{ uri: friend.avatarUrl || FALLBACK_AVATAR }} className="w-10 h-10 rounded-full" />
                    <View className="flex-1 ml-3"><Text className={`font-medium ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{friend.name}</Text></View>
                    <View className={`w-6 h-6 rounded-full border-2 ${selectedMembers.includes(friend.id) ? "bg-blue-500 border-blue-500" : (darkMode ? "border-gray-600" : "border-gray-300")}`}>
                      {selectedMembers.includes(friend.id) && <Ionicons name="checkmark" size={14} color="white" />}
                    </View>
                  </TouchableOpacity>
                )) : <Text className={`text-center py-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Chưa có bạn bè để thêm</Text>}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Group Info Modal */}
      <Modal visible={showGroupInfoModal} animationType="fade" transparent onRequestClose={() => setShowGroupInfoModal(false)}>
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className={`rounded-2xl w-11/12 max-w-sm mx-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}>
            <View className={`flex-row items-center justify-between p-4 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
              <TouchableOpacity onPress={() => setShowGroupInfoModal(false)}><Text className="text-blue-500 font-medium">Đóng</Text></TouchableOpacity>
              <Text className={`font-semibold text-lg ${darkMode ? "text-white" : "text-gray-900"}`}>Thông tin nhóm</Text>
              <View className="w-12" />
            </View>
            {selectedGroup && (
              <View className="p-4">
                <View className="items-center mb-4">
                  <Image source={{ uri: selectedGroup.avatarUrl || FALLBACK_AVATAR }} className="w-16 h-16 rounded-full mb-2" />
                  <Text className={`text-lg font-bold mb-1 ${darkMode ? "text-gray-100" : "text-gray-800"}`}>{selectedGroup.name}</Text>
                  <Text className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{selectedGroup.members?.length || 0} thành viên</Text>
                </View>
                <View className="space-y-2">
                  <TouchableOpacity className={`flex-row items-center justify-center p-3 rounded-lg ${darkMode ? "bg-blue-950/40" : "bg-blue-50"}`} onPress={() => { setShowGroupInfoModal(false); openGroupChat(selectedGroup); }}>
                    <Ionicons name="chatbubble-outline" size={18} color="#0068FF" /><Text className="text-blue-600 font-medium text-sm ml-2">Mở cuộc trò chuyện</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className={`flex-row items-center justify-center p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`} onPress={handleMuteGroup}>
                    <Ionicons name="notifications-off-outline" size={18} color={darkMode ? "#9CA3AF" : "#666"} /><Text className={`font-medium text-sm ml-2 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>Tắt thông báo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className={`flex-row items-center justify-center p-3 rounded-lg ${darkMode ? "bg-red-950/40" : "bg-red-50"}`} onPress={handleLeaveGroup}>
                    <Ionicons name="exit-outline" size={18} color="#EF4444" /><Text className="text-red-600 font-medium text-sm ml-2">Rời nhóm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ContactsScreen;