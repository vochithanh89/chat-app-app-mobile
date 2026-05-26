import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  TextInput,
  ActivityIndicator,
  Linking,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import api, { friendshipAPI, conversationAPI, messageAPI } from "../services/api";
import { formatImageUrl, normalizeMessage, normalizeUser } from "../services/chatMappers";
import { getLargeAvatar, getMediumAvatar } from "../utils/avatarUtils";
import { useAuth } from "../contexts/AuthContext";

type FileItem = {
  id: string;
  name: string;
  size: string;
  url: string;
};

type LinkItem = {
  id: string;
  title: string;
  url: string;
};

type MediaItem = {
  id: string;
  url: string;
  type: "image" | "video";
};

type ReminderItem = {
  id: string;
  title: string;
  time: string;
};

const urlRegex = /(https?:\/\/[^\s]+)/gi;

const reportReasons = [
  "Nội dung nhạy cảm",
  "Làm phiền",
  "Lừa đảo",
  "Lý do khác",
];

const autoDeleteOptions = [
  { label: "Không bao giờ", value: "never" },
  { label: "1 ngày", value: "1d" },
  { label: "7 ngày", value: "7d" },
  { label: "14 ngày", value: "14d" },
];

const formatBytes = (value?: number) => {
  if (!value) return "Không rõ dung lượng";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "document-text-outline";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "grid-outline";
  if (lower.endsWith(".pptx") || lower.endsWith(".ppt")) return "easel-outline";
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "document-outline";
  if (lower.endsWith(".zip") || lower.endsWith(".rar")) return "archive-outline";
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) return "videocam-outline";
  if (lower.endsWith(".mp3") || lower.endsWith(".wav")) return "musical-notes-outline";
  return "document-attach-outline";
};

const openUrl = async (url: string) => {
  if (!url) return;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Không thể mở", url);
    }
  } catch {
    Alert.alert("Không thể mở", url);
  }
};

const GroupOptionsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { group } = route.params as { group: any };
  const auth = useAuth();
  const currentUser = auth.user?.user || auth.user;

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

  // New States
  const storagePrefix = `chat:options:${group.id}`;
  const [messages, setMessages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showMedia, setShowMedia] = useState(true);
  const [showFiles, setShowFiles] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [showSecurity, setShowSecurity] = useState(true);
  const [autoDeleteValue, setAutoDeleteValue] = useState("never");

  const loadLocalState = useCallback(async () => {
    if (!storagePrefix) return;
    const [storedMute, storedAutoDelete, storedReminders] = await Promise.all([
      AsyncStorage.getItem(`${storagePrefix}:mute`),
      AsyncStorage.getItem(`${storagePrefix}:autoDelete`),
      AsyncStorage.getItem(`${storagePrefix}:reminders`),
    ]);

    setMuteNotifications(storedMute === "true");
    setAutoDeleteValue(storedAutoDelete || "never");
    setReminders(storedReminders ? JSON.parse(storedReminders) : []);
  }, [storagePrefix]);

  const loadMessages = useCallback(async () => {
    try {
      const msgRes = await messageAPI.getMessages(group.id, { limit: 100 });
      const rawMessages = msgRes?.data?.messages || msgRes?.messages || [];
      const clearedAt = await AsyncStorage.getItem(`${storagePrefix}:clearedAt`);
      const clearedAtTime = clearedAt ? new Date(clearedAt).getTime() : null;
      const normalizedMessages = Array.isArray(rawMessages)
        ? rawMessages
            .map((item: any) => normalizeMessage(item, currentUser?.uuid || currentUser?.id))
            .filter((item: any) => {
              if (!clearedAtTime) return true;
              const messageTime = item.rawTime ? new Date(item.rawTime).getTime() : 0;
              return messageTime > clearedAtTime;
            })
        : [];
      setMessages(normalizedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }, [group.id, currentUser, storagePrefix]);

  // Load group members and friends
  useEffect(() => {
    loadGroupDetails();
    loadFriends();
    loadLocalState();
    loadMessages();
  }, []);

  const shared = useMemo(() => {
    const media: MediaItem[] = [];
    const files: FileItem[] = [];
    const links: LinkItem[] = [];
    const seenLinks = new Set<string>();

    messages.forEach((message) => {
      message.attachments?.forEach((attachment: any) => {
        if (!attachment.url) return;
        if (attachment.type === "image" || attachment.type === "video") {
          media.push({ id: attachment.id, url: attachment.url, type: attachment.type });
        } else {
          files.push({
            id: attachment.id,
            name: attachment.fileName || attachment.name || "Tệp đính kèm",
            size: formatBytes(attachment.fileSize),
            url: attachment.url,
          });
        }
      });

      const urls = String(message.content || "").match(urlRegex) || [];
      urls.forEach((url: string, index: number) => {
        const cleanUrl = url.replace(/[),.]+$/, "");
        if (seenLinks.has(cleanUrl)) return;
        seenLinks.add(cleanUrl);
        links.push({
          id: `${message.id}-${index}`,
          title: cleanUrl.replace(/^https?:\/\//, ""),
          url: cleanUrl,
        });
      });
    });

    return { media, files, links };
  }, [messages]);

  const searchableMessages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return messages
      .filter((item) => {
        const content = String(item?.content || item?.text || "").toLowerCase();
        return content.includes(query);
      })
      .sort((a, b) => new Date(b.rawTime || 0).getTime() - new Date(a.rawTime || 0).getTime());
  }, [messages, searchQuery]);

  const persistToggle = async (key: string, value: boolean, setter: (value: boolean) => void) => {
    if (!storagePrefix) return;
    setter(value);
    await AsyncStorage.setItem(`${storagePrefix}:${key}`, String(value));
  };

  const saveAutoDelete = async (value: string) => {
    if (!storagePrefix) return;
    setAutoDeleteValue(value);
    await AsyncStorage.setItem(`${storagePrefix}:autoDelete`, value);
  };

  const saveReminders = async (nextReminders: ReminderItem[]) => {
    if (!storagePrefix) return;
    setReminders(nextReminders);
    await AsyncStorage.setItem(`${storagePrefix}:reminders`, JSON.stringify(nextReminders));
  };

  const handleCreateReminder = async () => {
    if (!reminderTitle.trim()) {
      Alert.alert("Nhắc hẹn", "Vui lòng nhập nội dung nhắc hẹn.");
      return;
    }
    const next = [
      ...reminders,
      {
        id: `${Date.now()}`,
        title: reminderTitle.trim(),
        time: reminderTime.trim() || "Chưa đặt thời gian",
      },
    ];
    await saveReminders(next);
    setReminderTitle("");
    setReminderTime("");
  };

  const handleReport = async () => {
    if (!selectedReportReason || !group.id) return;
    try {
      setReporting(true);
      await api.post("/api/v1/reports", {
        target_type: "conversation",
        target_id: group.id,
        reason: selectedReportReason,
      });
      setShowReportModal(false);
      setSelectedReportReason("");
      Alert.alert("Đã gửi báo cáo", "Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét.");
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || error?.message || "Báo xấu thất bại, thử lại sau.");
    } finally {
      setReporting(false);
    }
  };

  const handleDeleteConversation = () => {
    if (!group.id) return;
    Alert.alert("Xóa lịch sử trò chuyện", "Toàn bộ tin nhắn đã tải sẽ được xóa ở phía bạn.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            const latestMessages = group.id
              ? await messageAPI.getMessages(group.id, { limit: 100 }).catch(() => null)
              : null;
            const rawLatestMessages = latestMessages?.data?.messages || latestMessages?.messages || [];
            const ids = Array.from(
              new Set([
                ...messages.map((item) => item.id),
                ...(Array.isArray(rawLatestMessages)
                  ? rawLatestMessages.map((item: any) => item?.uuid || item?.id)
                  : []),
              ].filter(Boolean)),
            );
            await Promise.allSettled(ids.map((id) => messageAPI.deleteForMe(id)));
            if (storagePrefix) {
              await AsyncStorage.setItem(`${storagePrefix}:clearedAt`, new Date().toISOString());
            }
            setMessages([]);
            Alert.alert("Đã xóa", "Lịch sử trò chuyện đã được xóa ở phía bạn.");
          } catch (error: any) {
            Alert.alert("Lỗi", error?.response?.data?.message || error?.message || "Không thể xóa lịch sử.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

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
      const currentUserId = currentUser?.uuid || currentUser?.id;
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
              // Navigate back to main tabs (Groups/Contacts)
              (navigation as any).navigate('MainApp');
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
    const currentUserId = currentUser?.uuid || currentUser?.id;
    return groupMembers.some(member => {
      const memberId = member.user?.id || member.id;
      const memberRole = member.role;
      return memberId === currentUserId && memberRole === 'owner';
    });
  };

  // Check if current user is admin (but not owner)
  const isCurrentUserAdmin = () => {
    const currentUserId = currentUser?.uuid || currentUser?.id;
    return groupMembers.some(member => {
      const memberId = member.user?.id || member.id;
      const memberRole = member.role;
      return memberId === currentUserId && memberRole === 'admin';
    });
  };

  // Leave group
  const handleLeaveGroup = () => {
    // Check current user's actual role in the group (not cached)
    const currentUserId = currentUser?.uuid || currentUser?.id;
    const currentUserRole = groupMembers.find(member => {
      const memberId = member.user?.id || member.id;
      return memberId === currentUserId;
    })?.role;

    // Check if current user is owner
    if (currentUserRole === 'owner') {
      // Find other members who can be new owner
      const otherMembers = groupMembers.filter(member => {
        const memberId = member.user?.id || member.id;
        const currentUserId = currentUser?.uuid || currentUser?.id;
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
                
                // Navigate back to Contacts screen
                (navigation as any).navigate('MainApp');
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
    const currentUserId = currentUser?.uuid || currentUser?.id;
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

  const renderActionButton = (icon: any, label: string, onPress: () => void, active = false) => (
    <TouchableOpacity className="w-1/4 items-center px-1 py-2" onPress={onPress}>
      <View className={`h-12 w-12 items-center justify-center rounded-full ${active ? "bg-blue-100" : "bg-gray-100"}`}>
        <Ionicons name={icon} size={22} color={active ? "#0068FF" : "#4B5563"} />
      </View>
      <Text className="mt-2 text-center text-xs text-gray-700" numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSectionHeader = (title: string, count: number | null, open: boolean, onPress: () => void) => (
    <TouchableOpacity className="flex-row items-center justify-between px-4 py-3" onPress={onPress}>
      <Text className="font-semibold text-gray-800">{count !== null && count > 0 ? `${title} (${count})` : title}</Text>
      <Ionicons name={open ? "chevron-down" : "chevron-forward"} size={18} color="#6B7280" />
    </TouchableOpacity>
  );

  const renderMedia = () => {
    const displayItems = shared.media.slice(0, 9);
    return (
      <View className="border-t border-gray-100 bg-white">
        {renderSectionHeader("Ảnh/Video", shared.media.length, showMedia, () => setShowMedia((value) => !value))}
        {showMedia ? (
          <View className="px-4 pb-4">
            {displayItems.length === 0 ? (
              <Text className="py-2 text-center text-sm text-gray-500">Chưa có ảnh hoặc video.</Text>
            ) : (
              <View className="flex-row flex-wrap">
                {displayItems.map((item) => (
                  <TouchableOpacity key={item.id} onPress={() => openUrl(item.url)}>
                    {item.type === "image" ? (
                      <Image source={{ uri: item.url }} className="mb-2 mr-2 h-20 w-20 rounded-lg bg-gray-100" />
                    ) : (
                      <View className="mb-2 mr-2 h-20 w-20 items-center justify-center rounded-lg bg-gray-900">
                        <Ionicons name="play-circle" size={30} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const renderFiles = () => {
    const displayFiles = shared.files.slice(0, 8);
    return (
      <View className="border-t border-gray-100 bg-white">
        {renderSectionHeader("File", shared.files.length, showFiles, () => setShowFiles((value) => !value))}
        {showFiles ? (
          <View className="px-4 pb-4">
            {displayFiles.length === 0 ? (
              <Text className="py-2 text-center text-sm text-gray-500">Chưa có file được chia sẻ.</Text>
            ) : (
              displayFiles.map((file) => (
                <TouchableOpacity key={file.id} className="mb-2 flex-row items-center rounded-xl bg-gray-50 p-3" onPress={() => openUrl(file.url)}>
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Ionicons name={getFileIcon(file.name) as any} size={20} color="#0068FF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>{file.name}</Text>
                    <Text className="text-xs text-gray-500">{file.size}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const renderLinks = () => {
    const displayLinks = shared.links.slice(0, 8);
    return (
      <View className="border-t border-gray-100 bg-white">
        {renderSectionHeader("Link", shared.links.length, showLinks, () => setShowLinks((value) => !value))}
        {showLinks ? (
          <View className="px-4 pb-4">
            {displayLinks.length === 0 ? (
              <Text className="py-2 text-center text-sm text-gray-500">Chưa có link được chia sẻ.</Text>
            ) : (
              displayLinks.map((link) => (
                <TouchableOpacity key={link.id} className="mb-2 flex-row items-center rounded-xl bg-gray-50 p-3" onPress={() => openUrl(link.url)}>
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <Ionicons name="globe-outline" size={20} color="#10B981" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>{link.title}</Text>
                    <Text className="text-xs text-blue-600" numberOfLines={1}>{link.url}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const renderRow = (icon: any, title: string, subtitle: string | null, onPress: () => void, danger = false) => (
    <TouchableOpacity className="flex-row items-center border-b border-gray-100 px-4 py-3" onPress={onPress}>
      <View className={`mr-3 h-10 w-10 items-center justify-center rounded-lg ${danger ? "bg-red-100" : "bg-gray-100"}`}>
        <Ionicons name={icon} size={20} color={danger ? "#EF4444" : "#4B5563"} />
      </View>
      <View className="flex-1">
        <Text className={`font-medium ${danger ? "text-red-600" : "text-gray-800"}`}>{title}</Text>
        {subtitle ? <Text className="mt-0.5 text-xs text-gray-500">{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
    </TouchableOpacity>
  );

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
            {!!(currentGroup?.description || group.description) && (
              <Text className="text-sm text-gray-500 text-center mt-1">{currentGroup?.description || group.description}</Text>
            )}
            <Text className="text-xs text-gray-400 mt-2">
              {groupMembers.length} members
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="mt-5 flex-row flex-wrap">
            {renderActionButton(muteNotifications ? "notifications-off" : "notifications-outline", muteNotifications ? "Bật thông báo" : "Tắt thông báo", () => persistToggle("mute", !muteNotifications, setMuteNotifications), muteNotifications)}
            {renderActionButton("alarm-outline", "Nhắc hẹn", () => setShowReminderModal(true), reminders.length > 0)}
            {renderActionButton("search-outline", "Tìm tin nhắn", () => setShowSearchModal(true), false)}
            {renderActionButton("person-add-outline", "Thêm TV", () => setShowAddMembersModal(true), false)}
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

        {/* Media Shared Sections */}
        <View className="mb-2">
          {renderMedia()}
          {renderFiles()}
          {renderLinks()}
        </View>

        {/* Group Options Settings Section */}
        <View className="mb-2 bg-white">
          <View className="border-b border-gray-100">
            {renderSectionHeader("Thiết lập bảo mật", null, showSecurity, () => setShowSecurity((value) => !value))}
            {showSecurity ? (
              <View className="px-4 pb-3">
                <Text className="mb-2 text-sm font-medium text-gray-800">Tin nhắn tự xóa</Text>
                <View className="mb-3 flex-row flex-wrap">
                  {autoDeleteOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      className={`mb-2 mr-2 rounded-full px-3 py-2 ${autoDeleteValue === option.value ? "bg-blue-500" : "bg-gray-100"}`}
                      onPress={() => saveAutoDelete(option.value)}
                    >
                      <Text className={`text-xs font-medium ${autoDeleteValue === option.value ? "text-white" : "text-gray-700"}`}>{option.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
          {renderRow("warning-outline", "Báo xấu", "Báo cáo hội thoại này", () => setShowReportModal(true))}
          <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={handleDeleteConversation} disabled={deleting}>
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              {deleting ? <ActivityIndicator size="small" color="#EF4444" /> : <Ionicons name="trash-outline" size={20} color="#EF4444" />}
            </View>
            <Text className="flex-1 font-medium text-red-600">Xóa toàn bộ tin nhắn ở phía tôi</Text>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
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

      {/* Reminder Modal */}
      <Modal visible={showReminderModal} transparent animationType="fade" onRequestClose={() => setShowReminderModal(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[78%] rounded-t-3xl bg-white p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900">Danh sách nhắc hẹn</Text>
              <TouchableOpacity onPress={() => setShowReminderModal(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <TextInput value={reminderTitle} onChangeText={setReminderTitle} placeholder="Nội dung nhắc hẹn" className="mb-3 rounded-xl border border-gray-200 px-4 py-3 text-gray-900" />
            <TextInput value={reminderTime} onChangeText={setReminderTime} placeholder="Thời gian, ví dụ: 20:00 hôm nay" className="mb-3 rounded-xl border border-gray-200 px-4 py-3 text-gray-900" />
            <TouchableOpacity className="mb-4 rounded-xl bg-blue-500 py-3" onPress={handleCreateReminder}>
              <Text className="text-center font-semibold text-white">Thêm nhắc hẹn</Text>
            </TouchableOpacity>
            <ScrollView className="max-h-64">
              {reminders.length === 0 ? (
                <Text className="py-8 text-center text-sm text-gray-500">Chưa có nhắc hẹn nào.</Text>
              ) : (
                reminders.map((item) => (
                  <View key={item.id} className="mb-2 flex-row items-center rounded-xl bg-gray-50 p-3">
                    <Ionicons name="alarm-outline" size={22} color="#0068FF" />
                    <View className="ml-3 flex-1">
                      <Text className="font-medium text-gray-800">{item.title}</Text>
                      <Text className="text-xs text-gray-500">{item.time}</Text>
                    </View>
                    <TouchableOpacity onPress={() => saveReminders(reminders.filter((reminder) => reminder.id !== item.id))}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <View className="w-full rounded-2xl bg-white p-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900">Báo xấu</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <Text className="mb-3 text-sm text-gray-600">Chọn lý do báo xấu nhóm {currentGroup?.name || group.name}.</Text>
            {reportReasons.map((reason) => (
              <TouchableOpacity key={reason} className="flex-row items-center border-b border-gray-100 py-3" onPress={() => setSelectedReportReason(reason)}>
                <Ionicons name={selectedReportReason === reason ? "radio-button-on" : "radio-button-off"} size={20} color={selectedReportReason === reason ? "#0068FF" : "#9CA3AF"} />
                <Text className="ml-3 text-gray-800">{reason}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity className={`mt-4 rounded-xl py-3 ${selectedReportReason && !reporting ? "bg-blue-500" : "bg-blue-300"}`} onPress={handleReport} disabled={!selectedReportReason || reporting}>
              {reporting ? <ActivityIndicator color="white" /> : <Text className="text-center font-semibold text-white">Gửi báo cáo</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[80%] rounded-t-3xl bg-white p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900">Tìm tin nhắn</Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <View className="mb-4 flex-row items-center rounded-xl bg-gray-100 px-4 py-3">
              <Ionicons name="search-outline" size={18} color="#6B7280" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Nhập nội dung cần tìm"
                className="ml-3 flex-1 text-gray-900"
                autoFocus
              />
            </View>

            <ScrollView className="max-h-96" keyboardShouldPersistTaps="handled">
              {!searchQuery.trim() ? (
                <Text className="py-8 text-center text-sm text-gray-500">Nhập từ khóa để tìm trong hội thoại.</Text>
              ) : searchableMessages.length === 0 ? (
                <Text className="py-8 text-center text-sm text-gray-500">Không tìm thấy tin nhắn phù hợp.</Text>
              ) : (
                searchableMessages.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    className="mb-2 rounded-2xl bg-gray-50 p-4"
                    onPress={() => {
                      setShowSearchModal(false);
                      navigation.navigate("Chat", {
                        user: currentGroup || group,
                        conversationId: group.id,
                      });
                    }}
                  >
                    <View className="mb-1 flex-row items-center justify-between">
                      <Text className="text-xs font-semibold text-blue-600">
                        {item.sender?.name || (item.user === "me" ? "Bạn" : "Thành viên")}
                      </Text>
                      <Text className="text-xs text-gray-400">{item.time}</Text>
                    </View>
                    <Text className="text-sm leading-5 text-gray-800">
                      {item.content || item.text || "[Tin nhắn đính kèm]"}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default GroupOptionsScreen;
