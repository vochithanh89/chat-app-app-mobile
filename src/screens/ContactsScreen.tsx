import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SectionList,
  SafeAreaView,
  TextInput,
  StatusBar,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { friendshipAPI } from "../services/api";

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

  const groups = [
    { id: "g1", name: "Nhóm Gia Đình", members: 5, avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=60&h=60&fit=crop&crop=face" },
    { id: "g2", name: "Nhóm Bạn Bè", members: 8, avatar: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=60&h=60&fit=crop&crop=face" },
    { id: "g3", name: "Nhóm Công Việc", members: 12, avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face" },
  ];

  // Tải data từ api
  useEffect(() => {
    loadFriends();
    loadReceivedRequests();
    loadSentRequests();
    loadBlockedUsers();
  }, []);

  // Cập nhật dữ liệu khi màn hình được hiển thị (sau khi điều hướng)
  useFocusEffect(
    React.useCallback(() => {
      loadFriends();
      loadReceivedRequests();
      loadSentRequests();
      loadBlockedUsers();
    }, [])
  );

  // Load danh sách bạn bè
  const loadFriends = async () => {
    try {
      const response = await friendshipAPI.getFriends();
      console.log('Friends API response:', response);
      const friendsData = response.data?.friends || response.data?.data?.friends || [];
      console.log('Friends data:', friendsData);
      if (friendsData.length > 0) {
        console.log('First friend structure:', friendsData[0]);
      }
      setFriends(Array.isArray(friendsData) ? friendsData : []);
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  // Load danh sách lời mời kết bạn đã nhận
  const loadReceivedRequests = async () => {
    try {
      console.log('Loading received requests...');
      const response = await friendshipAPI.getReceivedRequests();
      console.log('Received requests API response:', response);
      const requests = response.data?.requests || response.data?.data?.requests || [];
      console.log('Parsed received requests:', requests);
      setReceivedRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      console.error('Error loading requests:', error);
      setReceivedRequests([]);
    }
  };

  // Load danh sách lời mời đã gửi
  const loadSentRequests = async () => {
    try {
      console.log('Loading sent requests...');
      const response = await friendshipAPI.getSentRequests();
      console.log('Sent requests API response:', response);
      const requests = response.data?.requests || response.data?.data?.requests || [];
      console.log('Parsed sent requests:', requests);
      setSentRequests(Array.isArray(requests) ? requests : []);
    } catch (error) {
      console.error('Error loading sent requests:', error);
      setSentRequests([]);
    }
  };

  // Load danh sách người dùng đã chặn
  const loadBlockedUsers = async () => {
    try {
      console.log('Loading blocked users...');
      const response = await friendshipAPI.getBlockedUsers();
      console.log('Blocked users API response:', response);
      const blocked = response.data?.blocked || response.data?.data?.blocked || [];
      console.log('Parsed blocked users:', blocked);
      console.log('First blocked user structure:', blocked[0]);
      setBlockedUsers(Array.isArray(blocked) ? blocked : []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
      setBlockedUsers([]);
    }
  };

  // Chấp nhận lời mời kết bạn
  const handleAcceptRequest = async (requestId: string) => {
    try {
      await friendshipAPI.acceptRequest(requestId);
      loadReceivedRequests();
      loadFriends();
    } catch (error) {
      Alert.alert('Error', 'Failed to accept request');
    }
  };

  // Từ chối lời mời kết bạn
  const handleRejectRequest = async (requestId: string) => {
    try {
      await friendshipAPI.rejectRequest(requestId);
      loadReceivedRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to reject request');
    }
  };

  // Hủy lời mời kết bạn
  const handleCancelRequest = async (requestId: string) => {
    try {
      await friendshipAPI.cancelRequest(requestId);
      loadSentRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel request');
    }
  };

  // Bỏ chặn người dùng
  const handleUnblock = async (userUuid: string) => {
    try {
      console.log('Attempting to unblock user with UUID:', userUuid);
      const response = await friendshipAPI.unblockUser(userUuid);
      console.log('Unblock API response:', response);
      loadBlockedUsers();
      Alert.alert('Success', 'User unblocked successfully!');
    } catch (error) {
      console.error('Unblock error details:', error);
      console.error('Error response:', error.response);
      Alert.alert('Error', `Failed to unblock user: ${error.message || 'Unknown error'}`);
    }
  };

  // Khi focus vào ô tìm kiếm
  const handleSearchFocus = () => {
    setIsSearchMode(true);
  };

  // Khi blur khỏi ô tìm kiếm
  const handleSearchBlur = () => {
    if (!searchQuery) {
      setIsSearchMode(false);
    }
  };

  // Xử lý thay đổi trong ô tìm kiếm
  const handleSearchChange = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      console.log('Searching for:', query.trim());
      const response = await friendshipAPI.searchUsers(query.trim());
      console.log('Search API response:', response);
      const users = response.data?.users || response.data?.data?.users || [];
      console.log('Parsed users:', users);
      setSearchResults(Array.isArray(users) ? users : []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Gửi lời mời kết bạn
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
  const handleChatMessage = (friend: any) => {
    (navigation as any).navigate('Chat', { user: friend });
  };

  // Xem profile của người dùng
  const handleViewProfile = async (friend: any) => {
    try {
      console.log('Viewing profile for user:', friend.id);
      const response = await friendshipAPI.getUserById(friend.id);
      console.log('User profile response:', response);
      
      // Đi tới profilescreen với dữ liệu người dùng và danh sách bạn bè
      (navigation as any).navigate('Profile', { 
        user: response.data?.user || response.data, 
        friends: friends 
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load user profile');
    }
  };

  // Render kết quả tìm kiếm
  const renderSearchResult = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        className="flex-row items-center p-3 bg-white border-b border-gray-50"
        onPress={() => handleViewProfile(item)}
      >
        <View className="relative">
          <Image
            source={{ uri: item.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face" }}
            className="w-12 h-12 rounded-full"
          />
          {item.isOnline && (
            <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </View>
        <View className="flex-1 ml-3">
          <Text className="font-semibold text-base text-gray-900">{item.name || 'Unknown'}</Text>
        </View>
      </TouchableOpacity>
    );
  };

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

  const sections = Object.keys(groupedContacts)
    .sort()
    .map(letter => ({
      key: letter,
      title: letter,
      data: groupedContacts[letter]
    }));

  const renderContactItem = ({ item }: { item: any }) => (
    <View className="flex-row items-center p-3 bg-white border-b border-gray-50">
      <TouchableOpacity className="flex-row items-center flex-1" onPress={() => handleViewProfile(item)}>
        <View className="relative">
          <Image
            source={{ uri: item.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face" }}
            className="w-12 h-12 rounded-full"
          />
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
          source={{ uri: item.from?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face" }}
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
          source={{ uri: item.to?.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face" }}
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
    console.log('Blocked item structure:', item);
    console.log('Blocked user UUID (item.id):', item.id);
    console.log('Blocked user name:', item.name);
    
    return (
      <View key={item.id} className="flex-row items-center p-3 bg-white border-b border-gray-50">
        <View className="relative">
          <Image
            source={{ uri: item.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face" }}
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
            className={`flex-1 py-3 ${activeTab === 'friends' ? 'border-b-2 border-blue-500' : ''}`}
            onPress={() => setActiveTab('friends')}
          >
            <Text className={`text-center font-medium ${activeTab === 'friends' ? 'text-blue-500' : 'text-gray-500'}`}>
              Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 ${activeTab === 'requests' ? 'border-b-2 border-blue-500' : ''}`}
            onPress={() => setActiveTab('requests')}
          >
            <Text className={`text-center font-medium ${activeTab === 'requests' ? 'text-blue-500' : 'text-gray-500'}`}>
              Requests {receivedRequests.length > 0 && `(${receivedRequests.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 ${activeTab === 'sent' ? 'border-b-2 border-blue-500' : ''}`}
            onPress={() => setActiveTab('sent')}
          >
            <Text className={`text-center font-medium ${activeTab === 'sent' ? 'text-blue-500' : 'text-gray-500'}`}>
              Sent {sentRequests.length > 0 && `(${sentRequests.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 ${activeTab === 'blocked' ? 'border-b-2 border-blue-500' : ''}`}
            onPress={() => setActiveTab('blocked')}
          >
            <Text className={`text-center font-medium ${activeTab === 'blocked' ? 'text-blue-500' : 'text-gray-500'}`}>
              Blocked {blockedUsers.length > 0 && `(${blockedUsers.length})`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 ${activeTab === 'groups' ? 'border-b-2 border-blue-500' : ''}`}
            onPress={() => setActiveTab('groups')}
          >
            <Text className={`text-center font-medium ${activeTab === 'groups' ? 'text-blue-500' : 'text-gray-500'}`}>
              Groups
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
      ) : (
        <View className="flex-1 bg-white">
          {groups.map((group) => (
            <TouchableOpacity key={group.id} className="flex-row items-center p-3 bg-white border-b border-gray-50">
              <Image
                source={{ uri: group.avatar }}
                className="w-12 h-12 rounded-full"
              />
              <View className="flex-1 ml-3">
                <Text className="font-medium text-gray-800">{group.name}</Text>
                <Text className="text-sm text-gray-500">{group.members} thành viên</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      )}

    </SafeAreaView>
  );
};

export default ContactsScreen;
