import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StatusBar,
  FlatList,
  Alert,
  Modal,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { friendshipAPI, conversationAPI } from "../services/api";
import { getLargeAvatar, getMediumAvatar } from "../utils/avatarUtils";
import { useAuth } from "../contexts/AuthContext";

const GroupOptionsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { group } = route.params as { group: any };
  const auth = useAuth();
  const currentUser = auth.user?.user;

  // Ẩn tab bar khi vào GroupOptionsScreen
    useFocusEffect(
      useCallback(() => {
        const tabNavigator = navigation.getParent() as any;
        if (tabNavigator) {
          tabNavigator.setOptions({
            tabBarStyle: { display: 'none' }
          });
        }
        
        return () => {
          // Hiện lại tab bar khi rời khỏi GroupOptionsScreen
          if (tabNavigator) {
            tabNavigator.setOptions({
              tabBarStyle: { display: 'flex' }
            });
          }
        };
      }, [navigation])
    );

    // Thêm useEffect để đảm bảo tab bar được ẩn
    useEffect(() => {
      const unsubscribe = navigation.addListener('focus', () => {
        const tabNavigator = navigation.getParent() as any;
        if (tabNavigator) {
          tabNavigator.setOptions({
            tabBarStyle: { display: 'none' }
          });
        }
      });

      const unsubscribeBlur = navigation.addListener('blur', () => {
        const tabNavigator = navigation.getParent() as any;
        if (tabNavigator) {
          tabNavigator.setOptions({
            tabBarStyle: { display: 'flex' }
          });
        }
      });

      return () => {
        unsubscribe();
        unsubscribeBlur();
      };
    }, [navigation]);

  const [groupMembers, setGroupMembers] = useState([]);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedFriendsToAdd, setSelectedFriendsToAdd] = useState([]);
  const [addingMembers, setAddingMembers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-render state
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(group); // Store current group data
  const [avatarTimestamp, setAvatarTimestamp] = useState(Date.now()); // For cache busting

  // Load group members and friends
  useEffect(() => {
    loadGroupDetails();
    loadFriends();
  }, []);

  const loadGroupDetails = async () => {
    try {
      // Always try to get fresh data from API
      const response = await conversationAPI.getConversationById(group.id);
      
      // Try different possible response structures
      let members = [];
      let updatedGroup = null;
      
      if (response.data?.conversation) {
        members = response.data.conversation.members || [];
        updatedGroup = response.data.conversation;
      } else if (response.data?.members) {
        members = response.data.members;
        updatedGroup = response.data;
      } else if (response.data?.data?.members) {
        members = response.data.data.members;
        updatedGroup = response.data.data;
      }
      
      // Always use API data if available
      if (members.length > 0) {
        setGroupMembers(members);
      } else {
        // Only use fallback if API completely fails
        if (group.members) {
          setGroupMembers(group.members);
        } else {
          setGroupMembers([]);
        }
      }
      
      // Update currentGroup with fresh data including avatar
      if (updatedGroup) {
        setCurrentGroup(updatedGroup);
      }
    } catch (error) {
      console.error('Error loading group details:', error);
      // Only use fallback on API error
      if (group.members) {
        setGroupMembers(group.members);
      } else {
        setGroupMembers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await friendshipAPI.getFriends();
      const friendsData = response.data?.friends || response.data?.data?.friends || [];
      setFriends(Array.isArray(friendsData) ? friendsData : []);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  // Toggle friend selection for adding to group
  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendsToAdd(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  // Add selected friends to group
  const handleAddMembers = async () => {
    if (selectedFriendsToAdd.length === 0) {
      Alert.alert('Notification', 'Please select at least one friend to add to the group');
      return;
    }

    try {
      setAddingMembers(true);
      await conversationAPI.addMembers(group.id, selectedFriendsToAdd);
      
      // Reset selection and close modal
      setSelectedFriendsToAdd([]);
      setShowAddMembersModal(false);
      
      // Reload group members
      loadGroupDetails();
      
      Alert.alert('Success', `Added ${selectedFriendsToAdd.length} members to the group`);
    } catch (error) {
      console.error('Error adding members:', error);
      Alert.alert('Error', 'Cannot add members to the group');
    } finally {
      setAddingMembers(false);
    }
  };

  // Get friends that are not already in group
  const getAvailableFriends = () => {
    const groupMemberIds = groupMembers.map(member => member.user?.id || member.id);
    return friends.filter(friend => !groupMemberIds.includes(friend.id));
  };

  // Remove member from group
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    console.log('handleRemoveMember called with:', { memberId, memberName, groupId: group.id });
    
    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove "${memberName}" from the group?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationAPI.removeMember(group.id, memberId);
              await loadGroupDetails();
              Alert.alert('Success', 'Member removed from group');
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Error', 'Cannot remove member');
            }
          },
        },
      ]
    );
  };

  // Update member role
  const handleUpdateRole = async (memberId: string, newRole: string, memberUuid?: string) => {
    try {
      // Check if current user is owner and transferring ownership to someone else
      const currentUserId = currentUser?.id;
      const isOwnerTransferring = isCurrentUserOwner() && newRole === 'owner' && memberId !== currentUserId;
      
      if (isOwnerTransferring) {
        // Owner is transferring ownership to someone else - use transferOwnership API with UUID
        if (!memberUuid) {
          throw new Error('Member UUID is required for ownership transfer');
        }
        await conversationAPI.transferOwnership(group.id, memberUuid);
        await loadGroupDetails();
        // Force re-render by updating a dummy state
        setRefreshKey(prev => prev + 1);
        Alert.alert('Success', 'Group ownership transferred');
      } else {
        // Normal role update (admin/member)
        await conversationAPI.updateMemberRole(group.id, memberId, newRole);
        await loadGroupDetails();
        // Force re-render by updating a dummy state
        setRefreshKey(prev => prev + 1);
        Alert.alert('Success', 'Member role updated');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Error', 'Cannot update role');
    }
  };

  // Delete group
  const handleDeleteGroup = () => {
    Alert.alert(
      'Disband Group',
      `Are you sure you want to disband the group "${group.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Disband',
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationAPI.disbandGroup(group.id);
              // Navigate back to main tabs (Groups/Contacts) - go back 2 levels: GroupOptions -> Chat -> Main
              navigation.goBack(); // Go back to ChatScreen
              navigation.goBack(); // Go back to Main tabs
              Alert.alert('Success', 'Group disbanded');
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Error', 'Cannot disband group');
            }
          },
        },
      ]
    );
  };

  // Handle avatar update
  const handleUpdateAvatar = async () => {
    // Check if current user is owner or admin
    if (!isCurrentUserOwner() && !isCurrentUserAdmin()) {
      Alert.alert('Permission Denied', 'Only group owners and admins can update the group avatar.');
      return;
    }

    // Request permission and launch image picker
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Please grant permission to access your photo library to update the group avatar.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      
      // Create form data for API
      const formData = new FormData();
      formData.append('avatar', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'group_avatar.jpg',
      } as any);

      try {
        setUpdatingAvatar(true);
        await conversationAPI.updateGroupAvatar(group.id, formData);
        
        // Reload group details to get updated avatar
        await loadGroupDetails();
        
        // Update timestamp to force image reload
        setAvatarTimestamp(Date.now());
        
        Alert.alert('Success', 'Group avatar updated successfully!');
      } catch (error) {
        console.error('Error updating avatar:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to update group avatar';
        Alert.alert('Error', errorMessage);
      } finally {
        setUpdatingAvatar(false);
      }
    }
  };

  // Check if current user is owner
  const isCurrentUserOwner = () => {
    const currentUserId = currentUser?.id;
    return groupMembers.some(member => {
      const memberId = member.user?.id || member.id;
      const memberRole = member.role;
      return memberId === currentUserId && memberRole === 'owner';
    });
  };

  // Check if current user is admin (but not owner)
  const isCurrentUserAdmin = () => {
    const currentUserId = currentUser?.id;
    return groupMembers.some(member => {
      const memberId = member.user?.id || member.id;
      const memberRole = member.role;
      return memberId === currentUserId && memberRole === 'admin';
    });
  };

  // Leave group
  const handleLeaveGroup = () => {
    // Check current user's actual role in the group (not cached)
    const currentUserId = currentUser?.id;
    const currentUserRole = groupMembers.find(member => {
      const memberId = member.user?.id || member.id;
      return memberId === currentUserId;
    })?.role;

    // Check if current user is owner
    if (currentUserRole === 'owner') {
      // Find other members who can be new owner
      const otherMembers = groupMembers.filter(member => {
        const memberId = member.user?.id || member.id;
        const currentUserId = currentUser?.id;
        return memberId !== currentUserId;
      });

      if (otherMembers.length === 0) {
        Alert.alert(
          'Cannot Leave Group',
          'You are the only member in this group. Please disband the group instead of leaving.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Show message about transferring ownership - DO NOT allow leaving group
      Alert.alert(
        'Leave Group',
        'You are the group owner. You must transfer group ownership to another member before leaving the group.\n\nPlease go to the member list to select a new group owner.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Go to Member List',
            onPress: () => {
              // Scroll to members section
              // For now, just show instruction
              Alert.alert(
                'Guide',
                'Scroll up to the member list, tap the settings icon (gear icon) next to the member you want to transfer ownership to, then select "Owner".\n\nAfter transferring ownership, you can leave the group.'
              );
            },
          },
        ]
      );
      return; // IMPORTANT: Return here to prevent API call
    } else {
      // Regular member leave group
      Alert.alert(
        'Leave Group',
        `Are you sure you want to leave the group "${group.name}"?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Leave Group',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await conversationAPI.leaveGroup(group.id);
                
                // Navigate back to Contacts screen (goBack 2 levels: GroupOptions -> Chat -> ContactsMain)
                navigation.goBack();
                navigation.goBack();
                Alert.alert('Success', 'Left the group');
              } catch (error) {
                console.error('Error leaving group:', error);
                // Show specific error message
                const errorMessage = error.response?.data?.message || error.message || 'Cannot leave group';
                Alert.alert('Error', errorMessage);
              }
            },
          },
        ]
      );
    }
  };

  // Render member item
  const renderMemberItem = ({ item }: { item: any }) => {
    // Handle different data structures
    const memberName = item.name || item.user?.name || item.username || 'Unknown User';
    const memberAvatar = item.avatarUrl || item.user?.avatarUrl || item.avatar;
    const memberId = item.id || item.user?.id || item.userId;
    const memberUuid = item.user?.id || item.uuid || item.id; // user.id is actually UUID per backend serialization
    const memberRole = item.role || 'member';

    // Get current user ID from top level
    const currentUserId = currentUser?.id;
    const isCurrentUser = memberId === currentUserId;
    const isOwner = memberRole === 'owner';
    const isAdmin = memberRole === 'admin';

    // Debug rendering logic
    const shouldShowSettings = !isCurrentUser && isCurrentUserOwner(); // Only owner can change roles
    const shouldShowRemove = !isCurrentUser && !isOwner && (isCurrentUserOwner() || (isCurrentUserAdmin() && !isAdmin)); // Owner can remove anyone, admin can only remove regular members

    return (
      <View className="flex-row items-center p-3 bg-white border-b border-gray-50">
        <Image
          source={{ uri: memberAvatar || getMediumAvatar(memberName) }}
          className="w-12 h-12 rounded-full mr-3"
        />
        <View className="flex-1">
          <Text className="font-semibold text-gray-800">{memberName}</Text>
          <Text className="text-sm text-gray-500 capitalize">{memberRole}</Text>
        </View>
        <View className="flex-row items-center">
          {/* Only show settings icon if current user is owner and not current user */}
          {shouldShowSettings && (
            <TouchableOpacity 
              className="p-2"
              onPress={() => {
                Alert.alert(
                  'Update Role',
                  'Select new role:',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Owner', 
                      onPress: () => handleUpdateRole(memberId, 'owner', memberUuid) 
                    },
                    { 
                      text: 'Admin', 
                      onPress: () => handleUpdateRole(memberId, 'admin') 
                    },
                    { 
                      text: 'Member', 
                      onPress: () => handleUpdateRole(memberId, 'member') 
                    }
                  ]
                );
              }}
            >
              <Ionicons name="settings-outline" size={20} color="#666" />
            </TouchableOpacity>
          )}
          {/* Only show remove icon if shouldShowRemove */}
          {shouldShowRemove && (
            <TouchableOpacity 
              className="p-2"
              onPress={() => handleRemoveMember(memberId, memberName)}
            >
              <Ionicons name="person-remove-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />
      
      {/* Header */}
      <View className="bg-blue-500 px-4 pt-3 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold flex-1">Group options</Text>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
      >
        {/* Group Info Section */}
        <View className="bg-white px-4 py-4 mb-2">
          <View className="items-center">
            <TouchableOpacity onPress={handleUpdateAvatar} disabled={updatingAvatar}>
              <View className="relative">
                <Image
                  source={{ 
                    uri: currentGroup?.avatarUrl 
                      ? `${currentGroup.avatarUrl}?t=${avatarTimestamp}` 
                      : group.avatarUrl 
                        ? `${group.avatarUrl}?t=${avatarTimestamp}` 
                        : getLargeAvatar(currentGroup?.name || group.name)
                  }}
                  className="w-20 h-20 rounded-full mb-3"
                />
                {(isCurrentUserOwner() || isCurrentUserAdmin()) && (
                  <View className="absolute bottom-2 right-0 bg-blue-500 rounded-full p-1">
                    <Ionicons name="camera-outline" size={14} color="white" />
                  </View>
                )}
                {updatingAvatar && (
                  <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                    <Ionicons name="reload-outline" size={20} color="white" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">{currentGroup?.name || group.name}</Text>
            {(currentGroup?.description || group.description) && (
              <Text className="text-sm text-gray-500 text-center mt-1">{currentGroup?.description || group.description}</Text>
            )}
            <Text className="text-xs text-gray-400 mt-2">
              {groupMembers.length} members
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row mt-6 space-x-3">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center py-3 bg-blue-50 rounded-lg">
              <Ionicons name="search" size={18} color="#0068FF" className="mr-2" />
              <Text className="text-blue-600 text-sm font-medium">Search</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-1 flex-row items-center justify-center py-3 bg-green-50 rounded-lg"
              onPress={() => setShowAddMembersModal(true)}
            >
              <Ionicons name="person-add-outline" size={18} color="#10B981" className="mr-2" />
              <Text className="text-green-600 text-sm font-medium">Add Members</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Members Section */}
        <View className="bg-white mb-2">
          <View className="px-4 py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-800">Members ({groupMembers.length})</Text>
          </View>
          
          {loading ? (
            <View className="p-4 items-center">
              <Text className="text-gray-500">Loading...</Text>
            </View>
          ) : (
            <FlatList
              data={groupMembers}
              renderItem={renderMemberItem}
              keyExtractor={(item) => item.user?.id || item.id || Math.random().toString()}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* Group Settings Section */}
        <View className="bg-white mb-2">
          <View className="px-4 py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-800">Group options</Text>
          </View>
          
          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-50">
            <View className="flex-row items-center">
              <Ionicons name="notifications-outline" size={20} color="#666" className="mr-3" />
              <Text className="text-gray-700">Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-gray-50">
            <View className="flex-row items-center">
              <Ionicons name="lock-closed-outline" size={20} color="#666" className="mr-3" />
              <Text className="text-gray-700">Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-4">
            <View className="flex-row items-center">
              <Ionicons name="image-outline" size={20} color="#666" className="mr-3" />
              <Text className="text-gray-700">Photos & Media</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <View className="bg-white mb-2">
          <View className="px-4 py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-800">Danger Zone</Text>
          </View>
          
          {/* Delete group option for owners/admins */}
          {isCurrentUserOwner() && (
            <TouchableOpacity 
              className="flex-row items-center justify-center p-4"
              onPress={handleDeleteGroup}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" className="mr-2" />
              <Text className="text-red-600 font-medium">Disband Group</Text>
            </TouchableOpacity>
          )}
          
          {/* Leave group option for all members including owners */}
          <TouchableOpacity 
            className="flex-row items-center justify-center p-4"
            onPress={handleLeaveGroup}
          >
            <Ionicons name="exit-outline" size={20} color="#EF4444" className="mr-2" />
            <Text className="text-red-600 font-medium">Leave Group</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Members Modal */}
      <Modal
        visible={showAddMembersModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAddMembersModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-11/12 max-w-sm max-h-[500px]">
            <SafeAreaView>
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowAddMembersModal(false)}>
              <Text className="text-blue-500 font-medium">Cancel</Text>
            </TouchableOpacity>
            <Text className="font-semibold text-lg">Add Members</Text>
            <TouchableOpacity 
              onPress={handleAddMembers}
              disabled={selectedFriendsToAdd.length === 0 || addingMembers}
            >
              <Text className={`font-medium ${selectedFriendsToAdd.length === 0 || addingMembers ? 'text-gray-400' : 'text-blue-500'}`}>
                {addingMembers ? 'Adding...' : `Add (${selectedFriendsToAdd.length})`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Friends List */}
          <ScrollView className="max-h-80">
            {getAvailableFriends().length > 0 ? (
              getAvailableFriends().map((friend) => (
                <TouchableOpacity 
                  key={friend.id} 
                  className="flex-row items-center p-3 bg-white border-b border-gray-50"
                  onPress={() => toggleFriendSelection(friend.id)}
                >
                  <Image
                    source={{ uri: friend.avatarUrl || getMediumAvatar(friend.name) }}
                    className="w-12 h-12 rounded-full mr-3"
                  />
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800">{friend.name}</Text>
                    <Text className="text-sm text-gray-500">{friend.email || ''}</Text>
                  </View>
                  <View className={`w-6 h-6 rounded-full border-2 ${selectedFriendsToAdd.includes(friend.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                    {selectedFriendsToAdd.includes(friend.id) && (
                      <Ionicons name="checkmark" size={14} color="white" className="self-center" />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View className="items-center justify-center py-12">
                <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                <Text className="text-gray-500 mt-3 text-center">No friends to add</Text>
                <Text className="text-gray-400 text-sm mt-1 text-center px-4">All friends are already in the group</Text>
              </View>
            )}
          </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default GroupOptionsScreen;
