import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Image, SectionList, SafeAreaView, TextInput, StatusBar, FlatList, Alert, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { friendshipAPI, conversationAPI } from "../services/api";
import { getMediumAvatar } from "../utils/avatarUtils";

const ContactsScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'sent' | 'blocked' | 'groups'>('friends');
  const [friends, setFriends] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Groups state
  const [groups, setGroups] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Tải data từ api
  useEffect(() => {
    loadFriends();
    loadReceivedRequests();
    loadSentRequests();
    loadBlockedUsers();
    loadGroups();
  }, []);

  // Cập nhật dữ liệu khi màn hình được hiển thị (sau khi điều hướng)
  useFocusEffect(
    React.useCallback(() => {
      loadFriends();
      loadReceivedRequests();
      loadSentRequests();
      loadBlockedUsers();
      loadGroups();
    }, [])
  );

  // Load danh sách bạn bè
  const loadFriends = async () => {
    try {
      const response = await friendshipAPI.getFriends();
      const friendsData = response.data?.friends || response.data?.data?.friends || [];
      setFriends(Array.isArray(friendsData) ? friendsData : []);
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const loadReceivedRequests = async () => {
    try {
      const response = await friendshipAPI.getReceivedRequests();
      const requests = response.data?.requests || response.data?.data?.requests || [];
      setReceivedRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      console.error('Error loading requests:', error);
      setReceivedRequests([]);
    }
  };

  const loadSentRequests = async () => {
    try {
      const response = await friendshipAPI.getSentRequests();
      const requests = response.data?.requests || response.data?.data?.requests || [];
      setSentRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      console.error('Error loading sent requests:', error);
      setSentRequests([]);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      const response = await friendshipAPI.getBlockedUsers();
      const blocked = response.data?.blocked || response.data?.data?.blocked || [];
      setBlockedUsers(Array.isArray(blocked) ? blocked : []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      setBlockedUsers([]);
    }
  };

  const loadGroups = async () => {
    try {
      const response = await conversationAPI.getConversations();
      const groupsData = response.data?.conversations || response.data?.data?.conversations || [];
      const groupConversations = Array.isArray(groupsData) ? groupsData.filter(conv => conv.type === 'group') : [];
      setGroups(groupConversations);
    } catch (error) {
      console.error('Error loading groups:', error);
      setGroups([]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter group name');
      return;
    }

    if (selectedMembers.length === 0) {
      Alert.alert(
        'Missing Members',
        'Group must have at least 2 people. Please select at least one friend to add to the group.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    createGroupWithMembers();
  };

  const createGroupWithMembers = async () => {
    try {
      setCreatingGroup(true);
      const groupData = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        member_ids: selectedMembers
      };

      console.log('Creating group with data:', groupData);
      const response = await conversationAPI.createGroup(groupData);

      setGroupName('');
      setGroupDescription('');
      setSelectedMembers([]);
      setShowCreateGroupModal(false);

      loadGroups();

      const totalMembers = selectedMembers.length + 1; 
      Alert.alert('Success', `Created group "${groupName.trim()}" with ${totalMembers} members!`);
    } catch (error) {
      console.error('Error creating group:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Cannot create group. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleMemberSelection = (friendId: string) => {
    setSelectedMembers(prev => prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]);
  };

  const handleGroupPress = (group: any) => {
    (navigation as any).navigate('Chat', { user: { ...group, isGroup: true, name: group.name, avatar: group.avatarUrl || getMediumAvatar(group.name) } });
  };

  const handleGroupLongPress = (group: any) => {
    setSelectedGroup(group);
    setShowGroupInfoModal(true);
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave the group "${selectedGroup.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave Group',
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationAPI.leaveGroup(selectedGroup.id);
              setShowGroupInfoModal(false);
              loadGroups();
              Alert.alert('Success', 'Left the group');
            } catch (error) {
              console.error('Error leaving group:', error);
              Alert.alert('Error', 'Cannot leave group');
            }
          },
        },
      ]
    );
  };

  const handleMuteGroup = () => {
    Alert.alert('Notification', 'Mute notifications feature will be implemented later');
    setShowGroupInfoModal(false);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friendshipAPI.acceptRequest(requestId);
      loadReceivedRequests();
      loadFriends();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendshipAPI.rejectRequest(requestId);
      loadReceivedRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await friendshipAPI.cancelRequest(requestId);
      loadSentRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel request');
    }
  };

  const handleUnblock = async (userUuid: string) => {
    try {
      const response = await friendshipAPI.unblockUser(userUuid);
      loadBlockedUsers();
      Alert.alert('Success', 'User unblocked successfully!');
    } catch (error) {
      console.error('Unblock error details:', error);
      console.error('Error response:', error.response);
      Alert.alert('Error', `Failed to unblock user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSearchFocus = () => setIsSearchMode(true);

  const handleSearchBlur = () => { if (!searchQuery) setIsSearchMode(false); };

  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const response = await friendshipAPI.searchUsers(query.trim());
      const users = response.data?.users || response.data?.data?.users || [];
      setSearchResults(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Gửi lời mời kết bạn (đã comment)
  // const handleSendFriendRequest = async (userId: string) => {
  //   try {
  //     console.log('Sending friend request to user ID:', userId);
  //     const response = await friendshipAPI.sendRequest(userId);
  //     console.log('Send friend request response:', response);
  //     Alert.alert('Success', 'Friend request sent!');
  //     setSearchQuery('');
  //     setSearchResults([]);
  //     setIsSearchMode(false);
  //     loadReceivedRequests();
  //   } catch (error) {
  //     console.error('Send friend request error:', error);
  //     Alert.alert('Error', 'Failed to send friend request');
  //   }
  // };

  // Chat với người dùng
  const handleChatMessage = (friend: any) => (navigation as any).navigate('Chat', { user: friend });

  // Xem profile của người dùng
  const handleViewProfile = async (friend: any) => {
    try {
      const response = await friendshipAPI.getUserById(friend.id);
      // Đi tới profilescreen với dữ liệu người dùng và danh sách bạn bè
      (navigation as any).navigate('Profile', { user: response.data?.user || response.data, friends: friends });
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    }
  };

  // Render kết quả tìm kiếm
  const renderSearchResult = ({ item }: { item: any }) => (
    <TouchableOpacity className="flex-row items-center p-3 bg-white border-b border-gray-50" onPress={() => handleViewProfile(item)}>
      <View className="relative">
        <Image source={{ uri: item.avatarUrl || getMediumAvatar(item.name) }} className="w-12 h-12 rounded-full" />
        {item.isOnline && (
          <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-semibold text-base text-gray-900">{item.name || 'Unknown'}</Text>
      </View>
    </TouchableOpacity>
  );

  // Sắp xếp danh sách bạn bè theo thứ tự alphabet
  const friendsArray = Array.isArray(friends) ? friends : [];
  const groupedContacts = friendsArray.reduce((acc, contact) => {
    const firstLetter = contact.name?.charAt(0).toUpperCase() || 'Unknown';
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(contact);
    return acc;
  }, {} as Record<string, typeof friends>);

  const sections = Object.keys(groupedContacts).sort().map(letter => ({
    key: letter,
    title: letter,
    data: groupedContacts[letter]
  }));

  const renderContactItem = ({ item }: { item: any }) => (
    <View className="flex-row items-center p-3 bg-white border-b border-gray-50">
      <TouchableOpacity className="flex-row items-center flex-1" onPress={() => handleViewProfile(item)}>
        <View className="relative">
          <Image source={{ uri: item.avatarUrl || getMediumAvatar(item.name) }} className="w-12 h-12 rounded-full" />
          {item.isOnline && (
            <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-semibold text-base text-gray-900">{item.name || 'Unknown'}</Text>
          <Text className="text-sm text-gray-500">{item.email || ''}</Text>
        </View>
      </TouchableOpacity>
      <View className="flex-row items-center">
        <TouchableOpacity className="p-2">
          <Ionicons name="call-outline" size={20} color="#0068FF" />
        </TouchableOpacity>
        <TouchableOpacity className="p-2">
          <Ionicons name="videocam-outline" size={20} color="#0068FF" />
        </TouchableOpacity>
        <TouchableOpacity className="p-2" onPress={() => handleChatMessage(item)}>
          <Ionicons name="chatbubble-outline" size={20} color="#0068FF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRequestItem = ({ item }: { item: any }) => (
    <View key={item.id} className="flex-row items-center p-3 bg-white border-b border-gray-50">
      <View className="relative">
        <Image
          source={{ uri: item.from?.avatarUrl || getMediumAvatar(item.from?.name) }}
          className="w-12 h-12 rounded-full"
        />
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-semibold text-base text-gray-900">{item.from?.name || 'Unknown'}</Text>
        <Text className="text-sm text-gray-500">Friend request</Text>
      </View>
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
    </View>
  );

  const renderSentRequestItem = ({ item }: { item: any }) => (
    <View key={item.id} className="flex-row items-center p-3 bg-white border-b border-gray-50">
      <View className="relative">
        <Image
          source={{ uri: item.to?.avatarUrl || getMediumAvatar(item.to?.name) }}
          className="w-12 h-12 rounded-full"
        />
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-semibold text-base text-gray-900">{item.to?.name || 'Unknown'}</Text>
        <Text className="text-sm text-gray-500">Request sent</Text>
      </View>
      <TouchableOpacity
        className="px-3 py-1 bg-gray-500 rounded-full"
        onPress={() => handleCancelRequest(item.friendshipId)}
      >
        <Text className="text-white text-sm font-medium">Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBlockedItem = ({ item }: { item: any }) => {
    return (
      <View key={item.id} className="flex-row items-center p-3 bg-white border-b border-gray-50">
        <View className="relative">
          <Image
            source={{ uri: item.avatarUrl || getMediumAvatar(item.name) }}
            className="w-12 h-12 rounded-full"
          />
          <View className="absolute bottom-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-semibold text-base text-gray-900">{item.name || 'Unknown'}</Text>
          <Text className="text-sm text-red-500">Blocked</Text>
        </View>
        <TouchableOpacity
          className="px-3 py-1 bg-green-500 rounded-full"
          onPress={() => handleUnblock(item.id)}
        >
          <Text className="text-white text-sm font-medium">Unblock</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View className="bg-gray-100 px-4 py-3">
      <Text className="font-semibold text-sm text-gray-700">{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-500 mt-9 px-4 py-5">
        {/* Search bar with inline search */}
        <View className="bg-white rounded-full px-4 py-3 flex-row items-center shadow-sm">
          <Ionicons name="search" size={18} color="#0068FF" className="mr-3" />
          <TextInput
            placeholder={isSearchMode ? "Search users by email..." : "Search friends, contacts..."}
            className="flex-1 text-sm text-gray-700"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {isSearchMode ? (
            <TouchableOpacity
              className="ml-2"
              onPress={() => {
                setIsSearchMode(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
            >
              <Ionicons name="close" size={18} color="#0068FF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity className="ml-2" onPress={handleSearchFocus}>
              <Ionicons name="person-add-outline" size={18} color="#0068FF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search results dropdown */}
        {isSearchMode && (
          <View className="mt-2 bg-white rounded-lg shadow-lg max-h-60">
            {searchLoading ? (
              <View className="p-4 justify-center items-center">
                <Text className="text-gray-500">Searching...</Text>
              </View>
            ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
              <View className="p-4 justify-center items-center">
                <Text className="text-gray-500">No users found</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.uuid || item.id}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row">
          <TouchableOpacity
            className={activeTab === 'friends' ? 'flex-1 py-3 border-b-2 border-blue-500' : 'flex-1 py-3'}
            onPress={() => setActiveTab('friends')}
          >
            <Text className={`text-center font-medium ${activeTab === 'friends' ? 'text-blue-500' : 'text-gray-500'}`}>
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={activeTab === 'requests' ? 'flex-1 py-3 border-b-2 border-blue-500' : 'flex-1 py-3'}
            onPress={() => setActiveTab('requests')}
          >
            <Text className={`text-center font-medium ${activeTab === 'requests' ? 'text-blue-500' : 'text-gray-500'}`}>
              {receivedRequests.length > 0 ? `Requests (${receivedRequests.length})` : 'Requests'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={activeTab === 'sent' ? 'flex-1 py-3 border-b-2 border-blue-500' : 'flex-1 py-3'}
            onPress={() => setActiveTab('sent')}
          >
            <Text className={`text-center font-medium ${activeTab === 'sent' ? 'text-blue-500' : 'text-gray-500'}`}>
              {sentRequests.length > 0 ? `Sent (${sentRequests.length})` : 'Sent'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={activeTab === 'blocked' ? 'flex-1 py-3 border-b-2 border-blue-500' : 'flex-1 py-3'}
            onPress={() => setActiveTab('blocked')}
          >
            <Text className={`text-center font-medium ${activeTab === 'blocked' ? 'text-blue-500' : 'text-gray-500'}`}>
              {blockedUsers.length > 0 ? `Blocked (${blockedUsers.length})` : 'Blocked'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={activeTab === 'groups' ? 'flex-1 py-3 border-b-2 border-blue-500' : 'flex-1 py-3'}
            onPress={() => setActiveTab('groups')}
          >
            <Text className={`text-center font-medium ${activeTab === 'groups' ? 'text-blue-500' : 'text-gray-500'}`}>
              {groups.length > 0 ? `Groups (${groups.length})` : 'Groups'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'friends' ? (
        <SectionList
          sections={sections}
          renderItem={renderContactItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={true}
          className="flex-1"
        />
      ) : activeTab === 'requests' ? (
        <View className="flex-1 bg-white">
          {receivedRequests.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Ionicons name="person-add-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-3">No friend requests</Text>
            </View>
          ) : (
            <FlatList
              data={receivedRequests}
              renderItem={renderRequestItem}
              keyExtractor={(item, index) => item.id || item.requestId || `request-${index}`}
            />
          )}
        </View>
      ) : activeTab === 'sent' ? (
        <View className="flex-1 bg-white">
          {sentRequests.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Ionicons name="paper-plane-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-3">No sent requests</Text>
            </View>
          ) : (
            <FlatList
              data={sentRequests}
              renderItem={renderSentRequestItem}
              keyExtractor={(item, index) => item.id || item.requestId || `sent-${index}`}
            />
          )}
        </View>
      ) : activeTab === 'blocked' ? (
        <View className="flex-1 bg-white">
          {blockedUsers.length === 0 ? (
            <View className="flex-1 justify-center items-center">
              <Ionicons name="close-circle-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-3">No blocked users</Text>
            </View>
          ) : (
            <FlatList
              data={blockedUsers}
              renderItem={renderBlockedItem}
              keyExtractor={(item, index) => item.id || item.blockId || `blocked-${index}`}
            />
          )}
        </View>
      ) : activeTab === 'groups' ? (
        <View className="flex-1 bg-white">
          {/* Create Group Button */}
          <TouchableOpacity
            className="flex-row items-center p-4 bg-blue-50 border-b border-blue-100"
            onPress={() => setShowCreateGroupModal(true)}
          >
            <View className="w-12 h-12 bg-blue-500 rounded-full items-center justify-center">
              <Ionicons name="add" size={24} color="white" />
            </View>
            <View className="flex-1 ml-3">
              <Text className="font-medium text-blue-600">Create Group</Text>
              <Text className="text-sm text-blue-400">Create group chat with friends</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
          </TouchableOpacity>

          {/* Groups List */}
          {groups.length > 0 ? (
            groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                className="flex-row items-center p-3 bg-white border-b border-gray-50"
                onPress={() => handleGroupPress(group)}
                onLongPress={() => handleGroupLongPress(group)}
                delayLongPress={1500}
              >
                <Image
                  source={{ uri: group.avatarUrl || getMediumAvatar(group.name) }}
                  className="w-12 h-12 rounded-full"
                />
                <View className="flex-1 ml-3">
                  <Text className="font-medium text-gray-800">{group.name}</Text>
                  <Text className="text-sm text-gray-500">
                    {group.members?.length || 0} members
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#666" />
              </TouchableOpacity>
            ))
          ) : (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text className="text-gray-500 mt-3">No groups yet</Text>
              <Text className="text-gray-400 text-sm mt-1">Press "Create New Group" to start</Text>
            </View>
          )}
        </View>
      ) : null}

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
                <Text className="text-blue-500 font-medium">Cancel</Text>
              </TouchableOpacity>
              <Text className="font-semibold text-lg">Create New Group</Text>
              <TouchableOpacity
                onPress={handleCreateGroup}
                disabled={creatingGroup || !groupName.trim()}
              >
                <Text className={`font-medium ${creatingGroup || !groupName.trim() ? 'text-gray-300' : 'text-blue-500'}`}>
                  {creatingGroup ? 'Creating...' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="p-4 pb-8">
              {/* Group Name */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Group Name</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-gray-800"
                  placeholder="Enter group name"
                  value={groupName}
                  onChangeText={setGroupName}
                  maxLength={50}
                />
              </View>

              {/* Group Description */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Description (optional)</Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-gray-800 h-20"
                  placeholder="Enter group description"
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  multiline
                  maxLength={200}
                />
              </View>

              {/* Select Members */}
              <View className="mb-4">
                <Text className="text-gray-700 font-medium mb-2">Add Members</Text>
                {friends.length > 0 ? (
                  friends.map((friend) => (
                    <TouchableOpacity
                      key={friend.id}
                      className="flex-row items-center p-3 border-b border-gray-100"
                      onPress={() => toggleMemberSelection(friend.id)}
                    >
                      <Image
                        source={{ uri: friend.avatarUrl || 'https://via.placeholder.com/40' }}
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
                  <Text className="text-gray-500 text-center py-4">No friends to add to group</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Group Info Modal */}
      <Modal
        visible={showGroupInfoModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowGroupInfoModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-11/12 max-w-sm mx-4">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
              <TouchableOpacity onPress={() => setShowGroupInfoModal(false)}>
                <Text className="text-blue-500 font-medium">Close</Text>
              </TouchableOpacity>
              <Text className="font-semibold text-lg">Group Info</Text>
              <View className="w-12" />
            </View>

            {selectedGroup && (
              <View className="p-4">
                {/* Group Info */}
                <View className="items-center mb-4">
                  <Image
                    source={{ uri: selectedGroup.avatarUrl || getMediumAvatar(selectedGroup.name) }}
                    className="w-16 h-16 rounded-full mb-2"
                  />
                  <Text className="text-lg font-bold text-gray-800 mb-1">{selectedGroup.name}</Text>
                  {selectedGroup.description && (
                    <Text className="text-gray-500 text-center mb-1 text-sm">{selectedGroup.description}</Text>
                  )}
                  <Text className="text-xs text-gray-500">
                    {selectedGroup.members?.length || 0} members
                  </Text>
                </View>

                {/* Actions */}
                <View className="space-y-2">
                  <TouchableOpacity
                    className="flex-row items-center justify-center p-3 bg-blue-50 rounded-lg"
                    onPress={() => {
                      setShowGroupInfoModal(false);
                      handleGroupPress(selectedGroup);
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#0068FF" className="mr-2" />
                    <Text className="text-blue-600 font-medium text-sm">Open Chat</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center justify-center p-3 bg-gray-50 rounded-lg"
                    onPress={handleMuteGroup}
                  >
                    <Ionicons name="notifications-off-outline" size={18} color="#666" className="mr-2" />
                    <Text className="text-gray-700 font-medium text-sm">Mute Notifications</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-row items-center justify-center p-3 bg-red-50 rounded-lg"
                    onPress={handleLeaveGroup}
                  >
                    <Ionicons name="exit-outline" size={18} color="#EF4444" className="mr-2" />
                    <Text className="text-red-600 font-medium text-sm">Leave Group</Text>
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
