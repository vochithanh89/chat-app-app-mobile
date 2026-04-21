import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { friendshipAPI } from "../services/api";
import { getExtraLargeAvatar } from "../utils/avatarUtils";

type RootStackParamList = {
  Profile: { user: any; friends: any[] };
  Chat: { user: any };
};

type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;
type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

const ProfileScreen = () => {
  const route = useRoute<ProfileScreenRouteProp>();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, friends: initialFriends } = route.params;
  const [showFriendMenu, setShowFriendMenu] = React.useState(false);
  const [friends, setFriends] = React.useState(initialFriends);
  const [requestSent, setRequestSent] = React.useState(false);
  const [isBlocked, setIsBlocked] = React.useState(false);

  const handleChat = () => {
    (navigation as any).navigate('Chat', { user });
  };

  const handleCall = () => {
    Alert.alert('Info', 'Voice call feature coming soon!');
  };

  const handleVideoCall = () => {
    Alert.alert('Info', 'Video call feature coming soon!');
  };

  // Check if user is already a friend
  const isAlreadyFriend = friends?.some((friend: any) => friend.id === user.id) || false;

  const handleAddFriend = async () => {
    try {
      console.log('Sending friend request to:', user.id);
      const response = await friendshipAPI.sendRequest(user.id);
      console.log('Send friend request response:', response);
      setRequestSent(true);
      Alert.alert('Thành công', 'Gửi yêu cầu kết bạn thành công!');
    } catch (error) {
      console.error('Send friend request error:', error);
      Alert.alert('Lỗi', 'Gửi yêu cầu kết bạn thất bại');
    }
  };

  const handleUnfriend = () => {
    Alert.alert(
      'Xóa liên quan',
      `Bạn có muốn xóa liên quan với ${user.name || 'Not'}?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Unfriending user:', user.id);
              const response = await friendshipAPI.unfriend(user.id);
              console.log('Unfriend response:', response);
              
              // Update local state to remove user from friends list
              setFriends(prevFriends => prevFriends.filter(friend => friend.id !== user.id));
              setShowFriendMenu(false);
              Alert.alert('Thành công', 'Xóa liên quan thành công!');
            } catch (error) {
              console.error('Unfriend error:', error);
              Alert.alert('Lỗi', 'Xóa liên quan thất bại');
            }
          },
        },
      ]
    );
  };

  const handleBlock = () => {
    Alert.alert(
      'Chặn người dùng',
      `Bạn có chắc chắn muốn chặn ${user.name || 'người dùng'}? Họ sẽ không thể nhận tin hay gửi yêu cầu kết bạn tới bạn và sẽ bị xóa kết bạn.`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Chặn',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Blocking user:', user.id);
              
              // First unfriend if they are friends
              if (isAlreadyFriend) {
                await friendshipAPI.unfriend(user.id);
                // Update local state to remove user from friends list
                setFriends(prevFriends => prevFriends.filter(friend => friend.id !== user.id));
              }
              
              // Then block the user
              const response = await friendshipAPI.blockUser(user.id);
              console.log('Block response:', response);
              
              setIsBlocked(true);
              setShowFriendMenu(false);
              Alert.alert('Thành công', 'Đã chặn người dùng và xóa kết bạn!');
            } catch (error) {
              console.error('Block error:', error);
              Alert.alert('Lỗi', 'Chặn người dùng thất bại');
            }
          },
        },
      ]
    );
  };

  const handleUnblock = () => {
    Alert.alert(
      'Bỏ chặn người dùng',
      `Bạn có muốn bỏ chặn ${user.name || 'người dùng'}?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Bỏ chặn',
          onPress: async () => {
            try {
              console.log('Unblocking user:', user.id);
              const response = await friendshipAPI.unblockUser(user.id);
              console.log('Unblock response:', response);
              
              setIsBlocked(false);
              Alert.alert('Thành công', 'Đã bỏ chặn người dùng!');
            } catch (error) {
              console.error('Unblock error:', error);
              Alert.alert('Lỗi', 'Bỏ chặn người dùng thất bại');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />
      
      {/* Header */}
      <View className="bg-blue-500 pt-12 pb-8 px-4">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity 
            className="mr-4"
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">Profile</Text>
        </View>
        
        {/* Profile Info */}
        <View className="items-center">
          <View className="relative mb-4">
            <Image
              source={{ 
                uri: user.avatarUrl || getExtraLargeAvatar(user.name)
              }}
              className="w-24 h-24 rounded-full border-4 border-white"
            />
            {user.isOnline && (
              <View className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white" />
            )}
          </View>
          
          <Text className="text-white text-2xl font-bold mb-2">
            {user.name || 'Unknown User'}
          </Text>
          
          <Text className="text-blue-100 text-base">
            {user.email || 'No email'}
          </Text>
          
          {/* Friendship Status Button */}
          {isBlocked ? (
            <View className="mt-3 px-4 py-2 bg-red-600 rounded-full flex-row items-center">
              <Ionicons name="close-circle" size={16} color="white" />
              <Text className="text-white text-sm font-medium ml-2">Blocked</Text>
            </View>
          ) : isAlreadyFriend ? (
            <View className="mt-3 relative">
              <TouchableOpacity 
                className="px-4 py-2 bg-blue-600 rounded-full flex-row items-center"
                onPress={() => setShowFriendMenu(!showFriendMenu)}
              >
                <Ionicons name="people" size={16} color="white" />
                <Text className="text-white text-sm font-medium ml-2">Friends</Text>
                <Ionicons name="chevron-down" size={14} color="white" className="ml-1" />
              </TouchableOpacity>
              
              {showFriendMenu && (
                <View className="absolute top-12 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <TouchableOpacity 
                    className="px-3 py-3 flex-row items-center justify-center border-b border-gray-100"
                    onPress={() => {
                      setShowFriendMenu(false);
                      handleUnfriend();
                    }}
                  >
                    <Ionicons name="person-remove" size={18} color="#EF4444" />
                    <Text className="text-red-500 ml-2 text-sm">Xóa kết bạn</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="px-3 py-3 flex-row items-center justify-start"
                    onPress={() => {
                      setShowFriendMenu(false);
                      isBlocked ? handleUnblock() : handleBlock();
                    }}
                  >
                    <Ionicons name={isBlocked ? "checkmark-circle" : "close-circle"} size={18} color="#EF4444" />
                    <Text className="text-red-500 ml-2 text-sm">{isBlocked ? 'Bỏ chặn' : 'Chặn'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : requestSent ? (
            <View className="mt-3 px-4 py-2 bg-gray-400 rounded-full flex-row items-center">
              <Ionicons name="time" size={16} color="white" />
              <Text className="text-white text-sm font-medium ml-2">Request Sent</Text>
            </View>
          ) : (
            <TouchableOpacity 
              className="mt-3 px-4 py-2 bg-green-500 rounded-full flex-row items-center"
              onPress={handleAddFriend}
            >
              <Ionicons name="person-add" size={16} color="white" />
              <Text className="text-white text-sm font-medium ml-2">Add Friend</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1">
        {/* Bio Section */}
        <View className="bg-white mx-4 mt-4 rounded-lg p-4 shadow-sm">
          <Text className="text-gray-700 font-semibold mb-2">About</Text>
          <Text className="text-gray-600">
            {user.bio || 'No bio available'}
          </Text>
        </View>

        {/* Actions */}
        <View className="bg-white mx-4 mt-4 rounded-lg shadow-sm">
          <TouchableOpacity 
            className="flex-row items-center justify-between p-4 border-b border-gray-100"
            onPress={handleChat}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="chatbubble-outline" size={20} color="#0068FF" />
              </View>
              <Text className="text-gray-800 font-medium">Send Message</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center justify-between p-4 border-b border-gray-100"
            onPress={handleCall}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="call-outline" size={20} color="#10B981" />
              </View>
              <Text className="text-gray-800 font-medium">Voice Call</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center justify-between p-4"
            onPress={handleVideoCall}
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-3">
                <Ionicons name="videocam-outline" size={20} color="#8B5CF6" />
              </View>
              <Text className="text-gray-800 font-medium">Video Call</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

              </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;
