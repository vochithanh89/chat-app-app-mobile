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
  Clipboard,
} from "react-native";
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import api, { friendshipAPI, conversationAPI, messageAPI, API_BASE_URL } from "../services/api";
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
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showMedia, setShowMedia] = useState(true);
  const [showFiles, setShowFiles] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [showSecurity, setShowSecurity] = useState(true);
  const [autoDeleteValue, setAutoDeleteValue] = useState("never");

  // Web-synchronized Group Management States
  const [showGroupSettings, setShowGroupSettings] = useState(true);
  const [sendMessagesEnabled, setSendMessagesEnabled] = useState(true);
  const [approveMembers, setApproveMembers] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showJoinRequestsModal, setShowJoinRequestsModal] = useState(false);
  const [rotatingCode, setRotatingCode] = useState(false);

  const loadLocalState = useCallback(async () => {
    if (!storagePrefix) return;
    const [
      storedMute, 
      storedAutoDelete, 
      storedReminders,
    ] = await Promise.all([
      AsyncStorage.getItem(`${storagePrefix}:mute`),
      AsyncStorage.getItem(`${storagePrefix}:autoDelete`),
      AsyncStorage.getItem(`${storagePrefix}:reminders`),
    ]);

    setMuteNotifications(storedMute === "true");
    setAutoDeleteValue(storedAutoDelete || "never");
    setReminders(storedReminders ? JSON.parse(storedReminders) : []);
  }, [storagePrefix]);

  const loadJoinRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await conversationAPI.getJoinRequests(group.id);
      const requestData = res?.data || res || [];
      setJoinRequests(Array.isArray(requestData) ? requestData : []);
    } catch (error) {
      console.error("Error loading join requests:", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await conversationAPI.approveJoinRequest(group.id, requestId);
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      loadGroupDetails(); // Refresh group members list
      Alert.alert("Thành công", "Đã duyệt thành viên vào nhóm.");
    } catch (error: any) {
      console.error("Error approving request:", error);
      Alert.alert("Lỗi", "Không thể phê duyệt yêu cầu này.");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await conversationAPI.rejectJoinRequest(group.id, requestId);
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
      Alert.alert("Thành công", "Đã từ chối yêu cầu tham gia.");
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      Alert.alert("Lỗi", "Không thể từ chối yêu cầu này.");
    }
  };

  const persistGroupSetting = async (key: string, value: boolean, setter: (val: boolean) => void) => {
    setter(value);
    await AsyncStorage.setItem(`${storagePrefix}:${key}`, String(value));
  };

  const handleToggleSendMessages = async (checked: boolean) => {
    const isOwner = isCurrentUserOwner();
    if (!isOwner) {
      Alert.alert("Quyền truy cập bị từ chối", "Chỉ có trưởng nhóm mới có quyền thay đổi cài đặt này.");
      return;
    }
    
    try {
      setSendMessagesEnabled(checked);
      await conversationAPI.updateSettings(group.id, { comments_restricted: !checked });
    } catch (error: any) {
      setSendMessagesEnabled(!checked); // Revert state
      console.error("Error toggling send messages:", error);
      Alert.alert("Lỗi", error.response?.data?.message || error.message || "Không thể cập nhật cài đặt nhóm");
    }
  };

  const handleToggleApproveMembers = async (checked: boolean) => {
    const isOwnerOrAdmin = isCurrentUserOwner() || isCurrentUserAdmin();
    if (!isOwnerOrAdmin) {
      Alert.alert("Quyền truy cập bị từ chối", "Chỉ có trưởng hoặc phó nhóm mới có quyền thay đổi cài đặt này.");
      return;
    }
    
    try {
      setApproveMembers(checked);
      await conversationAPI.updateSettings(group.id, { approve_members: checked });
      if (checked) {
        loadJoinRequests();
      }
    } catch (error: any) {
      setApproveMembers(!checked); // Revert state
      console.error("Error toggling approve members:", error);
      Alert.alert("Lỗi", error.response?.data?.message || error.message || "Không thể cập nhật cài đặt nhóm");
    }
  };

  const handleRegenerateInviteCode = async () => {
    const isOwner = isCurrentUserOwner();
    if (!isOwner) {
      Alert.alert("Quyền truy cập bị từ chối", "Chỉ có trưởng nhóm mới có quyền đổi mã mời.");
      return;
    }
    
    try {
      setRotatingCode(true);
      const res = await conversationAPI.regenerateInviteCode(group.id);
      const newCode = res.inviteCode || res.data?.inviteCode || "";
      if (newCode) {
        setCurrentGroup((prev: any) => ({
          ...prev,
          inviteCode: newCode
        }));
        Alert.alert("Thành công", "Đã tạo mới liên kết và mã mời QR thành công!");
      }
    } catch (error: any) {
      console.error("Error regenerating invite code:", error);
      Alert.alert("Lỗi", error.response?.data?.message || error.message || "Không thể tạo mới mã mời");
    } finally {
      setRotatingCode(false);
    }
  };

  const handleCopyInviteLink = () => {
    const inviteCode = currentGroup?.inviteCode || group.inviteCode || "";
    const inviteLink = inviteCode ? `${API_BASE_URL.replace("/api/v1", "")}/join/${inviteCode}` : "";
    if (!inviteLink) return;
    Clipboard.setString(inviteLink);
    Alert.alert("Đã sao chép", "Liên kết tham gia nhóm đã được sao chép vào bộ nhớ tạm.");
  };

  const handleCopyInviteCode = () => {
    const inviteCode = currentGroup?.inviteCode || group.inviteCode || "";
    if (!inviteCode) return;
    Clipboard.setString(inviteCode);
    Alert.alert("Đã sao chép", "Mã nhóm đã được sao chép vào bộ nhớ tạm.");
  };

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
        setSendMessagesEnabled(!updatedGroup.commentsRestricted);
        const isApprove = updatedGroup.approveMembers || updatedGroup.approve_members || false;
        setApproveMembers(isApprove);
        if (isApprove) {
          loadJoinRequests();
        }
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
      setFriends(Array.isArray(friendsData) ? friendsData.map((f: any) => normalizeUser(f)) : []);
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
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một người bạn để thêm vào nhóm');
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
      
      Alert.alert('Thành công', `Đã thêm thành công ${selectedFriendsToAdd.length} thành viên vào nhóm!`);
    } catch (error: any) {
      console.error('Error adding members:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Không thể thêm thành viên vào nhóm';
      Alert.alert('Lỗi', errorMessage);
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
      'Mời ra khỏi nhóm',
      `Bạn có chắc chắn muốn mời "${memberName}" rời khỏi nhóm không?`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Đồng ý',
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationAPI.removeMember(group.id, memberId);
              await loadGroupDetails();
              Alert.alert('Thành công', 'Đã mời thành viên rời nhóm thành công');
            } catch (error) {
              console.error('Error removing member:', error);
              Alert.alert('Lỗi', 'Không thể mời thành viên rời nhóm');
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
        Alert.alert('Thành công', 'Đã chuyển nhượng quyền trưởng nhóm thành công!');
      } else {
        // Normal role update (admin/member)
        await conversationAPI.updateMemberRole(group.id, memberId, newRole);
        await loadGroupDetails();
        // Force re-render by updating a dummy state
        setRefreshKey(prev => prev + 1);
        Alert.alert('Thành công', 'Đã cập nhật chức vụ thành viên thành công!');
      }
    } catch (error) {
      console.error('Error updating role:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật vai trò');
    }
  };

  // Delete group
  const handleDeleteGroup = () => {
    Alert.alert(
      'Giải tán nhóm',
      `Bạn có chắc chắn muốn giải tán nhóm "${group.name}" không? Hành động này sẽ xóa vĩnh viễn toàn bộ dữ liệu nhóm.`,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        {
          text: 'Giải tán',
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationAPI.disbandGroup(group.id);
              // Navigate back to main tabs (Groups/Contacts)
              (navigation as any).navigate('MainApp');
              Alert.alert('Thành công', 'Đã giải tán nhóm thành công!');
            } catch (error) {
              console.error('Error deleting group:', error);
              Alert.alert('Lỗi', 'Không thể giải tán nhóm');
            }
          },
        },
      ]
    );
  };

  // Handle avatar update
  const handleUpdateAvatar = async () => {
    // Check if current user is owner
    if (!isCurrentUserOwner()) {
      Alert.alert('Quyền truy cập bị từ chối', 'Chỉ có trưởng nhóm mới có quyền thay đổi ảnh đại diện nhóm.');
      return;
    }

    // Request permission and launch image picker
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Yêu cầu quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để thay đổi ảnh đại diện nhóm.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const selectedAsset = result.assets[0];

      try {
        setUpdatingAvatar(true);
        const uri = selectedAsset.uri;
        const uriParts = uri.split('.');
        const fileExtension = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
        const ext = ['jpg', 'jpeg', 'png'].includes(fileExtension) ? fileExtension : 'jpg';
        const fileName = `group_avatar_${Date.now()}.${ext}`;
        const mimeType = selectedAsset.mimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        await conversationAPI.updateGroupAvatar(group.id, {
          uri: uri,
          type: mimeType,
          name: fileName,
        });
        
        // Reload group details to get updated avatar
        await loadGroupDetails();
        
        // Update timestamp to force image reload
        setAvatarTimestamp(Date.now());
        
        Alert.alert('Thành công', 'Cập nhật ảnh đại diện nhóm thành công!');
      } catch (error: any) {
        console.error('Error updating avatar:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Không thể cập nhật ảnh đại diện nhóm';
        Alert.alert('Lỗi', errorMessage);
      } finally {
        setUpdatingAvatar(false);
      }
    }
  };

  // Handle group name update
  const handleEditGroupName = () => {
    setNewGroupName(currentGroup?.name || group.name || "");
    setShowEditNameModal(true);
  };

  const handleSaveGroupName = async () => {
    if (!newGroupName.trim()) {
      Alert.alert("Lỗi", "Tên nhóm không được để trống");
      return;
    }

    try {
      setUpdatingName(true);
      await conversationAPI.updateSettings(group.id, { name: newGroupName.trim() });
      
      const updatedName = newGroupName.trim();
      setCurrentGroup(prev => ({
        ...prev,
        name: updatedName
      }));
      
      await loadGroupDetails();
      setShowEditNameModal(false);
      Alert.alert("Thành công", "Đổi tên nhóm thành công!");
    } catch (error: any) {
      console.error("Error updating group name:", error);
      const errorMessage = error.response?.data?.message || error.message || "Không thể cập nhật tên nhóm";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setUpdatingName(false);
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
          'Không thể rời nhóm',
          'Bạn là thành viên duy nhất trong nhóm. Vui lòng chọn "Giải tán nhóm" thay vì rời nhóm.',
          [{ text: 'Đã hiểu' }]
        );
        return;
      }

      // Show message about transferring ownership - DO NOT allow leaving group
      Alert.alert(
        'Rời nhóm',
        'Bạn đang là trưởng nhóm. Bạn cần chuyển nhượng quyền trưởng nhóm cho một thành viên khác trước khi rời khỏi nhóm.\n\nVui lòng đi tới danh sách thành viên để chọn trưởng nhóm mới.',
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Đến danh sách thành viên',
            onPress: () => {
              Alert.alert(
                'Hướng dẫn',
                'Cuộn lên danh sách thành viên, nhấn nút cài đặt (bánh răng) bên cạnh thành viên bạn muốn chuyển quyền, sau đó chọn "Trưởng nhóm".\n\nSau khi chuyển quyền thành công, bạn sẽ có thể rời khỏi nhóm.'
              );
            },
          },
        ]
      );
      return; // IMPORTANT: Return here to prevent API call
    } else {
      // Regular member leave group
      Alert.alert(
        'Rời nhóm',
        `Bạn có chắc chắn muốn rời khỏi nhóm "${group.name}" không?`,
        [
          {
            text: 'Hủy',
            style: 'cancel',
          },
          {
            text: 'Rời nhóm',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await conversationAPI.leaveGroup(group.id);
                
                // Navigate back to Contacts screen
                (navigation as any).navigate('MainApp');
                Alert.alert('Thành công', 'Đã rời khỏi nhóm thành công!');
              } catch (error) {
                console.error('Error leaving group:', error);
                // Show specific error message
                const errorMessage = error.response?.data?.message || error.message || 'Không thể rời khỏi nhóm';
                Alert.alert('Lỗi', errorMessage);
              }
            },
          },
        ]
      );
    }
  };

  // Render member row using safe inner component to handle image errors and format URLs
  const MemberRow = ({ item }: { item: any }) => {
    const memberName = item.name || item.user?.name || item.username || 'Người dùng ẩn danh';
    const rawAvatar = item.avatarUrl || item.user?.avatarUrl || item.avatar;
    const hasAvatar = !!rawAvatar && rawAvatar !== 'null' && rawAvatar !== 'undefined' && rawAvatar !== '';
    const memberAvatar = hasAvatar ? formatImageUrl(rawAvatar) : getMediumAvatar(memberName);
    const memberId = item.id || item.user?.id || item.userId;
    const memberUuid = item.user?.id || item.uuid || item.id;
    const memberRole = item.role || 'member';

    const currentUserId = currentUser?.uuid || currentUser?.id;
    const isCurrentUser = memberId === currentUserId;
    const isOwner = memberRole === 'owner';
    const isAdmin = memberRole === 'admin';

    const shouldShowSettings = !isCurrentUser && isCurrentUserOwner();
    const shouldShowRemove = !isCurrentUser && !isOwner && (isCurrentUserOwner() || (isCurrentUserAdmin() && !isAdmin));

    const [imgUri, setImgUri] = useState(memberAvatar);

    // Sync image URI when memberAvatar changes
    useEffect(() => {
      setImgUri(memberAvatar);
    }, [memberAvatar]);

    const getRoleLabel = (role: string) => {
      switch (role) {
        case 'owner':
          return 'Trưởng nhóm';
        case 'admin':
          return 'Phó nhóm';
        case 'member':
        default:
          return 'Thành viên';
      }
    };

    return (
      <View className="flex-row items-center p-3 bg-white border-b border-gray-50">
        <Image
          source={{ uri: imgUri }}
          className="w-12 h-12 rounded-full mr-3"
          onError={() => {
            if (imgUri !== getMediumAvatar(memberName)) {
              setImgUri(getMediumAvatar(memberName));
            }
          }}
        />
        <View className="flex-1">
          <Text className="font-semibold text-gray-800">{memberName}</Text>
          <Text className="text-sm text-gray-500">{getRoleLabel(memberRole)}</Text>
        </View>
        <View className="flex-row items-center">
          {shouldShowSettings && (
            <TouchableOpacity 
              className="p-2"
              onPress={() => {
                Alert.alert(
                  'Cập nhật vai trò',
                  'Chọn vai trò mới cho thành viên:',
                  [
                    { text: 'Hủy', style: 'cancel' },
                    { 
                      text: 'Trưởng nhóm', 
                      onPress: () => handleUpdateRole(memberId, 'owner', memberUuid) 
                    },
                    { 
                      text: 'Phó nhóm', 
                      onPress: () => handleUpdateRole(memberId, 'admin') 
                    },
                    { 
                      text: 'Thành viên', 
                      onPress: () => handleUpdateRole(memberId, 'member') 
                    }
                  ]
                );
              }}
            >
              <Ionicons name="settings-outline" size={20} color="#666" />
            </TouchableOpacity>
          )}
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

  const renderMemberItem = ({ item }: { item: any }) => {
    return <MemberRow item={item} />;
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

  const renderToggleRow = (icon: string, label: string, description: string | null, value: boolean, onValueChange: (val: boolean) => void, disabled = false) => (
    <View className="flex-row items-center justify-between py-3 border-b border-gray-100" key={label}>
      <View className="flex-row items-center flex-1 mr-4">
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-blue-50">
          <Ionicons name={icon as any} size={18} color="#0068FF" />
        </View>
        <View className="flex-1">
          <Text className={`text-sm font-semibold ${disabled ? "text-gray-400" : "text-gray-800"}`}>{label}</Text>
          {description ? <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{description}</Text> : null}
        </View>
      </View>
      <TouchableOpacity 
        onPress={() => !disabled && onValueChange(!value)} 
        disabled={disabled}
        className={`w-11 h-6 rounded-full p-0.5 justify-center ${value ? "bg-blue-500" : "bg-gray-300"} ${disabled ? "opacity-50" : ""}`}
      >
        <View className={`w-5 h-5 rounded-full bg-white shadow-sm ${value ? "align-self-end ml-auto" : "align-self-start mr-auto"}`} />
      </TouchableOpacity>
    </View>
  );

  const renderGroupSettingsSection = () => {
    const isUserAdmin = isCurrentUserOwner() || isCurrentUserAdmin();
    const inviteCode = currentGroup?.inviteCode || group.inviteCode || "";
    const inviteLink = inviteCode ? `${API_BASE_URL.replace("/api/v1", "")}/join/${inviteCode}` : "";
    
    return (
      <View className="bg-white mb-2" key="group-settings-section">
        {renderSectionHeader(isUserAdmin ? "Quản lý cài đặt nhóm" : "Thông tin mời tham gia nhóm", null, showGroupSettings, () => setShowGroupSettings((value) => !value))}
        {showGroupSettings ? (
          <View className="px-4 pb-4">
            
            {/* Invite link + QR code */}
            {!!inviteCode ? (
              <View className="items-center bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                <Image
                  source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(inviteLink)}` }}
                  className="w-32 h-32 bg-white p-1 rounded-lg border border-gray-200"
                  resizeMode="contain"
                />
                <Text className="text-[10px] uppercase tracking-wider text-gray-400 mt-2">Mã tham gia</Text>
                <Text className="font-mono text-xl font-bold tracking-widest text-blue-600 mt-1">
                  {inviteCode}
                </Text>
                
                <View className="flex-row items-center border border-gray-200 bg-white rounded-lg px-2 py-1.5 w-full mt-3">
                  <Ionicons name="link-outline" size={14} color="#6B7280" className="mr-2" />
                  <Text className="text-xs text-gray-400 flex-1 truncate" numberOfLines={1}>
                    {inviteLink}
                  </Text>
                </View>
                
                <View className="flex-row mt-3 gap-2 w-full justify-between">
                  <TouchableOpacity 
                    className="bg-blue-500 rounded-full py-2.5 flex-row items-center justify-center flex-1 mr-2"
                    onPress={handleCopyInviteLink}
                  >
                    <Ionicons name="copy-outline" size={14} color="white" className="mr-1.5" />
                    <Text className="text-xs font-semibold text-white">Sao chép</Text>
                  </TouchableOpacity>
                  
                  {isUserAdmin && (
                    <TouchableOpacity 
                      className={`bg-gray-100 rounded-full py-2.5 flex-row items-center justify-center flex-1 ${rotatingCode ? "opacity-50" : ""}`}
                      onPress={handleRegenerateInviteCode}
                      disabled={rotatingCode}
                    >
                      {rotatingCode ? (
                        <ActivityIndicator size="small" color="#4B5563" />
                      ) : (
                        <>
                          <Ionicons name="sync-outline" size={14} color="#4B5563" className="mr-1.5" />
                          <Text className="text-xs font-semibold text-gray-700">Mã mới</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : null}

            {isUserAdmin && (
              <>
                {/* Quyền thành viên */}
                <Text className="text-xs font-bold uppercase tracking-wide text-gray-400 mt-2 mb-1">Quyền thành viên</Text>
                {renderToggleRow("chatbox-ellipses-outline", "Gửi tin nhắn", !sendMessagesEnabled ? "Chỉ trưởng/phó nhóm có thể gửi tin." : "Mọi thành viên đều có thể gửi tin.", sendMessagesEnabled, handleToggleSendMessages, !isUserAdmin)}

                {/* Tuỳ chọn quản trị */}
                <Text className="text-xs font-bold uppercase tracking-wide text-gray-400 mt-4 mb-1">Tuỳ chọn quản trị</Text>
                {renderToggleRow("checkmark-done-circle-outline", "Phê duyệt thành viên mới", "Yêu cầu admin duyệt trước khi vào nhóm.", approveMembers, handleToggleApproveMembers, !isUserAdmin)}

                {/* Yêu cầu phê duyệt Button */}
                {approveMembers && (
                  <TouchableOpacity 
                    className="flex-row items-center border border-blue-100 bg-blue-50/40 rounded-xl px-4 py-3 mt-3"
                    onPress={() => {
                      loadJoinRequests();
                      setShowJoinRequestsModal(true);
                    }}
                  >
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <Ionicons name="people-outline" size={20} color="#0068FF" />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800">Yêu cầu chờ duyệt</Text>
                      <Text className="mt-0.5 text-xs text-gray-500">
                        {joinRequests.length > 0 ? `Có ${joinRequests.length} yêu cầu chờ phê duyệt` : "Không có yêu cầu nào"}
                      </Text>
                    </View>
                    {joinRequests.length > 0 && (
                      <View className="bg-red-500 rounded-full px-2 py-0.5 mr-2">
                        <Text className="text-white text-[10px] font-bold">{joinRequests.length}</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </>
            )}

          </View>
        ) : null}
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
          <Text className="text-white text-xl font-semibold flex-1">Tùy chọn nhóm</Text>
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
                      ? `${formatImageUrl(currentGroup.avatarUrl)}?t=${avatarTimestamp}` 
                      : group.avatarUrl 
                        ? `${formatImageUrl(group.avatarUrl)}?t=${avatarTimestamp}` 
                        : getLargeAvatar(currentGroup?.name || group.name)
                  }}
                  className="w-20 h-20 rounded-full mb-3"
                />
                {isCurrentUserOwner() && (
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
            <View className="flex-row items-center justify-center mt-2 px-6">
              <Text className="text-lg font-bold text-gray-800 mr-2 text-center" numberOfLines={2}>
                {currentGroup?.name || group.name}
              </Text>
              {isCurrentUserOwner() && (
                <TouchableOpacity onPress={handleEditGroupName} className="p-1 bg-blue-50 rounded-full">
                  <Ionicons name="create-outline" size={15} color="#0068FF" />
                </TouchableOpacity>
              )}
            </View>
            {!!(currentGroup?.description || group.description) && (
              <Text className="text-sm text-gray-500 text-center mt-1">{currentGroup?.description || group.description}</Text>
            )}
            <Text className="text-xs text-gray-400 mt-2">
              {groupMembers.length} thành viên
            </Text>
          </View>

          {/* Action Buttons */}
          <View className="mt-5 flex-row flex-wrap">
            {renderActionButton(muteNotifications ? "notifications-off" : "notifications-outline", muteNotifications ? "Bật thông báo" : "Tắt thông báo", () => persistToggle("mute", !muteNotifications, setMuteNotifications), muteNotifications)}
            {renderActionButton("alarm-outline", "Nhắc hẹn", () => setShowReminderModal(true), reminders.length > 0)}
            {renderActionButton("search-outline", "Tìm tin nhắn", () => setShowSearchModal(true), false)}
            {renderActionButton("person-add-outline", "Thêm TV", () => setShowAddMembersModal(true), false)}
            {(isCurrentUserOwner() || isCurrentUserAdmin()) && renderActionButton("settings-outline", "Quản lý nhóm", () => {
              setShowGroupSettings(prev => !prev);
            }, showGroupSettings)}
          </View>
        </View>

        {/* Members Section */}
        <View className="bg-white mb-2">
          <View className="px-4 py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-800">Thành viên ({groupMembers.length})</Text>
          </View>
          
          {loading ? (
            <View className="p-4 items-center">
              <Text className="text-gray-500">Đang tải...</Text>
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

        {/* Group Management Section */}
        {renderGroupSettingsSection()}

        {/* Danger Zone */}
        <View className="bg-white mb-2">
          <View className="px-4 py-3 border-b border-gray-100">
            <Text className="font-semibold text-gray-800">Khu vực nguy hiểm</Text>
          </View>
          
          {/* Delete group option for owners/admins */}
          {isCurrentUserOwner() && (
            <TouchableOpacity 
              className="flex-row items-center justify-center p-4"
              onPress={handleDeleteGroup}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" className="mr-2" />
              <Text className="text-red-600 font-medium">Giải tán nhóm</Text>
            </TouchableOpacity>
          )}
          
          {/* Leave group option for all members including owners */}
          <TouchableOpacity 
            className="flex-row items-center justify-center p-4"
            onPress={handleLeaveGroup}
          >
            <Ionicons name="exit-outline" size={20} color="#EF4444" className="mr-2" />
            <Text className="text-red-600 font-medium">Rời nhóm</Text>
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
              <Text className="text-blue-500 font-medium">Hủy</Text>
            </TouchableOpacity>
            <Text className="font-semibold text-lg">Thêm thành viên</Text>
            <TouchableOpacity 
              onPress={handleAddMembers}
              disabled={selectedFriendsToAdd.length === 0 || addingMembers}
            >
              <Text className={`font-medium ${selectedFriendsToAdd.length === 0 || addingMembers ? 'text-gray-400' : 'text-blue-500'}`}>
                {addingMembers ? 'Đang thêm...' : `Thêm (${selectedFriendsToAdd.length})`}
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
                <Text className="text-gray-500 mt-3 text-center">Không có bạn bè khả dụng</Text>
                <Text className="text-gray-400 text-sm mt-1 text-center px-4">Tất cả bạn bè đã tham gia vào nhóm chat này</Text>
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
                      (navigation as any).navigate("Chat", {
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

      {/* Edit Group Name Modal */}
      <Modal visible={showEditNameModal} transparent animationType="fade" onRequestClose={() => setShowEditNameModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <View className="w-full rounded-2xl bg-white p-5 max-w-sm">
            <View className="mb-4 flex-row items-center justify-between border-b border-gray-100 pb-2">
              <Text className="text-lg font-bold text-gray-900">Đổi tên nhóm</Text>
              <TouchableOpacity onPress={() => setShowEditNameModal(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Nhập tên nhóm mới"
              className="mb-4 rounded-xl border border-gray-200 px-4 py-3 text-gray-900 text-base"
              maxLength={100}
              autoFocus
            />
            <View className="flex-row gap-2 justify-end">
              <TouchableOpacity 
                className="rounded-xl px-4 py-3 bg-gray-100 mr-2 flex-1" 
                onPress={() => setShowEditNameModal(false)}
              >
                <Text className="text-center font-semibold text-gray-700 text-sm">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className={`rounded-xl px-4 py-3 flex-1 ${newGroupName.trim() && !updatingName ? "bg-blue-500" : "bg-blue-300"}`} 
                onPress={handleSaveGroupName} 
                disabled={!newGroupName.trim() || updatingName}
              >
                {updatingName ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-center font-semibold text-white text-sm">Cập nhật</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join Requests Modal */}
      <Modal
        visible={showJoinRequestsModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowJoinRequestsModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-11/12 max-w-sm max-h-[500px] overflow-hidden">
            <SafeAreaView edges={["bottom"]}>
              {/* Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <TouchableOpacity onPress={() => setShowJoinRequestsModal(false)}>
                  <Ionicons name="arrow-back" size={24} color="#0068FF" />
                </TouchableOpacity>
                <Text className="font-bold text-lg text-gray-800">Yêu cầu phê duyệt</Text>
                <TouchableOpacity onPress={loadJoinRequests} disabled={loadingRequests}>
                  <Ionicons name="refresh-outline" size={20} color="#0068FF" className={loadingRequests ? "opacity-50" : ""} />
                </TouchableOpacity>
              </View>

              {/* Requests List */}
              <ScrollView className="max-h-[380px] p-3">
                {loadingRequests ? (
                  <View className="items-center justify-center py-12">
                    <ActivityIndicator size="large" color="#0068FF" />
                    <Text className="text-gray-500 mt-3">Đang tải danh sách...</Text>
                  </View>
                ) : joinRequests.length > 0 ? (
                  joinRequests.map((request) => {
                    const user = request.user || request.sender;
                    if (!user) return null;
                    const name = user.fullName || user.full_name || user.name || "Người dùng ẩn danh";
                    const email = user.email || "";
                    const avatar = user.avatarUrl || user.avatar_url || user.avatar;
                    const hasAvatar = !!avatar && avatar !== 'null' && avatar !== 'undefined' && avatar !== '';
                    const imgUri = hasAvatar ? formatImageUrl(avatar) : getMediumAvatar(name);

                    return (
                      <View 
                        key={request.id} 
                        className="flex-row items-center justify-between p-3 bg-gray-50 rounded-xl mb-2 border border-gray-100"
                      >
                        <Image
                          source={{ uri: imgUri }}
                          className="w-11 h-11 rounded-full mr-3"
                        />
                        <View className="flex-1 min-w-0 mr-2">
                          <Text className="font-semibold text-gray-800 truncate">{name}</Text>
                          <Text className="text-xs text-gray-500 truncate">{email || "Gửi yêu cầu tham gia"}</Text>
                        </View>
                        <View className="flex-row items-center gap-1.5">
                          <TouchableOpacity 
                            onPress={() => handleRejectRequest(request.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-red-50 hover:bg-red-100"
                          >
                            <Ionicons name="close" size={16} color="#EF4444" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleApproveRequest(request.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-500 hover:bg-blue-600"
                          >
                            <Ionicons name="checkmark" size={16} color="white" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View className="items-center justify-center py-12">
                    <View className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                      <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
                    </View>
                    <Text className="text-gray-800 font-semibold text-sm">Không có yêu cầu chờ duyệt</Text>
                    <Text className="text-gray-400 text-xs mt-1 text-center px-4">
                      Tất cả các thành viên mới đã được phê duyệt.
                    </Text>
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
