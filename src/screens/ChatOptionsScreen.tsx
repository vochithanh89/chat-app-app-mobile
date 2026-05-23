import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import api, { conversationAPI, friendshipAPI, messageAPI } from "../services/api";
import { formatImageUrl, normalizeConversation, normalizeMessage, normalizeUser } from "../services/chatMappers";
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

const getFriendId = (friend: any) => friend?.uuid || friend?.id || friend?.user?.uuid || friend?.user?.id;

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

const ChatOptionsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { user: currentUser } = useAuth();
  const { user: routeUser, conversationId: routeConversationId } = route.params as {
    user: any;
    conversationId?: string;
  };

  const currentUserId = currentUser?.uuid || currentUser?.id || null;
  const normalizedRouteUser = useMemo(() => normalizeUser(routeUser || {}), [routeUser]);
  const initialConversationId =
    routeConversationId ||
    routeUser?.conversationId ||
    (routeUser?.isGroup || routeUser?.type === "group" ? routeUser?.id : null) ||
    null;

  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [muteNotifications, setMuteNotifications] = useState(false);
  const [pinnedConversation, setPinnedConversation] = useState(false);
  const [hiddenConversation, setHiddenConversation] = useState(false);
  const [autoDeleteValue, setAutoDeleteValue] = useState("never");

  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderTime, setReminderTime] = useState("");

  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const [showMembers, setShowMembers] = useState(false);
  const [showCommonGroups, setShowCommonGroups] = useState(false);
  const [showMedia, setShowMedia] = useState(true);
  const [showFiles, setShowFiles] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [showSecurity, setShowSecurity] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      const tabNavigator = navigation.getParent() as any;
      tabNavigator?.setOptions({ tabBarStyle: { display: "none" } });
      return () => tabNavigator?.setOptions({ tabBarStyle: { display: "flex" } });
    }, [navigation]),
  );

  const isGroup = Boolean(conversation?.isGroup || conversation?.type === "group" || routeUser?.isGroup || routeUser?.type === "group");
  const storagePrefix = conversationId ? `chat:options:${conversationId}` : null;
  const nicknameKey = conversationId
    ? `chat:nickname:${conversationId}:${normalizedRouteUser.id || normalizedRouteUser.uuid}`
    : null;

  const loadLocalState = useCallback(async () => {
    if (!storagePrefix) return;
    const [storedNickname, storedMute, storedPin, storedHidden, storedAutoDelete, storedReminders] = await Promise.all([
      nicknameKey ? AsyncStorage.getItem(nicknameKey) : Promise.resolve(null),
      AsyncStorage.getItem(`${storagePrefix}:mute`),
      AsyncStorage.getItem(`${storagePrefix}:pin`),
      AsyncStorage.getItem(`${storagePrefix}:hidden`),
      AsyncStorage.getItem(`${storagePrefix}:autoDelete`),
      AsyncStorage.getItem(`${storagePrefix}:reminders`),
    ]);

    setNickname(storedNickname || "");
    setNicknameDraft(storedNickname || normalizedRouteUser.name || "");
    setMuteNotifications(storedMute === "true");
    setPinnedConversation(storedPin === "true");
    setHiddenConversation(storedHidden === "true");
    setAutoDeleteValue(storedAutoDelete || "never");
    setReminders(storedReminders ? JSON.parse(storedReminders) : []);
  }, [nicknameKey, normalizedRouteUser.name, storagePrefix]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      let convId = conversationId || routeConversationId || routeUser?.conversationId || null;

      if (!convId && normalizedRouteUser.id && !normalizedRouteUser.isGroup) {
        const created = await conversationAPI.createDirectConversation(normalizedRouteUser.id);
        const raw = created?.data?.conversation || created?.conversation || null;
        if (raw) {
          const normalized = normalizeConversation(raw, currentUserId);
          convId = normalized.id;
          setConversationId(convId);
          setConversation(normalized);
        }
      }

      const requests: Promise<any>[] = [
        conversationAPI.getConversations().catch(() => ({ data: { conversations: [] } })),
        friendshipAPI.getFriends().catch(() => ({ data: { friends: [] } })),
      ];

      if (convId) {
        requests.push(conversationAPI.getConversationById(convId));
        requests.push(messageAPI.getMessages(convId, { limit: 100 }));
      }

      const [convListRes, friendsRes, convRes, msgRes] = await Promise.all(requests);
      const rawConversations = convListRes?.data?.conversations || convListRes?.conversations || [];
      const rawFriends = friendsRes?.data?.friends || friendsRes?.data?.data?.friends || friendsRes?.friends || [];

      setAllConversations(Array.isArray(rawConversations) ? rawConversations.map((item) => normalizeConversation(item, currentUserId)) : []);
      setFriends(Array.isArray(rawFriends) ? rawFriends.map((item) => normalizeUser(item)) : []);

      if (!convId) {
        setMessages([]);
        return;
      }

      const rawConversation = convRes?.data?.conversation || convRes?.conversation || convRes?.data || convRes;
      const rawMessages = msgRes?.data?.messages || msgRes?.messages || [];
      setConversation(normalizeConversation(rawConversation, currentUserId));
      const clearedAt = await AsyncStorage.getItem(`chat:options:${convId}:clearedAt`);
      const clearedAtTime = clearedAt ? new Date(clearedAt).getTime() : null;
      const normalizedMessages = Array.isArray(rawMessages)
        ? rawMessages
            .map((item: any) => normalizeMessage(item, currentUserId))
            .filter((item: any) => {
              if (!clearedAtTime) return true;
              const messageTime = item.rawTime ? new Date(item.rawTime).getTime() : 0;
              return messageTime > clearedAtTime;
            })
        : [];
      setMessages(normalizedMessages);
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || error?.message || "Không thể tải tùy chọn trò chuyện.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUserId, normalizedRouteUser.id, normalizedRouteUser.isGroup, routeConversationId, routeUser?.conversationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadLocalState();
  }, [loadLocalState]);

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

  const otherUserId = useMemo(() => {
    if (isGroup) return null;
    const member = conversation?.members?.find((item: any) => String(item?.user?.id) !== String(currentUserId));
    return member?.user?.id || normalizedRouteUser.id || null;
  }, [conversation?.members, currentUserId, isGroup, normalizedRouteUser.id]);

  const commonGroups = useMemo(() => {
    if (!otherUserId || !currentUserId) return [];
    return allConversations.filter((item) => {
      if (!item.isGroup) return false;
      const memberIds = (item.members || []).map((member: any) => String(member?.user?.id || member?.id));
      return memberIds.includes(String(currentUserId)) && memberIds.includes(String(otherUserId));
    });
  }, [allConversations, currentUserId, otherUserId]);

  const displayName = nickname || conversation?.name || normalizedRouteUser.name || "Người dùng";
  const avatar = formatImageUrl(conversation?.avatarUrl || normalizedRouteUser.avatar || normalizedRouteUser.avatarUrl) || getLargeAvatar(displayName);
  const groupMembers = conversation?.members || [];
  const targetReportId = isGroup ? conversationId : otherUserId;

  const persistToggle = async (key: string, value: boolean, setter: (value: boolean) => void) => {
    if (!storagePrefix) return;
    setter(value);
    await AsyncStorage.setItem(`${storagePrefix}:${key}`, String(value));
  };

  const saveNickname = async () => {
    if (!nicknameKey) return;
    const value = nicknameDraft.trim();
    if (value) {
      await AsyncStorage.setItem(nicknameKey, value);
    } else {
      await AsyncStorage.removeItem(nicknameKey);
    }
    setNickname(value);
    setShowNicknameModal(false);
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

  const handleCreateGroup = async () => {
    const routeUserId = normalizedRouteUser.id;
    const memberIds = Array.from(new Set([routeUserId, ...selectedFriendIds].filter(Boolean)));
    if (!groupName.trim()) {
      Alert.alert("Tạo nhóm", "Vui lòng nhập tên nhóm.");
      return;
    }
    if (memberIds.length === 0) {
      Alert.alert("Tạo nhóm", "Vui lòng chọn thành viên.");
      return;
    }

    try {
      setCreatingGroup(true);
      const response = await conversationAPI.createGroup({
        name: groupName.trim(),
        member_ids: memberIds,
      });
      const raw = response?.data?.conversation || response?.conversation || response?.data || response;
      const normalized = normalizeConversation(raw, currentUserId);
      setShowCreateGroupModal(false);
      setGroupName("");
      setSelectedFriendIds([]);
      Alert.alert("Thành công", "Đã tạo nhóm trò chuyện.", [
        {
          text: "Mở nhóm",
          onPress: () => navigation.replace("Chat", { user: normalized, conversationId: normalized.id }),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error?.response?.data?.message || error?.message || "Không thể tạo nhóm.");
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleReport = async () => {
    if (!selectedReportReason || !targetReportId) return;
    try {
      setReporting(true);
      await api.post("/api/v1/reports", {
        target_type: isGroup ? "conversation" : "user",
        target_id: targetReportId,
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
    if (!conversationId) return;
    Alert.alert("Xóa lịch sử trò chuyện", "Toàn bộ tin nhắn đã tải sẽ được xóa ở phía bạn.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            const latestMessages = conversationId
              ? await messageAPI.getMessages(conversationId, { limit: 100 }).catch(() => null)
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

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]));
  };

  const renderActionButton = (icon: any, label: string, onPress: () => void, active = false) => (
    <TouchableOpacity className="w-1/3 items-center px-1 py-2" onPress={onPress}>
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
                      <Image source={{ uri: item.url }} className="mb-2 mr-2 h-24 w-24 rounded-lg bg-gray-100" />
                    ) : (
                      <View className="mb-2 mr-2 h-24 w-24 items-center justify-center rounded-lg bg-gray-900">
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

      <View className="bg-blue-500 px-4 pb-4 pt-3 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 rounded-full p-2">
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white">Thông tin hội thoại</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0068FF" />
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 24 }}>
          <View className="mb-2 bg-white px-4 py-5">
            <View className="items-center">
              <Image source={{ uri: avatar }} className={`mb-3 h-20 w-20 ${isGroup ? "rounded-2xl" : "rounded-full"}`} />
              <Text className="text-lg font-semibold text-gray-800">{displayName}</Text>
              {isGroup ? <Text className="mt-1 text-xs text-gray-500">{groupMembers.length} thành viên</Text> : null}
              {!isGroup && nickname ? <Text className="mt-1 text-xs text-gray-500">Tên gốc: {normalizedRouteUser.name}</Text> : null}
            </View>

            <View className="mt-5 flex-row flex-wrap">
              {renderActionButton(muteNotifications ? "notifications-off" : "notifications-outline", muteNotifications ? "Bật thông báo" : "Tắt thông báo", () => persistToggle("mute", !muteNotifications, setMuteNotifications), muteNotifications)}
              {renderActionButton("pin-outline", pinnedConversation ? "Bỏ ghim" : "Ghim hội thoại", () => persistToggle("pin", !pinnedConversation, setPinnedConversation), pinnedConversation)}
              {renderActionButton("alarm-outline", "Nhắc hẹn", () => setShowReminderModal(true), reminders.length > 0)}
              {isGroup
                ? renderActionButton("settings-outline", "Quản lý nhóm", () => navigation.navigate("GroupOptions", { group: conversation }), false)
                : renderActionButton("people-outline", "Tạo nhóm trò chuyện", () => setShowCreateGroupModal(true), false)}
              {renderActionButton("search-outline", "Tìm tin nhắn", () => setShowSearchModal(true), false)}
              {!isGroup ? renderActionButton("person-outline", "Trang cá nhân", () => navigation.navigate("Profile", { user: normalizedRouteUser }), false) : null}
            </View>
          </View>

          {isGroup ? (
            <View className="mb-2 bg-white">
              {renderSectionHeader("Thành viên nhóm", groupMembers.length, showMembers, () => setShowMembers((value) => !value))}
              {showMembers ? (
                <View className="px-4 pb-3">
                  {groupMembers.map((member: any) => {
                    const memberUser = normalizeUser(member?.user || member);
                    return (
                      <View key={member?.id || memberUser.id} className="flex-row items-center py-2">
                        <Image source={{ uri: memberUser.avatarUrl || getMediumAvatar(memberUser.name) }} className="mr-3 h-10 w-10 rounded-full" />
                        <View className="flex-1">
                          <Text className="font-medium text-gray-800">{memberUser.name}</Text>
                          {member?.role && member.role !== "member" ? (
                            <Text className="text-xs text-gray-500">{member.role === "owner" ? "Trưởng nhóm" : "Phó nhóm"}</Text>
                          ) : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          ) : (
            <View className="mb-2 bg-white">
              {renderSectionHeader(commonGroups.length > 0 ? `${commonGroups.length} nhóm chung` : "Nhóm chung", null, showCommonGroups, () => setShowCommonGroups((value) => !value))}
              {showCommonGroups ? (
                <View className="px-4 pb-3">
                  {commonGroups.length === 0 ? (
                    <Text className="py-3 text-center text-sm text-gray-500">Không có nhóm chung nào.</Text>
                  ) : (
                    commonGroups.map((item) => (
                      <TouchableOpacity key={item.id} className="flex-row items-center py-2" onPress={() => navigation.navigate("Chat", { user: item, conversationId: item.id })}>
                        <Image source={{ uri: item.avatarUrl || getMediumAvatar(item.name) }} className="mr-3 h-10 w-10 rounded-xl" />
                        <View className="flex-1">
                          <Text className="font-medium text-gray-800">{item.name}</Text>
                          <Text className="text-xs text-gray-500">{item.members?.length || 0} thành viên</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ) : null}
            </View>
          )}

          <View className="mb-2">
            {renderMedia()}
            {renderFiles()}
            {renderLinks()}
          </View>

          <View className="mb-2 bg-white">
            {!isGroup ? renderRow("create-outline", "Đổi biệt danh", nickname || "Chưa đặt biệt danh", () => setShowNicknameModal(true)) : null}
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
                  <TouchableOpacity className="flex-row items-center py-2" onPress={() => persistToggle("hidden", !hiddenConversation, setHiddenConversation)}>
                    <Ionicons name="eye-off-outline" size={20} color="#4B5563" />
                    <Text className="ml-3 flex-1 text-sm text-gray-800">Ẩn trò chuyện</Text>
                    <View className={`h-6 w-11 rounded-full p-0.5 ${hiddenConversation ? "bg-blue-500" : "bg-gray-300"}`}>
                      <View className={`h-5 w-5 rounded-full bg-white ${hiddenConversation ? "ml-5" : "ml-0"}`} />
                    </View>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            {renderRow("warning-outline", "Báo xấu", "Báo cáo tài khoản hoặc hội thoại này", () => setShowReportModal(true))}
            <TouchableOpacity className="flex-row items-center px-4 py-3" onPress={handleDeleteConversation} disabled={deleting}>
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                {deleting ? <ActivityIndicator size="small" color="#EF4444" /> : <Ionicons name="trash-outline" size={20} color="#EF4444" />}
              </View>
              <Text className="flex-1 font-medium text-red-600">Xóa toàn bộ tin nhắn</Text>
              <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <Modal visible={showNicknameModal} transparent animationType="fade" onRequestClose={() => setShowNicknameModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-white p-5">
            <Text className="mb-3 text-lg font-semibold text-gray-900">Đổi biệt danh</Text>
            <TextInput value={nicknameDraft} onChangeText={setNicknameDraft} placeholder="Nhập biệt danh" className="mb-4 rounded-xl border border-gray-200 px-4 py-3 text-gray-900" />
            <View className="flex-row justify-end">
              <TouchableOpacity className="mr-2 px-4 py-2" onPress={() => setShowNicknameModal(false)}>
                <Text className="font-medium text-gray-600">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity className="rounded-lg bg-blue-500 px-4 py-2" onPress={saveNickname}>
                <Text className="font-medium text-white">Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCreateGroupModal} transparent animationType="fade" onRequestClose={() => setShowCreateGroupModal(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[82%] rounded-t-3xl bg-white p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900">Tạo nhóm trò chuyện</Text>
              <TouchableOpacity onPress={() => setShowCreateGroupModal(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <TextInput value={groupName} onChangeText={setGroupName} placeholder="Tên nhóm" className="mb-4 rounded-xl border border-gray-200 px-4 py-3 text-gray-900" maxLength={80} />
            <View className="mb-3 flex-row items-center rounded-xl bg-blue-50 p-3">
              <Image source={{ uri: normalizedRouteUser.avatarUrl || getMediumAvatar(normalizedRouteUser.name) }} className="mr-3 h-10 w-10 rounded-full" />
              <View className="flex-1">
                <Text className="font-medium text-gray-800">{normalizedRouteUser.name}</Text>
                <Text className="text-xs text-blue-600">Đã thêm vào nhóm</Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color="#0068FF" />
            </View>
            <Text className="mb-2 text-sm font-semibold text-gray-700">Thêm bạn bè</Text>
            <ScrollView className="max-h-72" showsVerticalScrollIndicator>
              {friends.filter((friend) => String(getFriendId(friend)) !== String(normalizedRouteUser.id)).map((friend) => {
                const friendId = getFriendId(friend);
                const selected = selectedFriendIds.includes(friendId);
                return (
                  <TouchableOpacity key={friendId} className="flex-row items-center border-b border-gray-50 py-3" onPress={() => toggleFriendSelection(friendId)}>
                    <Image source={{ uri: friend.avatarUrl || getMediumAvatar(friend.name) }} className="mr-3 h-11 w-11 rounded-full" />
                    <View className="flex-1">
                      <Text className="font-medium text-gray-800">{friend.name}</Text>
                      <Text className="text-xs text-gray-500">{friend.email || (friend.isOnline ? "Online" : "Offline")}</Text>
                    </View>
                    <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? "#0068FF" : "#9CA3AF"} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity className={`mt-4 rounded-2xl py-4 ${creatingGroup ? "bg-blue-300" : "bg-blue-500"}`} onPress={handleCreateGroup} disabled={creatingGroup}>
              {creatingGroup ? <ActivityIndicator color="white" /> : <Text className="text-center font-semibold text-white">Tạo nhóm</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

      <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
        <View className="flex-1 items-center justify-center bg-black/50 px-5">
          <View className="w-full rounded-2xl bg-white p-5">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-gray-900">Báo xấu</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>
            <Text className="mb-3 text-sm text-gray-600">Chọn lý do báo xấu {displayName}.</Text>
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
                        user: conversation || normalizedRouteUser,
                        conversationId: conversationId || conversation?.id,
                      });
                    }}
                  >
                    <View className="mb-1 flex-row items-center justify-between">
                      <Text className="text-xs font-semibold text-blue-600">
                        {item.sender?.name || (item.user === "me" ? "Bạn" : displayName)}
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

export default ChatOptionsScreen;
