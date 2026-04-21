import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { getMediumAvatar } from "../utils/avatarUtils";
import { conversationAPI, friendshipAPI } from "../services/api";

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
  
  // Real data states
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create group states
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);

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

  // Fetch conversations from API
  const fetchConversations = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    
    try {
      const response = await conversationAPI.getConversations();
      if (response.success && response.data?.conversations) {
        setConversations(response.data.conversations);
      } else {
        setConversations([]);
      }
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
    loadFriends();
  }, [fetchConversations]);

  // Load friends for group creation
  const loadFriends = async () => {
    try {
      const response = await friendshipAPI.getFriends();
      const friendsData = response.data?.friends || response.data?.data?.friends || [];
      setFriends(Array.isArray(friendsData) ? friendsData : []);
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    }
  };

  // Create group handler
  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert(
        'Thiếu thành viên',
        'Nhóm phải có ít nhất 2 người. Vui lòng chọn ít nhất một bạn bè để thêm vào nhóm.',
        [
          {
            text: 'OK',
            style: 'default',
          },
        ]
      );
      return;
    }

    try {
      setCreatingGroup(true);
      const groupData = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        member_ids: selectedMembers
      };
      
      const response = await conversationAPI.createGroup(groupData);
      
      // Reset form
      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      setShowCreateGroupModal(false);
      
      // Reload conversations
      fetchConversations();
      
      const totalMembers = selectedMembers.length + 1;
      Alert.alert('Thành công', `Đã tạo nhóm "${groupName.trim()}" với ${totalMembers} thành viên!`);
    } catch (error: any) {
      console.error('Error creating group:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo nhóm. Vui lòng thử lại.';
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setCreatingGroup(false);
    }
  };

  // Toggle member selection
  const toggleMemberSelection = (friendId: string) => {
    setSelectedMembers(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchConversations(true);
  }, [fetchConversations]);

  // Transform API conversation to UI format
  const transformConversation = (conv: any): any => {
    const isGroup = conv.type === 'group';
    
    // Get the other participant for direct messages
    let name = conv.name;
    let avatar = conv.avatarUrl;
    let online = false;
    
    if (!isGroup && conv.members) {
      // For direct messages, find the other user
      const otherMember = conv.members.find((m: any) => m.userId !== conv.currentUserId)?.user;
      if (otherMember) {
        name = otherMember.fullName || otherMember.username || 'Unknown';
        avatar = otherMember.avatarUrl || getMediumAvatar(name);
        online = otherMember.isOnline || false;
      }
    } else if (isGroup) {
      // For groups, use group name and avatar
      name = conv.name || 'Unnamed Group';
      avatar = conv.avatarUrl || getMediumAvatar(name);
    }

    // Format time
    let timeStr = '';
    if (conv.lastMessageAt) {
      const lastMsgDate = new Date(conv.lastMessageAt);
      const now = new Date();
      const diffMs = now.getTime() - lastMsgDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) timeStr = 'Just now';
      else if (diffMins < 60) timeStr = `${diffMins} min ago`;
      else if (diffHours < 24) timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      else if (diffDays < 7) timeStr = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
      else timeStr = lastMsgDate.toLocaleDateString();
    }

    return {
      id: conv.id,
      name: name || 'Unknown',
      lastMsg: conv.lastMessagePreview || 'No messages yet',
      time: timeStr,
      unread: conv.unreadCount || 0,
      avatar: avatar,
      online: online,
      isGroup: isGroup,
      pinned: false,
      typing: false,
      originalData: conv, // Keep original for navigation
    };
  };

  // Filter and transform conversations based on active tab
  const directMessages = conversations
    .filter((conv: any) => conv.type === 'direct')
    .map(transformConversation);

  const groupChats = conversations
    .filter((conv: any) => conv.type === 'group')
    .map(transformConversation);

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
      <ScrollView 
        className="flex-1 bg-gray-50" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* AI Assistant - Show on both tabs */}
        {renderAIAssistant()}
        
        {/* Tabs */}
        <View className="bg-white border-b border-gray-200">
          <View className="flex-row">
            <TouchableOpacity 
              className={activeTab === 'messages' ? 'flex-1 py-3 border-b-2 border-blue-500' : 'flex-1 py-3'}
              onPress={() => setActiveTab('messages')}
            >
              <Text className={`text-center font-medium ${activeTab === 'messages' ? 'text-blue-500' : 'text-gray-500'}`}>
                Direct Messages
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className={activeTab === 'groups' ? 'flex-1 py-3 border-b-2 border-blue-500' : 'flex-1 py-3'}
              onPress={() => setActiveTab('groups')}
            >
              <Text className={`text-center font-medium ${activeTab === 'groups' ? 'text-blue-500' : 'text-gray-500'}`}>
                Group Chats
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View className="flex-1 justify-center items-center py-10">
            <ActivityIndicator size="large" color="#0068FF" />
            <Text className="text-gray-500 mt-2">Loading conversations...</Text>
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <View className="flex-1 justify-center items-center py-10 px-4">
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text className="text-gray-500 mt-2 text-center">{error}</Text>
            <TouchableOpacity 
              className="mt-4 bg-blue-500 px-4 py-2 rounded-full"
              onPress={() => fetchConversations()}
            >
              <Text className="text-white font-medium">Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Create Group Button - Only in Group tab, before Empty State */}
        {!loading && !error && activeTab === 'groups' && (
          <TouchableOpacity 
            className="flex-row items-center p-4 bg-white border-b border-gray-50"
            onPress={() => setShowCreateGroupModal(true)}
          >
            <View className="w-12 h-12 rounded-full bg-blue-500 justify-center items-center mr-3">
              <Ionicons name="add" size={20} color="white" />
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-base text-gray-900">Create Group</Text>
              <Text className="text-sm text-gray-500">Start a group conversation</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Empty State */}
        {!loading && !error && conversations.length === 0 && (
          <View className="flex-1 justify-center items-center py-10 px-4">
            <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
            <Text className="text-gray-500 mt-2 text-center">No conversations yet</Text>
            <Text className="text-gray-400 text-sm mt-1 text-center">
              Start chatting with your friends!
            </Text>
          </View>
        )}

        {/* Content based on active tab */}
        {!loading && !error && (
          activeTab === 'messages' ? (
            <View>
              {directMessages.length === 0 ? (
                <View className="py-8 items-center">
                  <Text className="text-gray-400">No direct messages</Text>
                </View>
              ) : (
                directMessages.map((item) => (
                  <View key={item.id}>
                    {renderChatItem({ item })}
                  </View>
                ))
              )}
            </View>
          ) : (
            <View>
              {groupChats.map((item) => (
                <View key={item.id}>
                  {renderChatItem({ item })}
                </View>
              ))}
            </View>
          )
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
              <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
                <Text className="text-blue-500 font-medium">Hủy</Text>
              </TouchableOpacity>
              <Text className="font-semibold text-lg">Tạo nhóm mới</Text>
              <TouchableOpacity 
                onPress={handleCreateGroup}
                disabled={creatingGroup || !groupName.trim()}
              >
                <Text className={`font-medium ${creatingGroup || !groupName.trim() ? 'text-gray-300' : 'text-blue-500'}`}>
                  {creatingGroup ? 'Đang tạo...' : 'Tạo'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="p-4 pb-8">
              {/* Group Name */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Tên nhóm</Text>
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
                <Text className="text-gray-700 font-medium mb-2">Mô tả (tùy chọn)</Text>
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
                <Text className="text-gray-700 font-medium mb-2">Thêm thành viên</Text>
                {friends.length > 0 ? (
                  friends.map((friend) => (
                    <TouchableOpacity 
                      key={friend.id}
                      className="flex-row items-center p-3 border-b border-gray-100"
                      onPress={() => toggleMemberSelection(friend.id)}
                    >
                      <Image
                        source={{ uri: friend.avatarUrl || getMediumAvatar(friend.name) }}
                        className="w-10 h-10 rounded-full"
                      />
                      <View className="flex-1 ml-3">
                        <Text className="font-medium text-gray-800">{friend.name}</Text>
                      </View>
                      <View className={`w-6 h-6 rounded-full border-2 ${selectedMembers.includes(friend.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                        {selectedMembers.includes(friend.id) && (
                          <Ionicons name="checkmark" size={14} color="white" />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text className="text-gray-500 text-center py-4">Chưa có bạn bè nào để thêm vào nhóm</Text>
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
