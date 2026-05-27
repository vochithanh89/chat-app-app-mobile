import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { conversationAPI, messageAPI } from "../services/api";
import {
  normalizeConversation,
  normalizeMessage,
  normalizeUser,
  pickUserFromConversation,
  getMappedBgColor,
} from "../services/chatMappers";
import { useAuth } from "../contexts/AuthContext";
import { useTabBarVisibility } from "../hooks/useTabBarVisibility";

type RootStackParamList = {
  Chat: { user: any; conversationId?: string };
  ChatOptions: { user: any };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, "Chat">;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, "Chat">;

type PendingAttachment = {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  type: "image" | "video" | "file";
  file?: any;
};

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop&crop=face";
const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "😡"];
const COMPOSER_EMOJIS = ["😀", "😁", "😂", "😍", "🥳", "😎", "🤔", "👍", "❤️", "🔥"];
const CHAT_BUBBLE_MAX_WIDTH_RATIO = 0.74;

const formatFileSize = (value?: number) => {
  if (!value) {
    return "";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType?: string, fileName?: string) => {
  const value = `${mimeType || ""} ${fileName || ""}`.toLowerCase();

  if (value.includes("pdf")) return "document-text-outline";
  if (value.includes("sheet") || value.includes("xls")) return "grid-outline";
  if (value.includes("presentation") || value.includes("ppt")) return "easel-outline";
  if (value.includes("zip") || value.includes("rar")) return "archive-outline";
  if (value.includes("word") || value.includes("doc")) return "document-outline";
  return "document-attach-outline";
};

const ChatScreenReal = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { user: authUser } = useAuth();
  const insets = useSafeAreaInsets();
  const currentUserId = authUser?.uuid || authUser?.id || null;
  const { user: routeUser, conversationId: routeConversationId } = route.params;
  const listRef = useRef<FlatList<any> | null>(null);
  const [composerHeight, setComposerHeight] = useState(88);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    routeConversationId || routeUser?.conversationId || null,
  );
  const [chatBackground, setChatBackground] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showActions, setShowActions] = useState(false);
  const [showComposerEmojiPicker, setShowComposerEmojiPicker] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardConversations, setForwardConversations] = useState<any[]>([]);
  const [selectedForwardTargets, setSelectedForwardTargets] = useState<string[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const isWeb = Platform.OS === "web";
  const bubbleMaxWidth = Math.min(Dimensions.get("window").width * CHAT_BUBBLE_MAX_WIDTH_RATIO, 290);

  useTabBarVisibility(true);

  const resolveConversationId = useCallback(async () => {
    if (conversationId) {
      return conversationId;
    }

    const targetUser = normalizeUser(routeUser);
    const targetUserId = targetUser?.uuid || targetUser?.id;

    if (!targetUserId || targetUser.isGroup) {
      return null;
    }

    const response = await conversationAPI.createDirectConversation(targetUserId);
    const rawConversation =
      response?.data?.conversation ||
      response?.conversation ||
      null;

    if (!rawConversation) {
      return null;
    }

    const normalized = normalizeConversation(rawConversation, currentUserId);
    setConversation(normalized);
    setConversationId(normalized.id);
    return normalized.id;
  }, [conversationId, currentUserId, routeUser]);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const loadConversationData = useCallback(async () => {
    try {
      setLoading(true);

      const resolvedConversationId = await resolveConversationId();
      if (!resolvedConversationId) {
        setMessages([]);
        return;
      }

      const [conversationResponse, messagesResponse] = await Promise.all([
        conversationAPI.getConversationById(resolvedConversationId),
        messageAPI.getMessages(resolvedConversationId),
      ]);

      const rawConversation =
        conversationResponse?.data?.conversation ||
        conversationResponse?.conversation ||
        null;
      const rawMessages =
        messagesResponse?.data?.messages ||
        messagesResponse?.messages ||
        [];

      if (rawConversation) {
        console.log('[DEBUG RAW CONV]', JSON.stringify({
          commentsRestricted: rawConversation.commentsRestricted,
          comments_restricted: rawConversation.comments_restricted,
          type: rawConversation.type,
          membersCount: rawConversation.members?.length,
          memberRoles: rawConversation.members?.map((m: any) => ({
            userId: m?.user?.id || m?.user?.uuid,
            role: m?.role,
          })),
        }));
        setConversation(normalizeConversation(rawConversation, currentUserId));
      }

      const normalizedMessages = Array.isArray(rawMessages)
        ? rawMessages
            .map((item) => normalizeMessage(item, currentUserId))
            // Sắp xếp: Tin mới nhất đứng đầu mảng (Index 0)
            .sort((a, b) => new Date(b.rawTime || 0).getTime() - new Date(a.rawTime || 0).getTime())
        : [];

      setMessages(normalizedMessages);

      if (normalizedMessages.length > 0) {
        const latest = normalizedMessages[0];
        conversationAPI.markRead(resolvedConversationId, latest.id).catch(() => {});
      }

      scrollToBottom(false);
    } catch (error) {
      console.log("Load chat data error:", error);
      Alert.alert("Error", "Failed to load conversation");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, resolveConversationId, scrollToBottom]);

  useEffect(() => {
    loadConversationData();
  }, [loadConversationData]);

  useFocusEffect(
    useCallback(() => {
      loadConversationData();

      const interval = setInterval(() => {
        loadConversationData();
      }, 3000);

      return () => clearInterval(interval);
    }, [loadConversationData]),
  );

  useFocusEffect(
    useCallback(() => {
      setChatBackground(conversation?.chatBackground || null);
    }, [conversation?.chatBackground])
  );

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!showForwardModal) {
      setSelectedForwardTargets([]);
      return;
    }

    const loadConversations = async () => {
      try {
        setForwardLoading(true);
        const response = await conversationAPI.getConversations();
        const rawConversations =
          response?.data?.conversations ||
          response?.conversations ||
          [];

        const normalized = Array.isArray(rawConversations)
          ? rawConversations
              .map((item) => normalizeConversation(item, currentUserId))
              .filter((item) => item?.id && item.id !== conversationId)
          : [];

        setForwardConversations(normalized);
      } catch (error) {
        console.log("Load forward conversations error:", error);
        Alert.alert("Error", "Failed to load conversations for forwarding");
      } finally {
        setForwardLoading(false);
      }
    };

    loadConversations();
  }, [conversationId, currentUserId, showForwardModal]);

  const chatTarget = useMemo(() => {
    if (conversation) {
      return pickUserFromConversation(conversation, currentUserId);
    }

    return normalizeUser(routeUser);
  }, [conversation, currentUserId, routeUser]);

  const messageById = useMemo(() => {
    return messages.reduce((acc: Record<string, any>, item) => {
      if (item?.id) {
        acc[item.id] = item;
      }
      return acc;
    }, {});
  }, [messages]);

  const groupedPendingAttachments = useMemo(() => {
    return {
      image: pendingAttachments.filter((item) => item.type === "image"),
      video: pendingAttachments.filter((item) => item.type === "video"),
      file: pendingAttachments.filter((item) => item.type === "file"),
    };
  }, [pendingAttachments]);

  const chatTitle = conversation?.name || chatTarget?.name || "Cuộc trò chuyện";
  const headerAvatar = chatTarget?.avatarUrl || chatTarget?.avatar || FALLBACK_AVATAR;

  // Determine current user's role in the group
  const myRole = useMemo(() => {
    if (!conversation?.isGroup || !conversation?.members) return null;
    const member = conversation.members.find((m: any) => {
      const memberId = m?.user?.id || m?.id;
      return memberId === currentUserId;
    });
    console.log('[DEBUG] myRole lookup:', {
      currentUserId,
      memberFound: !!member,
      memberRole: member?.role,
      membersCount: conversation.members.length,
      memberIds: conversation.members.map((m: any) => m?.user?.id || m?.id),
    });
    return member?.role || 'member';
  }, [conversation, currentUserId]);

  // Group restriction — when comments_restricted is on, only owner/admin can post
  const isRestrictedGroup =
    conversation?.isGroup && Boolean(conversation?.commentsRestricted);
  const canPost =
    !isRestrictedGroup || myRole === 'owner' || myRole === 'admin';

  console.log('[DEBUG] canPost check:', {
    isGroup: conversation?.isGroup,
    commentsRestricted: conversation?.commentsRestricted,
    isRestrictedGroup,
    myRole,
    canPost,
  });

  const closeAllOverlays = () => {
    setShowActions(false);
    setShowAttachmentPicker(false);
    setShowComposerEmojiPicker(false);
  };

  const removePendingAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const appendPendingAttachments = (items: PendingAttachment[]) => {
    if (items.length === 0) {
      return;
    }

    setPendingAttachments((prev) => [...prev, ...items]);
  };

  const pickImages = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo library access to send images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      appendPendingAttachments(
        result.assets.map((asset) => ({
          id: `${asset.uri}-${Date.now()}`,
          uri: asset.uri,
          name: asset.fileName || `image-${Date.now()}.jpg`,
          mimeType: asset.mimeType || "image/jpeg",
          size: asset.fileSize,
          type: "image",
          file: (asset as any).file || null,
        })),
      );
      setShowAttachmentPicker(false);
    } catch (error) {
      console.log("Pick image error:", error);
      Alert.alert("Error", "Failed to select images");
    }
  };

  const pickVideos = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo library access to send videos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled) {
        return;
      }

      appendPendingAttachments(
        result.assets.map((asset) => ({
          id: `${asset.uri}-${Date.now()}`,
          uri: asset.uri,
          name: asset.fileName || `video-${Date.now()}.mp4`,
          mimeType: asset.mimeType || "video/mp4",
          size: asset.fileSize,
          type: "video",
          file: (asset as any).file || null,
        })),
      );
      setShowAttachmentPicker(false);
    } catch (error) {
      console.log("Pick video error:", error);
      Alert.alert("Error", "Failed to select videos");
    }
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: "*/*",
      });

      if (result.canceled) {
        return;
      }

      appendPendingAttachments(
        result.assets.map((asset) => ({
          id: `${asset.uri}-${Date.now()}`,
          uri: asset.uri,
          name: asset.name || `file-${Date.now()}`,
          mimeType: asset.mimeType || "application/octet-stream",
          size: asset.size,
          type: "file",
          file: (asset as any).file || null,
        })),
      );
      setShowAttachmentPicker(false);
    } catch (error) {
      console.log("Pick file error:", error);
      Alert.alert("Error", "Failed to select files");
    }
  };

  const uploadPendingAttachments = async () => {
    if (pendingAttachments.length === 0) {
      return [];
    }

    setUploading(true);
    try {
      const uploaded = await Promise.all(
        pendingAttachments.map(async (item) => {
          const response = await messageAPI.uploadAttachment(item);
          return response?.data?.attachment || response?.attachment || null;
        }),
      );

      return uploaded.filter(Boolean);
    } catch (error: any) {
      console.log("Upload attachment error:", error?.response?.data || error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    const content = message.trim();
    const hasText = Boolean(content);
    const hasAttachments = pendingAttachments.length > 0;

    if ((!hasText && !hasAttachments) || sending || uploading) {
      return;
    }

    try {
      setSending(true);
      const resolvedConversationId = await resolveConversationId();

      if (!resolvedConversationId) {
        throw new Error("Conversation not found");
      }

      const uploadedAttachments = await uploadPendingAttachments();
      const attachmentIds = uploadedAttachments
        .map((item) => item?.uuid || item?.id)
        .filter(Boolean);

      const response = await messageAPI.sendMessage(resolvedConversationId, {
        content: hasText ? content : undefined,
        reply_to_message_id: replyingTo?.id || undefined,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      });
      const rawMessage =
        response?.data?.message ||
        response?.message ||
        null;

      if (rawMessage) {
        setMessages((prev) => [
          ...prev,
          normalizeMessage(rawMessage, currentUserId),
        ]);
        conversationAPI.markRead(resolvedConversationId, rawMessage?.uuid || rawMessage?.id).catch(() => {});
      } else {
        await loadConversationData();
      }

      setMessage("");
      setReplyingTo(null);
      setPendingAttachments([]);
      setShowComposerEmojiPicker(false);
    } catch (error) {
      console.log("Send message error:", (error as any)?.response?.data || error);
      Alert.alert("Error", "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleDeleteForMe = async (messageItem: any) => {
    try {
      await messageAPI.deleteForMe(messageItem.id);
      await loadConversationData();
      setShowActions(false);
    } catch (error) {
      console.log("Delete for me error:", error);
      Alert.alert("Error", "Failed to delete message");
    }
  };

  const handleRecall = async (messageItem: any) => {
    try {
      await messageAPI.recallMessage(messageItem.id);
      await loadConversationData();
      setShowActions(false);
    } catch (error) {
      console.log("Recall message error:", error);
      Alert.alert("Error", "Failed to recall message");
    }
  };

  const handleToggleReaction = async (messageItem: any, emoji: string) => {
    try {
      const existingReaction = (messageItem?.reactions || []).find(
        (reaction: any) => reaction.emoji === emoji,
      );
      const reactedByMe = Boolean(existingReaction?.reactedByMe);

      if (reactedByMe) {
        await messageAPI.removeReaction(messageItem.id, emoji);
      } else {
        await messageAPI.reactToMessage(messageItem.id, emoji);
      }

      await loadConversationData();
      setShowActions(false);
    } catch (error) {
      console.log("Toggle reaction error:", error);
      Alert.alert("Error", "Failed to update reaction");
    }
  };

  const handleForward = async () => {
    if (!selectedMessage || selectedForwardTargets.length === 0) {
      return;
    }

    try {
      setForwarding(true);
      await messageAPI.forwardMessage(selectedMessage.id, selectedForwardTargets);
      setShowForwardModal(false);
      setShowActions(false);
      Alert.alert("Success", "Message forwarded successfully");
    } catch (error) {
      console.log("Forward message error:", error);
      Alert.alert("Error", "Failed to forward message");
    } finally {
      setForwarding(false);
    }
  };

  const openMessageActions = (messageItem: any) => {
    setSelectedMessage(messageItem);
    setShowActions(true);
  };

  const openAttachment = async (url?: string | null) => {
    if (!url) {
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Unable to open", "This file could not be opened on the device.");
      }
    } catch (error) {
      console.log("Open attachment error:", error);
      Alert.alert("Error", "Failed to open attachment");
    }
  };

  const renderReactionRow = (messageItem: any) => {
    if (!messageItem?.reactions?.length) {
      return null;
    }

    return (
      <View className={`mt-2 flex-row flex-wrap ${messageItem.user === "me" ? "justify-end" : "justify-start"}`}>
        {messageItem.reactions.map((reaction: any) => (
          <TouchableOpacity
            key={`${messageItem.id}-${reaction.emoji}`}
            className={`mr-1 mb-1 flex-row items-center rounded-full px-2 py-1 ${
              reaction.reactedByMe ? "bg-blue-100" : "bg-gray-100"
            }`}
            onPress={() => handleToggleReaction(messageItem, reaction.emoji)}
          >
            <Text className="mr-1 text-sm">{reaction.emoji}</Text>
            <Text className="text-xs text-gray-700">{reaction.count}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderReplySnippet = (messageItem: any) => {
    if (!messageItem?.replyToMessageId) {
      return null;
    }

    const replyTarget = messageById[messageItem.replyToMessageId];
    if (!replyTarget) {
      return null;
    }

    return (
      <View className="mb-2 rounded-xl border-l-4 border-blue-300 bg-black/5 px-3 py-2">
        <Text className={`text-xs font-semibold ${messageItem.user === "me" ? "text-blue-50" : "text-blue-600"}`}>
          {replyTarget?.sender?.name || "Message"}
        </Text>
        <Text
          className={`mt-1 text-xs ${messageItem.user === "me" ? "text-blue-100" : "text-gray-600"}`}
          numberOfLines={2}
        >
          {replyTarget?.isRecalled
            ? "[Message recalled]"
            : replyTarget?.content ||
              replyTarget?.fileAttachments?.[0]?.fileName ||
              replyTarget?.imageAttachments?.[0]?.fileName ||
              replyTarget?.videoAttachments?.[0]?.fileName ||
              "Attachment"}
        </Text>
      </View>
    );
  };

  const renderAttachmentBlocks = (messageItem: any) => {
    const images = messageItem?.imageAttachments || [];
    const videos = messageItem?.videoAttachments || [];
    const files = messageItem?.fileAttachments || [];

    if (images.length === 0 && videos.length === 0 && files.length === 0) {
      return null;
    }

    return (
      <View className="mt-2">
        {images.length > 0 && (
          <View className="mb-2">
            <Text className={`mb-2 text-xs font-semibold ${messageItem.user === "me" ? "text-blue-100" : "text-gray-500"}`}>
              Hình ảnh
            </Text>
            <View className="flex-row flex-wrap">
              {images.map((attachment: any) => (
                <TouchableOpacity
                  key={attachment.id}
                  className="mb-2 mr-2 overflow-hidden rounded-2xl"
                  onPress={() => openAttachment(attachment.url)}
                >
                  <Image
                    source={{ uri: attachment.url || attachment.uri }}
                    className="h-36 w-36 bg-gray-200"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {videos.length > 0 && (
          <View className="mb-2">
            <Text className={`mb-2 text-xs font-semibold ${messageItem.user === "me" ? "text-blue-100" : "text-gray-500"}`}>
              Video
            </Text>
            {videos.map((attachment: any) => (
              <TouchableOpacity
                key={attachment.id}
                className={`mb-2 flex-row items-center rounded-2xl px-3 py-3 ${
                  messageItem.user === "me" ? "bg-blue-400" : "bg-gray-100"
                }`}
                onPress={() => openAttachment(attachment.url)}
              >
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-black/10">
                  <Ionicons name="videocam" size={20} color={messageItem.user === "me" ? "white" : "#2563EB"} />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-sm font-semibold ${messageItem.user === "me" ? "text-white" : "text-gray-800"}`}
                    numberOfLines={1}
                  >
                    {attachment.fileName}
                  </Text>
                  <Text className={`mt-1 text-xs ${messageItem.user === "me" ? "text-blue-100" : "text-gray-500"}`}>
                    {formatFileSize(attachment.fileSize) || "Nhấn để mở"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {files.length > 0 && (
          <View>
            <Text className={`mb-2 text-xs font-semibold ${messageItem.user === "me" ? "text-blue-100" : "text-gray-500"}`}>
              Tệp
            </Text>
            {files.map((attachment: any) => (
              <TouchableOpacity
                key={attachment.id}
                className={`mb-2 flex-row items-center rounded-2xl px-3 py-3 ${
                  messageItem.user === "me" ? "bg-blue-400" : "bg-gray-100"
                }`}
                onPress={() => openAttachment(attachment.url)}
              >
                <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-black/10">
                  <Ionicons
                    name={getFileIcon(attachment.mimeType, attachment.fileName) as any}
                    size={20}
                    color={messageItem.user === "me" ? "white" : "#2563EB"}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-sm font-semibold ${messageItem.user === "me" ? "text-white" : "text-gray-800"}`}
                    numberOfLines={1}
                  >
                    {attachment.fileName}
                  </Text>
                  <Text className={`mt-1 text-xs ${messageItem.user === "me" ? "text-blue-100" : "text-gray-500"}`}>
                    {formatFileSize(attachment.fileSize) || "Nhấn để mở"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderPendingAttachmentSection = (
    title: string,
    items: PendingAttachment[],
    tint: string,
    icon: keyof typeof Ionicons.glyphMap,
  ) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <View className="mb-3 rounded-2xl bg-gray-50 px-3 py-3">
        <View className="mb-2 flex-row items-center">
          <Ionicons name={icon} size={16} color={tint} />
          <Text className="ml-2 text-sm font-semibold text-gray-800">{title}</Text>
        </View>
        {items.map((item) => (
          <View key={item.id} className="mb-2 flex-row items-center rounded-xl bg-white px-3 py-2">
            {item.type === "image" ? (
              <Image source={{ uri: item.uri }} className="mr-3 h-12 w-12 rounded-xl bg-gray-200" />
            ) : (
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                <Ionicons
                  name={item.type === "video" ? "videocam" : (getFileIcon(item.mimeType, item.name) as any)}
                  size={20}
                  color="#2563EB"
                />
              </View>
            )}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
                {item.name}
              </Text>
              <Text className="mt-1 text-xs text-gray-500">{formatFileSize(item.size)}</Text>
            </View>
            <TouchableOpacity onPress={() => removePendingAttachment(item.id)} className="ml-2 p-1">
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.user === "me";

    const isSystem = typeof item.content === 'string' && item.content.startsWith('__system__:');
    if (isSystem) {
      const parts = item.content.split(':');
      const action = parts[1]; // 'joined', 'left', 'added', 'removed', 'nickname-changed', 'custom'
      let text = '';
      const member = conversation?.members?.find((m: any) =>
        m.user?.id === item.sender?.id ||
        m.user?.uuid === item.sender?.uuid ||
        m.userId === item.sender?.id ||
        m.userId === item.sender?.uuid
      );
      const senderName = member?.nickname || item.sender?.name || 'Thành viên';
      
      if (action === 'joined') {
        text = `${senderName} đã tham gia nhóm`;
      } else if (action === 'left') {
        text = `${senderName} đã rời khỏi nhóm`;
      } else if (action === 'added') {
        text = `${senderName} đã thêm ${parts[3] || 'thành viên'} vào nhóm`;
      } else if (action === 'removed') {
        text = `${senderName} đã xóa ${parts[3] || 'thành viên'} khỏi nhóm`;
      } else if (action === 'group-name-changed') {
        text = `${senderName} đã đổi tên nhóm thành ${parts.slice(2).join(':')}`;
      } else if (action === 'group-avatar-changed') {
        text = `${senderName} đã đổi ảnh đại diện nhóm`;
      } else if (action === 'group-bg-changed') {
        text = `${senderName} đã đổi ảnh nền cuộc trò chuyện`;
      } else if (action === 'custom') {
        text = parts.slice(2).join(':');
      } else if (action === 'nickname-changed') {
        const targetUuid = parts[2];
        const newNickname = parts.slice(3).join(':');
        const targetMember = conversation?.members?.find((m: any) =>
          m.user?.uuid === targetUuid ||
          m.user?.id === targetUuid ||
          m.userId === targetUuid
        );
        const targetName = targetMember?.user?.name || 'thành viên';
        text = newNickname
          ? `${senderName} đã đặt biệt danh cho ${targetName} là ${newNickname}`
          : `${senderName} đã gỡ biệt danh của ${targetName}`;
      } else {
        text = item.content;
      }

      return (
        <View style={styles.systemMessageContainer}>
          <View style={styles.systemMessagePill}>
            <Text style={styles.systemMessageText}>{text}</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}>
        <TouchableOpacity
          activeOpacity={0.9}
          onLongPress={() => openMessageActions(item)}
          delayLongPress={250}
          style={[
            styles.messageTouch,
            isWeb ? { width: bubbleMaxWidth, maxWidth: bubbleMaxWidth } : { maxWidth: bubbleMaxWidth },
          ]}
        >
          <View style={[styles.messageBubble, isMine ? styles.messageBubbleMine : styles.messageBubbleOther]}>
            {item.forwardedFromId ? (
              <Text className={`mb-2 text-xs italic ${isMine ? "text-blue-100" : "text-gray-500"}`}>
                Tin nhắn chuyển tiếp
              </Text>
            ) : null}

            {renderReplySnippet(item)}

            {item.isRecalled ? (
              <Text className={`text-sm italic ${isMine ? "text-blue-100" : "text-gray-500"}`}>
                [Tin nhắn đã thu hồi]
              </Text>
            ) : (
              <>
                {item.content ? (
                  <Text
                    className={`text-sm leading-5 ${isMine ? "text-white" : "text-gray-800"}`}
                    style={[styles.messageText, isWeb ? styles.messageTextWeb : null]}
                  >
                    {item.content}
                  </Text>
                ) : null}
                {renderAttachmentBlocks(item)}
              </>
            )}

            <View className={`mt-2 flex-row items-center ${isMine ? "justify-end" : "justify-start"}`}>
              <Text className={`text-xs ${isMine ? "text-blue-100" : "text-gray-400"}`}>{item.time}</Text>
              {isMine ? (
                <Ionicons name="checkmark-done" size={12} color="#DBEAFE" style={{ marginLeft: 4 }} />
              ) : null}
            </View>
          </View>
        </TouchableOpacity>
        {renderReactionRow(item)}
      </View>
    );
  };

  const replyingPreview = replyingTo ? messageById[replyingTo.id] || replyingTo : null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <View className="bg-blue-500 px-4 pt-3 pb-4 shadow-sm">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 rounded-full p-2">
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>

            {chatTitle === "Tài liệu của tôi" ? (
              <View className="mr-3 h-12 w-12 rounded-full border-2 border-white bg-blue-500 items-center justify-center">
                <Ionicons name="cloud" size={24} color="white" />
              </View>
            ) : (
              <Image
                source={{ uri: headerAvatar }}
                className="mr-3 h-12 w-12 rounded-full border-2 border-white"
              />
            )}

            <View className="flex-1">
              <Text className="text-lg font-bold text-white">{chatTitle}</Text>
              <Text className="text-sm text-blue-100">
                {chatTitle === "Tài liệu của tôi"
                  ? "Nơi lưu trữ cá nhân"
                  : (conversation?.isGroup
                    ? `${conversation?.members?.length || 0} thành viên`
                    : chatTarget?.email === 'ai-bot@system.local'
                      ? ''
                      : chatTarget?.isOnline
                        ? "Trực tuyến"
                        : "Ngoại tuyến")}
              </Text>
            </View>

            <TouchableOpacity
              className="rounded-full bg-white/20 p-2"
              onPress={() => navigation.navigate("ChatOptions", { user: conversation || chatTarget })}
            >
              <Ionicons name="ellipsis-vertical" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {(() => {
          const isPresetColor = chatBackground && (chatBackground.startsWith('#') || chatBackground.startsWith('linear-gradient'));
          const isCustomImage = chatBackground && !chatBackground.startsWith('#') && !chatBackground.startsWith('linear-gradient');

          const listContent = loading ? (
            <View style={styles.listArea} className="items-center justify-center">
              <ActivityIndicator size="large" color="#0068FF" />
            </View>
          ) : (
            <View style={styles.listArea}>
              <FlatList
                ref={listRef}
                data={messages}
                keyExtractor={(item) => item.id}
                renderItem={renderMessage}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingBottom: (isWeb ? 12 : composerHeight + insets.bottom + 12),
                  flexGrow: messages.length === 0 ? 1 : 0,
                }}
                ListEmptyComponent={
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="chatbubble-ellipses-outline" size={48} color="#9CA3AF" />
                    <Text className="mt-3 text-gray-500">Chưa có tin nhắn</Text>
                  </View>
                }
                onContentSizeChange={() => scrollToBottom(false)}
              />
            </View>
          );

          if (isCustomImage) {
            return (
              <ImageBackground
                source={{ uri: chatBackground }}
                style={styles.listArea}
                resizeMode="cover"
              >
                {listContent}
              </ImageBackground>
            );
          } else {
            return (
              <View style={[styles.listArea, { backgroundColor: getMappedBgColor(chatBackground, false, null) }]}>
                {listContent}
              </View>
            );
          }
        })()}

        {!canPost ? (
          <View
            className="border-t border-gray-200 bg-white px-4 py-4"
            style={[
              isWeb ? styles.composerContainerWeb : styles.composerContainer,
              { paddingBottom: Math.max(insets.bottom, 12) },
            ]}
            onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
          >
            <View className="flex-row items-center justify-center rounded-2xl bg-blue-50 px-4 py-3">
              <Ionicons name="lock-closed" size={16} color="#3B82F6" style={{ marginRight: 8 }} />
              <Text className="flex-1 text-center text-sm text-gray-600">
                Chỉ <Text className="font-semibold text-blue-500">trưởng/phó nhóm</Text> được gửi tin nhắn vào nhóm.
              </Text>
            </View>
          </View>
        ) : (
        <View
          className="border-t border-gray-200 bg-white px-3 py-2"
          style={[
            isWeb ? styles.composerContainerWeb : styles.composerContainer,
            { paddingBottom: Math.max(insets.bottom, 8) },
          ]}
          onLayout={(event) => setComposerHeight(event.nativeEvent.layout.height)}
        >
          {replyingPreview ? (
            <View className="mb-3 flex-row items-center rounded-2xl bg-blue-50 px-3 py-3">
              <View className="mr-3 h-10 w-1 rounded-full bg-blue-500" />
              <View className="flex-1">
                <Text className="text-xs font-semibold text-blue-600">
                  Đang trả lời {replyingPreview?.sender?.name || "tin nhắn"}
                </Text>
                <Text className="mt-1 text-sm text-gray-700" numberOfLines={2}>
                  {replyingPreview?.isRecalled
                    ? "[Tin nhắn đã thu hồi]"
                    : replyingPreview?.content ||
                      replyingPreview?.fileAttachments?.[0]?.fileName ||
                      replyingPreview?.imageAttachments?.[0]?.fileName ||
                      replyingPreview?.videoAttachments?.[0]?.fileName ||
                      "Tệp đính kèm"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} className="ml-3 p-1">
                <Ionicons name="close" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          ) : null}

          {renderPendingAttachmentSection("Ảnh", groupedPendingAttachments.image, "#2563EB", "image-outline")}
          {renderPendingAttachmentSection("Video", groupedPendingAttachments.video, "#2563EB", "videocam-outline")}
          {renderPendingAttachmentSection("Tệp", groupedPendingAttachments.file, "#2563EB", "document-attach-outline")}

          {showComposerEmojiPicker ? (
            <View className="mb-3 rounded-2xl bg-gray-50 px-3 py-3">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {COMPOSER_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-white"
                    onPress={() => setMessage((prev) => `${prev}${emoji}`)}
                  >
                    <Text className="text-2xl">{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null}

          <View className="flex-row items-end">
            <TouchableOpacity className="mr-3 rounded-full p-2" onPress={() => setShowAttachmentPicker(true)}>
              <Ionicons name="attach" size={22} color="#4B5563" />
            </TouchableOpacity>

            <View className="mr-3 flex-1 rounded-3xl bg-gray-100 px-4 py-2">
              <TextInput
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#9CA3AF"
                value={message}
                onChangeText={setMessage}
                multiline
                style={styles.input}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              className="mr-2 rounded-full p-2"
              onPress={() => {
                setShowComposerEmojiPicker((prev) => !prev);
                setShowAttachmentPicker(false);
              }}
            >
              <Ionicons name="happy-outline" size={22} color="#4B5563" />
            </TouchableOpacity>

            <TouchableOpacity
              className={`rounded-full p-3 ${
                message.trim() || pendingAttachments.length > 0 ? "bg-blue-500" : "bg-gray-300"
              }`}
              onPress={handleSend}
              disabled={sending || uploading || (!message.trim() && pendingAttachments.length === 0)}
            >
              {sending || uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={16} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
        )}

        <Modal visible={showAttachmentPicker} transparent animationType="fade" onRequestClose={() => setShowAttachmentPicker(false)}>
          <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setShowAttachmentPicker(false)}>
            <Pressable className="rounded-t-3xl bg-white px-5 pb-8 pt-5">
              <Text className="mb-4 text-base font-semibold text-gray-800">Gửi tệp đính kèm</Text>
              <View className="flex-row justify-between">
                <TouchableOpacity className="items-center" onPress={pickFiles}>
                  <View className="mb-2 h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                    <Ionicons name="document-attach-outline" size={24} color="#0F172A" />
                  </View>
                  <Text className="text-sm text-gray-700">Tệp</Text>
                </TouchableOpacity>
                <TouchableOpacity className="items-center" onPress={pickImages}>
                  <View className="mb-2 h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
                    <Ionicons name="image-outline" size={24} color="#2563EB" />
                  </View>
                  <Text className="text-sm text-gray-700">Hình ảnh</Text>
                </TouchableOpacity>
                <TouchableOpacity className="items-center" onPress={pickVideos}>
                  <View className="mb-2 h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                    <Ionicons name="videocam-outline" size={24} color="#059669" />
                  </View>
                  <Text className="text-sm text-gray-700">Video</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={showActions} transparent animationType="fade" onRequestClose={() => setShowActions(false)}>
          <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setShowActions(false)}>
            <Pressable className="rounded-t-3xl bg-white px-5 pb-8 pt-5">
              <Text className="mb-4 text-base font-semibold text-gray-800">Thao tác tin nhắn</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                {REACTION_EMOJIS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-gray-100"
                    onPress={() => selectedMessage && handleToggleReaction(selectedMessage, emoji)}
                  >
                    <Text className="text-2xl">{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                className="mb-2 flex-row items-center rounded-2xl px-3 py-3"
                onPress={() => {
                  setReplyingTo(selectedMessage);
                  setShowActions(false);
                }}
              >
                <Ionicons name="arrow-undo-outline" size={20} color="#2563EB" />
                <Text className="ml-3 text-sm text-gray-800">Trả lời</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="mb-2 flex-row items-center rounded-2xl px-3 py-3"
                onPress={() => {
                  setShowForwardModal(true);
                  setShowActions(false);
                }}
              >
                <Ionicons name="share-social-outline" size={20} color="#2563EB" />
                <Text className="ml-3 text-sm text-gray-800">Chuyển tiếp</Text>
              </TouchableOpacity>

              {selectedMessage?.user === "me" && !selectedMessage?.isRecalled ? (
                <TouchableOpacity
                  className="mb-2 flex-row items-center rounded-2xl px-3 py-3"
                  onPress={() =>
                    Alert.alert("Thu hồi tin nhắn", "Thu hồi tin nhắn này cho tất cả mọi người?", [
                      { text: "Hủy", style: "cancel" },
                      {
                        text: "Thu hồi",
                        style: "destructive",
                        onPress: () => handleRecall(selectedMessage),
                      },
                    ])
                  }
                >
                  <Ionicons name="refresh-outline" size={20} color="#F97316" />
                  <Text className="ml-3 text-sm text-gray-800">Thu hồi cho cả hai bên</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                className="flex-row items-center rounded-2xl px-3 py-3"
                onPress={() =>
                  Alert.alert("Xóa tin nhắn", "Xóa tin nhắn này chỉ ở phía bạn?", [
                    { text: "Hủy", style: "cancel" },
                    {
                      text: "Xóa",
                      style: "destructive",
                      onPress: () => handleDeleteForMe(selectedMessage),
                    },
                  ])
                }
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />
                <Text className="ml-3 text-sm text-red-600">Xóa ở phía tôi</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={showForwardModal} transparent animationType="fade" onRequestClose={() => setShowForwardModal(false)}>
          <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setShowForwardModal(false)}>
            <Pressable className="max-h-[75%] rounded-t-3xl bg-white px-5 pb-8 pt-5">
              <Text className="mb-4 text-base font-semibold text-gray-800">Chuyển tiếp tin nhắn</Text>

              {forwardLoading ? (
                <View className="items-center justify-center py-8">
                  <ActivityIndicator size="small" color="#2563EB" />
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {forwardConversations.map((item) => {
                    const checked = selectedForwardTargets.includes(item.id);

                    return (
                      <TouchableOpacity
                        key={item.id}
                        className="mb-2 flex-row items-center rounded-2xl bg-gray-50 px-3 py-3"
                        onPress={() =>
                          setSelectedForwardTargets((prev) =>
                            checked ? prev.filter((id) => id !== item.id) : [...prev, item.id],
                          )
                        }
                      >
                        <Image
                          source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
                          className="mr-3 h-11 w-11 rounded-full"
                        />
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-gray-800">{item.name}</Text>
                          <Text className="mt-1 text-xs text-gray-500">
                            {item.isGroup ? `${item.members?.length || 0} thành viên` : "Trò chuyện riêng"}
                          </Text>
                        </View>
                        <Ionicons
                          name={checked ? "checkmark-circle" : "ellipse-outline"}
                          size={22}
                          color={checked ? "#2563EB" : "#9CA3AF"}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <TouchableOpacity
                className={`mt-4 rounded-2xl py-4 ${
                  selectedForwardTargets.length > 0 ? "bg-blue-500" : "bg-gray-300"
                }`}
                onPress={handleForward}
                disabled={forwarding || selectedForwardTargets.length === 0}
              >
                {forwarding ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-center text-sm font-semibold text-white">Chuyển tiếp</Text>
                )}
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  systemMessageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    width: '100%',
  },
  systemMessagePill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxWidth: '95%',
  },
  systemMessageText: {
    color: '#6B7280',
    fontSize: 11,
    textAlign: 'center',
  },
  keyboardContainer: {
    flex: 1,
    minHeight: 0,
  },
  listArea: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
    minHeight: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  composerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  composerContainerWeb: {
    position: "relative",
  },
  messageRow: {
    marginBottom: 16,
    width: "100%",
  },
  messageRowMine: {
    alignItems: "flex-end",
  },
  messageRowOther: {
    alignItems: "flex-start",
  },
  messageTouch: {
    minWidth: 120,
  },
  messageBubble: {
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: "100%",
  },
  messageBubbleMine: {
    backgroundColor: "#3B82F6",
  },
  messageBubbleOther: {
    backgroundColor: "#FFFFFF",
  },
  messageText: {
    flexShrink: 1,
    lineHeight: 20,
    width: "100%",
  },
  messageTextWeb: {
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  } as any,
  input: {
    maxHeight: 112,
    minHeight: 20,
    fontSize: 14,
    color: "#1F2937",
    paddingVertical: 0,
  },
});

export default ChatScreenReal;
