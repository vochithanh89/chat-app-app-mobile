import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import { useAudioRecorder, useAudioPlayer, useAudioPlayerStatus, useAudioRecorderState, RecordingPresets, AudioModule } from "expo-audio";
import { getSmallAvatar, getMediumAvatar } from "../utils/avatarUtils";

const VideoAttachment = ({ uri }: { uri: string }) => {
  const player = useVideoPlayer(uri, (player) => {
    player.loop = false;
  });
  const videoViewRef = useRef<any>(null);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        if (videoViewRef.current) {
          videoViewRef.current.enterFullscreen();
          player.play();
        }
      }}
      style={{ width: 220, height: 150, borderRadius: 12, overflow: "hidden", marginVertical: 4, position: "relative" }}
    >
      <VideoView
        ref={videoViewRef}
        style={{ flex: 1 }}
        player={player}
        nativeControls={false}
      />
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.2)", justifyContent: "center", alignItems: "center" }}>
        <Ionicons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
      </View>
    </TouchableOpacity>
  );
};

const AudioMessageBubble = ({ uri, durationMs, isMine }: { uri: string; durationMs?: number; isMine: boolean }) => {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  
  const totalDurationSeconds = durationMs ? durationMs / 1000 : (status.duration || 0);
  const currentTime = status.currentTime || 0;
  const isPlaying = status.playing;

  const togglePlay = () => {
    if (isPlaying) {
      player.pause();
    } else {
      if (currentTime >= totalDurationSeconds - 0.1) {
        player.seekTo(0);
      }
      player.play();
    }
  };

  const displayTime = isPlaying || currentTime > 0 ? formatTime(currentTime) : formatTime(totalDurationSeconds);

  return (
    <View style={[
      styles.audioBubbleContainer, 
      isMine ? styles.audioBubbleMine : styles.audioBubbleOther
    ]}>
      <TouchableOpacity 
        style={[styles.audioPlayButton, { backgroundColor: isMine ? "white" : ZALO_BLUE }]} 
        onPress={togglePlay}
      >
        <Ionicons 
          name={isPlaying ? "pause" : "play"} 
          size={18} 
          color={isMine ? ZALO_BLUE : "white"} 
          style={!isPlaying ? { marginLeft: 2 } : null}
        />
      </TouchableOpacity>

      <View style={styles.audioBarsContainer}>
        {[0, 1, 2].map((i) => {
          let barHeight = [10, 18, 8][i];
          if (isPlaying) {
            barHeight = [14, 22, 12][(i + Math.floor(currentTime * 2)) % 3];
          }
          return (
            <View 
              key={i} 
              style={[
                styles.audioBar, 
                { height: barHeight, backgroundColor: isMine ? "white" : ZALO_BLUE }
              ]} 
            />
          );
        })}
      </View>

      <Text style={[styles.audioTimeText, isMine ? styles.textWhite : styles.textBlack]}>
        {displayTime}
      </Text>
    </View>
  );
};

// API & Context (Giả định theo project của bạn)
import { conversationAPI, messageAPI, friendshipAPI } from "../services/api";
import { normalizeConversation, normalizeMessage, normalizeUser, pickUserFromConversation, getMappedBgColor } from "../services/chatMappers";
import { useAuth } from "../contexts/AuthContext";
import { useTabBarVisibility } from "../hooks/useTabBarVisibility";
import { useCall } from "../contexts/CallContext";
import { socketService } from "../services/socketService";
import PollBubble from "../components/PollBubble";
import CreatePollModal from "../components/CreatePollModal";

/** --- TYPES --- **/
type RootStackParamList = {
  Chat: { user: any; conversationId?: string };
  ChatOptions: { user: any; conversationId?: string };
  GroupOptions: { group: any };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, "Chat">;
type ChatScreenNavigationProp = StackNavigationProp<RootStackParamList, "Chat">;

interface PendingAttachment {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  type: "image" | "video" | "file";
  file?: any;
}

/** --- CONSTANTS --- **/
const ZALO_BLUE = "#0068FF";
const FALLBACK_AVATAR = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120";
const REACTION_EMOJIS = ["❤️", "👍", "😂", "😮", "😢", "😡"];
const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🙏", "🎉"];
const WINDOW_WIDTH = Dimensions.get("window").width;
const getConversationStoragePrefix = (value?: string | null) =>
  value ? `chat:options:${value}` : null;

const formatTime = (seconds: number) => {
  if (!isFinite(seconds) || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

import { useTheme } from "../contexts/ThemeContext";

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { isDarkMode, colors } = useTheme();
  const { user: authUser } = useAuth();
  const insets = useSafeAreaInsets();
  const currentUserId = authUser?.uuid || authUser?.id || null;
  const { user: routeUser, conversationId: routeConversationId } = route.params;
  const { startCall, startGroupCall, joinGroupCall, ongoingGroupCalls, callState } = useCall();

  // Refs
  const listRef = useRef<FlatList>(null);

  // States
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [chatNickname, setChatNickname] = useState("");
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(
    routeConversationId || routeUser?.conversationId || null,
  );
  const [chatBackground, setChatBackground] = useState<string | null>(null);

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordDurationSeconds, setRecordDurationSeconds] = useState(0);
  const recordingTimerRef = useRef<any>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Expo Audio Recording Hook
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Modal/Overlay States
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showActions, setShowActions] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardConversations, setForwardConversations] = useState<any[]>([]);
  const [selectedForwardTargets, setSelectedForwardTargets] = useState<string[]>([]);
  const [forwardLoading, setForwardLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [viewingImageUri, setViewingImageUri] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCreatePoll, setShowCreatePoll] = useState(false);

  // Hide tab bar on mount
  useTabBarVisibility(true);

  const currentUserRole = useMemo(() => {
    if (!conversation?.members || !currentUserId) return 'member';
    const member = conversation.members.find((m: any) => {
      const memberId = m.user?.uuid || m.user?.id || m.userId || m.id;
      return memberId && String(memberId) === String(currentUserId);
    });
    return member?.role || 'member';
  }, [conversation?.members, currentUserId]);

  const isGroup = conversation?.isGroup || conversation?.type === 'group';
  const commentsRestricted = conversation?.commentsRestricted;
  const canComment = !isGroup || !commentsRestricted || currentUserRole === 'owner' || currentUserRole === 'admin';

  /** --- LOGIC XỬ LÝ DỮ LIỆU --- **/

  const resolveConversationId = useCallback(async () => {
    if (conversationId) {
      return conversationId;
    }

    const routeConversation = routeConversationId || routeUser?.conversationId;
    if (routeConversation) {
      setConversationId(routeConversation);
      return routeConversation;
    }

    const targetUser = normalizeUser(routeUser);
    const targetUserId = targetUser?.uuid || targetUser?.id;
    if (!targetUserId || targetUser.isGroup) {
      return null;
    }

    const response = await conversationAPI.createDirectConversation(targetUserId);
    const rawConversation = response?.data?.conversation || response?.conversation || null;
    if (!rawConversation) {
      return null;
    }

    const normalized = normalizeConversation(rawConversation, currentUserId);
    setConversation(normalized);
    setConversationId(normalized.id);
    return normalized.id;
  }, [conversationId, currentUserId, routeConversationId, routeUser]);

  const loadData = useCallback(async () => {
    try {
      const convId = await resolveConversationId();
      if (!convId) {
        setMessages([]);
        return;
      }

      const storagePrefix = getConversationStoragePrefix(convId);
      const clearedAt = storagePrefix
        ? await AsyncStorage.getItem(`${storagePrefix}:clearedAt`)
        : null;

      const [convRes, msgRes] = await Promise.all([
        conversationAPI.getConversationById(convId),
        messageAPI.getMessages(convId, { limit: 100 })
      ]);

      const rawMessages = msgRes?.data?.messages || msgRes?.messages || [];
      const normalized = rawMessages
        .map((m: any) => normalizeMessage(m, currentUserId))
        .filter((item: any) => {
          if (!clearedAt) return true;
          const rawTime = item?.rawTime ? new Date(item.rawTime).getTime() : 0;
          return rawTime > new Date(clearedAt).getTime();
        })
        .sort((a: any, b: any) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime());

      setMessages(normalized);
      if (convRes?.data?.conversation) {
        setConversation(normalizeConversation(convRes.data.conversation, currentUserId));
      }
      
      if (normalized.length > 0) {
        conversationAPI.markRead(convId, normalized[0].id).catch(() => {});
      }
    } catch (error) {
      console.error("Load Chat Error:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUserId, resolveConversationId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(loadData, 5000); // Polling 5s

      // Listen for poll:updated socket events
      const unsubPollUpdated = socketService.on('poll:updated', (pollData: any) => {
        if (!pollData?.id) return;
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.poll && msg.poll.id === pollData.id) {
              return { ...msg, poll: pollData };
            }
            return msg;
          })
        );
      });

      // Listen for message:new with poll data
      const unsubNewMessage = socketService.on('message:new', async (msgData: any) => {
        if (!msgData?.id) return;
        const normalized = normalizeMessage(msgData, currentUserId);
        
        // Trigger notification vibration if notifications are enabled and message is from another user
        try {
          const storedNotif = await AsyncStorage.getItem("settings:notification");
          if (storedNotif !== "false") {
            const senderId = msgData?.sender_id || msgData?.sender?.id || msgData?.sender?.uuid || null;
            if (senderId && String(senderId) !== String(currentUserId)) {
              Vibration.vibrate(500);
            }
          }
        } catch (error) {
          console.error("Lỗi rung trong ChatScreen:", error);
        }

        setMessages((prev) => {
          // Avoid duplicate
          if (prev.some((m) => m.id === normalized.id)) return prev;
          return [normalized, ...prev];
        });

        const convId = conversation?.id || conversationId || routeConversationId || routeUser?.conversationId;
        if (convId) {
          conversationAPI.markRead(convId, normalized.id).catch(() => {});
        }
      });

      // Listen for message recall
      const unsubRecalled = socketService.on('message:recalled', () => {
        loadData();
      });

      // Listen for reaction add
      const unsubReactionAdded = socketService.on('message:reaction:added', () => {
        loadData();
      });

      // Listen for reaction remove
      const unsubReactionRemoved = socketService.on('message:reaction:removed', () => {
        loadData();
      });

      // Listen for group settings / members change
      const unsubMembersChanged = socketService.on('conversation:members-changed', () => {
        loadData();
      });

      // Listen for message pinned
      const unsubPinned = socketService.on('message:pinned', () => {
        loadData();
      });

      // Listen for message unpinned
      const unsubUnpinned = socketService.on('message:unpinned', () => {
        loadData();
      });

      // Listen for presence changes in real-time
      const unsubPresence = socketService.on('presence:changed', ({ userId, isOnline, lastSeenAt }: any) => {
        setConversation((prev: any) => {
          if (!prev || prev.type !== 'direct') return prev;
          const members = prev.members?.map((m: any) => {
            const mId = m.user?.uuid || m.user?.id || m.userId;
            if (mId === userId) {
              return {
                ...m,
                user: { ...m.user, isOnline, online: isOnline, lastSeenAt },
              };
            }
            return m;
          });
          
          const otherMember = members.find((member: any) => member?.user?.id && member.user.id !== currentUserId)?.user || null;
          return { 
            ...prev, 
            members,
            otherUser: otherMember,
            online: Boolean(otherMember?.isOnline),
            isOnline: Boolean(otherMember?.isOnline)
          };
        });
      });

      return () => {
        clearInterval(interval);
        unsubPollUpdated();
        unsubNewMessage();
        unsubRecalled();
        unsubReactionAdded();
        unsubReactionRemoved();
        unsubMembersChanged();
        unsubPinned();
        unsubUnpinned();
        unsubPresence();
      };
    }, [loadData, currentUserId])
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const loadNickname = () => {
        const userId = routeUser?.id || routeUser?.uuid;
        if (!conversation || !userId) {
          if (active) setChatNickname("");
          return;
        }
        const targetMember = conversation.members?.find((m: any) =>
          m.user?.id === userId ||
          m.user?.uuid === userId ||
          m.userId === userId
        );
        if (active) setChatNickname(targetMember?.nickname || "");
      };
      loadNickname();
      return () => {
        active = false;
      };
    }, [conversation, routeUser?.id, routeUser?.uuid])
  );

  useFocusEffect(
    useCallback(() => {
      setChatBackground(conversation?.chatBackground || null);
    }, [conversation?.chatBackground])
  );

  const messageById = useMemo(() => {
    return messages.reduce((acc: Record<string, any>, item: any) => {
      if (item?.id) {
        acc[item.id] = item;
      }
      return acc;
    }, {});
  }, [messages]);

  /** --- ACTIONS --- **/

  const handleSend = async () => {
    if ((!message.trim() && pendingAttachments.length === 0) || sending) return;

    try {
      setSending(true);
      const convId = await resolveConversationId();
      if (!convId) {
        Alert.alert("Lỗi", "Không thể mở cuộc trò chuyện");
        return;
      }

      let attachmentIds: string[] = [];
      if (pendingAttachments.length > 0) {
        const uploads = await Promise.all(
          pendingAttachments.map(item => messageAPI.uploadAttachment(item))
        );
        attachmentIds = uploads.map(u => u?.data?.attachment?.id).filter(Boolean);
      }

      await messageAPI.sendMessage(convId, {
        content: message.trim() || undefined,
        reply_to_message_id: replyingTo?.id,
        attachment_ids: attachmentIds
      });

      const storagePrefix = getConversationStoragePrefix(convId);
      if (storagePrefix) {
        await AsyncStorage.removeItem(`${storagePrefix}:clearedAt`);
      }

      setMessage("");
      setReplyingTo(null);
      setPendingAttachments([]);
      loadData();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gửi tin nhắn");
    } finally {
      setSending(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newAssets: PendingAttachment[] = result.assets.map(a => ({
        id: Math.random().toString(),
        uri: a.uri,
        name: a.fileName || "image.jpg",
        mimeType: a.mimeType || "image/jpeg",
        type: "image",
        file: (a as any).file || null
      }));
      setPendingAttachments(prev => [...prev, ...newAssets]);
    }
    setShowAttachmentPicker(false);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true
      });
      if (!result.canceled && result.assets) {
        const newAssets: PendingAttachment[] = result.assets.map(a => ({
          id: Math.random().toString(),
          uri: a.uri,
          name: a.name || "document.pdf",
          mimeType: a.mimeType || "application/octet-stream",
          type: "file",
          size: a.size,
          file: (a as any).file || null
        }));
        setPendingAttachments(prev => [...prev, ...newAssets]);
      }
    } catch (err) {
      console.log("DocumentPicker error:", err);
    }
    setShowAttachmentPicker(false);
  };

  const startRecording = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert("Quyền truy cập", "Vui lòng cho phép ứng dụng truy cập Microphone trong cài đặt thiết bị để ghi âm.");
        return;
      }
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      await recorder.prepareToRecordAsync();
      await recorder.record();
      
      setIsRecording(true);
      setRecordDurationSeconds(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordDurationSeconds((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Start recording error:", error);
      Alert.alert("Lỗi", "Không thể bắt đầu ghi âm.");
    }
  };

  const cancelRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      await recorder.stop();
      setIsRecording(false);
      setRecordDurationSeconds(0);
    } catch (error) {
      console.error("Cancel recording error:", error);
      setIsRecording(false);
    }
  };

  const stopAndSendRecording = async () => {
    try {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      
      await recorder.stop();
      setIsRecording(false);
      
      const uri = recorder.uri;
      const durationMs = recordDurationSeconds * 1000;
      setRecordDurationSeconds(0);
      
      if (!uri) {
        Alert.alert("Lỗi", "Không tìm thấy tệp ghi âm.");
        return;
      }

      setSending(true);
      const convId = await resolveConversationId();
      if (!convId) {
        Alert.alert("Lỗi", "Không thể mở cuộc trò chuyện");
        return;
      }

      const voiceAttachment = {
        id: Math.random().toString(),
        uri: uri,
        name: `voice_${Date.now()}.m4a`,
        mimeType: "audio/m4a",
        type: "audio" as const,
        durationMs: durationMs,
      };

      const uploadResult = await messageAPI.uploadAttachment(voiceAttachment);
      const attachmentId = uploadResult?.data?.attachment?.id;
      
      if (!attachmentId) {
        throw new Error("Failed to get attachment ID");
      }

      await messageAPI.sendMessage(convId, {
        attachment_ids: [attachmentId]
      });

      const storagePrefix = getConversationStoragePrefix(convId);
      if (storagePrefix) {
        await AsyncStorage.removeItem(`${storagePrefix}:clearedAt`);
      }

      loadData();
    } catch (error) {
      console.error("Send recording error:", error);
      Alert.alert("Lỗi", "Không thể gửi tin nhắn thoại.");
    } finally {
      setSending(false);
    }
  };

  const openForwardModal = async () => {
    const currentConversationId = routeConversationId || conversation?.id || routeUser?.conversationId;

    setShowActions(false);
    setShowForwardModal(true);
    setSelectedForwardTargets([]);
    setForwardLoading(true);

    try {
      const response = await conversationAPI.getConversations();
      const items = response?.data?.conversations || response?.conversations || [];
      const normalized = Array.isArray(items)
        ? items
          .map((item: any) => normalizeConversation(item, currentUserId))
          .filter((item: any) => item?.id && item.id !== currentConversationId)
        : [];
      setForwardConversations(normalized);
    } catch (error) {
      console.log("Load forward conversations error:", error);
      Alert.alert("Lỗi", "Không thể tải các cuộc trò chuyện để chuyển tiếp");
      setShowForwardModal(false);
    } finally {
      setForwardLoading(false);
    }
  };

  const toggleForwardTarget = (conversationId: string) => {
    setSelectedForwardTargets((prev) =>
      prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId],
    );
  };

  const handleForwardSelected = async () => {
    const messageId = selectedMessage?.id;
    if (!messageId || selectedForwardTargets.length === 0 || forwarding) {
      return;
    }

    try {
      setForwarding(true);
      await messageAPI.forwardMessage(messageId, selectedForwardTargets);
      setShowForwardModal(false);
      setSelectedForwardTargets([]);
      setSelectedMessage(null);
      Alert.alert("Thành công", "Đã chuyển tiếp tin nhắn thành công");
    } catch (error) {
      console.log("Forward message error:", error);
      Alert.alert("Lỗi", "Không thể chuyển tiếp tin nhắn");
    } finally {
      setForwarding(false);
    }
  };

  const handleDeleteMessage = async () => {
    const messageId = selectedMessage?.id;
    if (!messageId) {
      return;
    }

    try {
      await messageAPI.deleteForMe(messageId);
      setShowActions(false);
      setSelectedMessage(null);
      await loadData();
    } catch (error) {
      console.log("Delete message error:", error);
      Alert.alert("Lỗi", "Không thể xóa tin nhắn");
    }
  };

  const handlePinMessage = async () => {
    const messageId = selectedMessage?.id;
    if (!messageId) {
      return;
    }

    try {
      await messageAPI.pinMessage(messageId);
      setShowActions(false);
      setSelectedMessage(null);
      await loadData();
    } catch (error) {
      console.log("Pin message error:", error);
      Alert.alert("Lỗi", "Không thể ghim tin nhắn");
    }
  };

  const handleUnpinMessage = async () => {
    const messageId = selectedMessage?.id;
    if (!messageId) {
      return;
    }

    try {
      await messageAPI.unpinMessage(messageId);
      setShowActions(false);
      setSelectedMessage(null);
      await loadData();
    } catch (error) {
      console.log("Unpin message error:", error);
      Alert.alert("Lỗi", "Không thể bỏ ghim tin nhắn");
    }
  };

  const handleToggleReaction = async (messageItem: any, emoji: string) => {
    const messageId = messageItem?.id;
    if (!messageId) {
      return;
    }

    const myReaction = Array.isArray(messageItem?.reactions)
      ? messageItem.reactions.find((reaction: any) => reaction?.emoji === emoji && reaction?.reactedByMe)
      : null;

    try {
      if (myReaction) {
        await messageAPI.removeReaction(messageId, emoji);
      } else {
        await messageAPI.reactToMessage(messageId, emoji);
      }

      setShowActions(false);
      setSelectedMessage(null);
      await loadData();
    } catch (error) {
      console.log("Toggle reaction error:", error);
      Alert.alert("Lỗi", "Không thể cập nhật biểu cảm");
    }
  };

  /** --- RENDER HELPERS --- **/

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.user === "me";
    const isGroup = conversation?.isGroup || conversation?.type === 'group';
    const member = conversation?.members?.find((m: any) =>
      m.user?.id === item.sender?.id ||
      m.user?.uuid === item.sender?.uuid ||
      m.userId === item.sender?.id ||
      m.userId === item.sender?.uuid
    );
    const senderName = member?.nickname || item.sender?.name || 'Người dùng';
    const senderAvatar = item.sender?.avatar || item.sender?.avatarUrl || FALLBACK_AVATAR;
    const hasPoll = !!item.poll;

    const isSystem = typeof item.content === 'string' && item.content.startsWith('__system__:');
    if (isSystem) {
      const parts = item.content.split(':');
      const action = parts[1]; // 'joined', 'left', 'added', 'removed', 'nickname-changed', 'custom'
      let text = '';
      if (action === 'joined') {
        text = `${senderName} đã tham gia nhóm`;
      } else if (action === 'left') {
        text = `${senderName} đã rời khỏi nhóm`;
      } else if (action === 'added') {
        text = `${senderName} đã thêm ${parts[3] || 'thành viên'} vào nhóm`;
      } else if (action === 'removed') {
        text = `${senderName} đã xóa ${parts[3] || 'thành viên'} khỏi nhóm`;
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
      <View style={[styles.messageContainer, isMine ? styles.mineAlign : styles.otherAlign]}>
        {isGroup && !isMine ? (
          <View style={styles.groupSenderRow}>
            <Image source={{ uri: senderAvatar }} style={styles.groupSenderAvatar} />
            <Text style={styles.groupSenderName} numberOfLines={1}>{senderName}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          onLongPress={() => {
            setSelectedMessage(item);
            setShowActions(true);
          }}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          {hasPoll ? (
            <View style={isGroup && !isMine ? { marginLeft: 36 } : undefined}>
              <PollBubble
                poll={item.poll}
                isMine={isMine}
                currentUserId={currentUserId}
                onUpdated={(updatedPoll: any) => {
                  setMessages((prev: any[]) =>
                    prev.map((msg: any) =>
                      msg.id === item.id ? { ...msg, poll: updatedPoll } : msg
                    )
                  );
                }}
              />
              <View style={styles.messageFooter}>
                <Text style={[styles.timeText, { color: "#AAA" }]}>{item.time}</Text>
              </View>
            </View>
          ) : (
            <View style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleOther,
              !isMine && isDarkMode ? { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 } : null,
              isGroup && !isMine ? { marginLeft: 36 } : undefined
            ]}>
              {item.replyToMessageId ? (
                <View style={styles.replyInBubble}>
                  <Text style={[styles.replyText, isDarkMode ? { color: colors.textSecondary } : null]} numberOfLines={1}>
                    {messageById[item.replyToMessageId]?.content || "Đang trả lời tin nhắn..."}
                  </Text>
                </View>
              ) : null}

              {item.imageAttachments && item.imageAttachments.length > 0 ? (
                <View style={styles.messageImagesContainer}>
                  {item.imageAttachments.map((img: any) => (
                    <TouchableOpacity key={img.id} onPress={() => setViewingImageUri(img.url)}>
                      <Image
                        source={{ uri: img.url }}
                        style={styles.messageImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Video Attachments */}
              {item.videoAttachments && item.videoAttachments.length > 0 ? (
                <View style={styles.messageImagesContainer}>
                  {item.videoAttachments.map((vid: any) => (
                    <VideoAttachment key={vid.id} uri={vid.url} />
                  ))}
                </View>
              ) : null}

              {/* File Attachments */}
              {item.fileAttachments && item.fileAttachments.length > 0 ? (
                <View style={styles.messageImagesContainer}>
                  {item.fileAttachments.map((file: any) => (
                    <TouchableOpacity key={file.id} style={styles.messageFile} onPress={() => Linking.openURL(file.url)}>
                      <Ionicons name="document" size={20} color={isMine ? "white" : ZALO_BLUE} />
                      <Text style={[styles.messageFileText, isMine ? styles.textWhite : styles.textBlack]} numberOfLines={1}>
                        {file.fileName || "File"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {/* Audio Attachments */}
              {item.audioAttachments && item.audioAttachments.length > 0 ? (
                <View style={styles.messageImagesContainer}>
                  {item.audioAttachments.map((audio: any) => (
                    <AudioMessageBubble
                      key={audio.id}
                      uri={audio.url}
                      durationMs={audio.durationMs || audio.duration_ms}
                      isMine={isMine}
                    />
                  ))}
                </View>
              ) : null}

              {(() => {
                const content = item.content || item.text || "";
                
                // Handle active call start message
                if (content.includes("[GROUP_CALL:STARTED]")) {
                  const isActive = !!ongoingGroupCalls[conversation?.id];
                  return (
                    <View style={styles.callMessageContainer}>
                      <View style={styles.callMessageHeader}>
                        <View style={[styles.callIconBox, { backgroundColor: isActive ? "#4CD964" : "#9CA3AF" }]}>
                          <Ionicons name="videocam" size={20} color="white" />
                        </View>
                        <Text style={[styles.callMessageTitle, { color: isMine ? "white" : "#333" }]}>
                          {isActive ? "Cuộc họp đang diễn ra" : "Cuộc họp nhóm đã bắt đầu"}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={[styles.callJoinButton, { backgroundColor: isMine ? "white" : "#0068FF" }]}
                        onPress={() => joinGroupCall(conversation?.id, 'video')}
                      >
                        <Text style={[styles.callJoinButtonText, { color: isMine ? "#0068FF" : "white" }]}>
                          {isActive ? "Tham gia ngay" : "Tham gia cuộc họp"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                }

                // Handle call ended message
                if (content.includes("Cuộc gọi nhóm kết thúc")) {
                  return (
                    <View style={styles.callEndContainer}>
                      <Ionicons name="call" size={16} color={isMine ? "#E0E0E0" : "#666"} style={{ marginRight: 8 }} />
                      <Text style={[styles.callEndText, { color: isMine ? "#E0E0E0" : "#666" }]}>{content}</Text>
                    </View>
                  );
                }

                if (item.isRecalled) {
                  return (
                    <Text style={[styles.messageText, { fontStyle: "italic", color: isMine ? "#E0E0E0" : isDarkMode ? colors.textSecondary : "#777" }]}>
                      Tin nhắn đã được thu hồi
                    </Text>
                  );
                }

                return (
                  <Text style={[styles.messageText, isMine ? styles.textWhite : isDarkMode ? { color: colors.text } : styles.textBlack]}>
                    {content}
                  </Text>
                );
              })()}

              <View style={styles.messageFooter}>
                <Text style={[styles.timeText, isMine ? {color: "#E0E0E0"} : {color: "#AAA"}]}>{item.time}</Text>
                {isMine ? <Ionicons name="checkmark-done" size={14} color="#E0E0E0" /> : null}
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Reactions Row */}
        {item.reactions && item.reactions.length > 0 ? (
          <View style={[styles.reactionRow, isMine ? styles.reactionMine : styles.reactionOther]}>
            {item.reactions.map((r: any, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={[styles.reactionTag, r.reactedByMe ? styles.reactionTagActive : null]}
                onPress={() => handleToggleReaction(item, r.emoji)}
              >
                <Text style={{ fontSize: 12 }}>{r.emoji} {r.count}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  const handleCall = (type: "video" | "audio") => {
    const convId = routeConversationId || conversation?.id;
    if (conversation?.isGroup || conversation?.type === "group") {
      startGroupCall(convId, type, conversation.name || "Group Call");
    } else {
      startCall(routeUser.id || routeUser.uuid, type, convId, routeUser);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode ? { backgroundColor: colors.background } : null]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        {routeUser?.name === "Tài liệu của tôi" ? (
          <View style={[styles.avatar, { backgroundColor: "#3B82F6", alignItems: 'center', justifyContent: 'center', borderRadius: 20 }]}>
            <Ionicons name="cloud" size={20} color="white" />
          </View>
        ) : (
          <Image source={{ uri: routeUser?.avatar || FALLBACK_AVATAR }} style={styles.avatar} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{chatNickname || routeUser?.name || "Người dùng"}</Text>
          <Text style={styles.headerSub}>
            {routeUser?.name === "Tài liệu của tôi"
              ? "Nơi lưu trữ cá nhân"
              : ((conversation ? conversation.isOnline : (routeUser?.online ?? routeUser?.isOnline ?? false))
                ? "Trực tuyến"
                : "Ngoại tuyến")}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {routeUser?.name !== "Tài liệu của tôi" && (
            <>
              <TouchableOpacity onPress={() => handleCall('audio')}>
                <Ionicons name="call-outline" size={22} color="white" style={{ marginRight: 15 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleCall('video')}>
                <Ionicons name="videocam-outline" size={24} color="white" style={{ marginRight: 15 }} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => {
            if (conversation?.isGroup || conversation?.type === 'group') {
              navigation.navigate("GroupOptions", { group: conversation });
            } else {
              navigation.navigate("ChatOptions", {
                user: routeUser,
                conversationId: conversation?.id || conversationId || routeUser?.conversationId,
              });
            }
          }}>
            <Ionicons name="menu-outline" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Ongoing Call Banner */}
      {conversation?.isGroup && !!ongoingGroupCalls[conversation.id] && callState === 'idle' ? (
        <View style={styles.activeCallBanner}>
          <View style={styles.activeCallIconWrap}>
            <Ionicons name="videocam" size={20} color="white" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.activeCallText}>Cuộc họp đang diễn ra</Text>
            <Text style={styles.activeCallSub}>Tham gia để cùng trò chuyện</Text>
          </View>
          <TouchableOpacity 
            style={styles.joinCallBtn}
            onPress={() => joinGroupCall(conversation.id, ongoingGroupCalls[conversation.id].type || 'video')}
          >
            <Text style={styles.joinCallBtnText}>Tham gia</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Pinned Messages Banner */}
      {(() => {
        const pinned = messages.filter((m) => m.isPinned && !m.isRecalled);
        if (pinned.length === 0) return null;
        const latestPinned = pinned[0];
        
        const getPinnedPreview = (msg: any) => {
          if (!msg) return "";
          if (msg.isRecalled) return "Tin nhắn đã thu hồi";
          if (msg.content) return msg.content;
          if (msg.imageAttachments && msg.imageAttachments.length > 0) return "[Hình ảnh]";
          if (msg.videoAttachments && msg.videoAttachments.length > 0) return "[Video]";
          if (msg.audioAttachments && msg.audioAttachments.length > 0) return "[Tin nhắn thoại]";
          if (msg.fileAttachments && msg.fileAttachments.length > 0) return "[Tài liệu]";
          return "[Tệp đính kèm]";
        };

        const handleScrollToPinned = () => {
          const index = messages.findIndex((m) => m.id === latestPinned.id);
          if (index !== -1) {
            try {
              listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
            } catch (e) {
              console.log("Scroll to pinned error:", e);
            }
          }
        };

        const handleUnpinPinned = async () => {
          try {
            await messageAPI.unpinMessage(latestPinned.id);
            loadData();
          } catch (error) {
            Alert.alert("Lỗi", "Không thể bỏ ghim tin nhắn.");
          }
        };

        return (
          <View style={[styles.pinnedBanner, isDarkMode ? { backgroundColor: colors.card, borderBottomColor: colors.border } : null]}>
            <TouchableOpacity style={styles.pinnedBannerContent} onPress={handleScrollToPinned}>
              <Ionicons name="pin" size={16} color={ZALO_BLUE} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.pinnedBannerTitle, isDarkMode ? { color: colors.text } : null]} numberOfLines={1}>
                  Tin nhắn ghim ({pinned.length})
                </Text>
                <Text style={[styles.pinnedBannerText, isDarkMode ? { color: colors.textSecondary } : null]} numberOfLines={1}>
                  {getPinnedPreview(latestPinned)}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pinnedBannerClose} onPress={handleUnpinPinned}>
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Message List */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        style={{ flex: 1 }}
      >
        {(() => {
          const isPresetColor = chatBackground && (chatBackground.startsWith('#') || chatBackground.startsWith('linear-gradient'));
          const isCustomImage = chatBackground && !chatBackground.startsWith('#') && !chatBackground.startsWith('linear-gradient');

          const listContent = loading ? (
            <ActivityIndicator style={{ flex: 1 }} color={ZALO_BLUE} />
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color="#9CA3AF" />
              <Text style={[styles.emptyText, isDarkMode ? { color: colors.textSecondary } : null]}>Chưa có tin nhắn</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              inverted // Đảo ngược list để tối ưu chat
              contentContainerStyle={styles.listContent}
              style={{ flex: 1 }}
            />
          );

          if (isCustomImage) {
            return (
              <ImageBackground
                source={{ uri: chatBackground }}
                style={{ flex: 1 }}
                resizeMode="cover"
              >
                {listContent}
              </ImageBackground>
            );
          } else {
            return (
              <View style={{ flex: 1, backgroundColor: getMappedBgColor(chatBackground, isDarkMode, colors) }}>
                {listContent}
              </View>
            );
          }
        })()}

        {/* Composer */}
        {!canComment ? (
          <View style={[styles.restrictedComposer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 15 }]}>
            <Ionicons name="lock-closed" size={16} color={isDarkMode ? colors.textSecondary : "#777"} style={{ marginRight: 8 }} />
            <Text style={[styles.restrictedText, isDarkMode ? { color: colors.textSecondary } : null]}>Chỉ trưởng và phó nhóm mới được gửi tin nhắn vào nhóm này.</Text>
          </View>
        ) : (
          <View style={[styles.composer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom || 10 }]}>
            {replyingTo ? (
              <View style={[styles.replyBar, isDarkMode ? { backgroundColor: colors.background } : null]}>
                <View style={styles.replySide} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.replyName}>Trả lời {replyingTo.sender?.name}</Text>
                  <Text style={[styles.replyContent, isDarkMode ? { color: colors.textSecondary } : null]} numberOfLines={1}>{replyingTo.content}</Text>
                </View>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            ) : null}

            {pendingAttachments.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pendingAttachmentsContainer}>
                {pendingAttachments.map(item => (
                  <View key={item.id} style={styles.pendingAttachmentItem}>
                    <Image source={{ uri: item.uri }} style={styles.pendingAttachmentImage} />
                    <TouchableOpacity
                      style={styles.pendingAttachmentRemove}
                      onPress={() => setPendingAttachments(prev => prev.filter(p => p.id !== item.id))}
                    >
                      <Ionicons name="close-circle" size={22} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {isRecording ? (
              <View style={styles.inputRow}>
                <View style={styles.recordingIndicatorContainer}>
                  <Animated.View style={[styles.recordingDot, { opacity: pulseAnim }]} />
                  <Text style={styles.recordingTimerText}>{formatTime(recordDurationSeconds)}</Text>
                </View>
                <TouchableOpacity style={styles.recordingCancelBtn} onPress={cancelRecording}>
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  <Text style={styles.recordingCancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.recordingSendBtn} onPress={stopAndSendRecording}>
                  <Ionicons name="send" size={20} color="white" />
                  <Text style={styles.recordingSendText}>Gửi</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inputRow}>
                <TouchableOpacity onPress={() => setShowAttachmentPicker(true)}>
                  <Ionicons name="add-circle-outline" size={28} color={isDarkMode ? colors.textSecondary : "#666"} />
                </TouchableOpacity>
                {conversation?.isGroup || conversation?.type === 'group' ? (
                  <TouchableOpacity onPress={() => setShowCreatePoll(true)} style={{ marginLeft: 4 }}>
                    <Ionicons name="bar-chart-outline" size={22} color="#7C3AED" />
                  </TouchableOpacity>
                ) : null}
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBackground, color: colors.text }]}
                  placeholder="Tin nhắn"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                  multiline
                  value={message}
                  onChangeText={setMessage}
                />
                {message.trim().length > 0 || pendingAttachments.length > 0 ? (
                  <TouchableOpacity onPress={handleSend}>
                    <Ionicons name="send" size={24} color={ZALO_BLUE} />
                  </TouchableOpacity>
                ) : (
                  <>
                    <TouchableOpacity onPress={() => setShowEmojiPicker(true)}>
                      <Ionicons name="happy-outline" size={26} color={isDarkMode ? colors.textSecondary : "#666"} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={startRecording} style={styles.microphoneBtn}>
                      <Ionicons name="mic-outline" size={26} color={isDarkMode ? colors.textSecondary : "#666"} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modals & Overlays */}
      <Modal visible={showActions} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setShowActions(false)}>
          <View style={styles.actionSheet}>
            <View style={styles.reactionPicker}>
              {REACTION_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiBtn}
                  onPress={() => handleToggleReaction(selectedMessage, emoji)}
                >
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.actionMenu}>
              <ActionItem icon="arrow-undo-outline" label="Trả lời" onPress={() => { setReplyingTo(selectedMessage); setShowActions(false); }} />
              <ActionItem icon="copy-outline" label="Sao chép" />
              {selectedMessage && selectedMessage.isPinned ? (
                <ActionItem icon="pin-outline" label="Bỏ ghim tin nhắn" onPress={handleUnpinMessage} />
              ) : (
                <ActionItem icon="pin" label="Ghim tin nhắn" onPress={handlePinMessage} />
              )}
              <ActionItem icon="share-outline" label="Chuyển tiếp" onPress={openForwardModal} />
              <ActionItem icon="trash-outline" label="Xóa" color="#FF3B30" onPress={handleDeleteMessage} />
            </View>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showForwardModal} transparent animationType="slide">
        <Pressable
          style={styles.overlay}
          onPress={() => {
            setShowForwardModal(false);
            setSelectedForwardTargets([]);
          }}
        >
          <Pressable style={styles.forwardSheet} onPress={() => { }}>
            <Text style={styles.forwardTitle}>Chuyển tiếp tin nhắn</Text>

            {forwardLoading ? (
              <View style={styles.forwardLoadingWrap}>
                <ActivityIndicator color={ZALO_BLUE} />
              </View>
            ) : (
              <FlatList
                data={forwardConversations}
                keyExtractor={(item) => item.id}
                style={styles.forwardList}
                renderItem={({ item }) => {
                  const selected = selectedForwardTargets.includes(item.id);

                  return (
                    <TouchableOpacity
                      style={styles.forwardRow}
                      onPress={() => toggleForwardTarget(item.id)}
                    >
                      <Image
                        source={{ uri: item.avatarUrl || FALLBACK_AVATAR }}
                        style={styles.forwardAvatar}
                      />
                      <Text style={styles.forwardName} numberOfLines={1}>{item.name}</Text>
                      <Ionicons
                        name={selected ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={selected ? ZALO_BLUE : "#9CA3AF"}
                      />
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.forwardEmptyWrap}>
                    <Text style={styles.forwardEmptyText}>Không có cuộc trò chuyện nào</Text>
                  </View>
                }
              />
            )}

            <View style={styles.forwardActions}>
              <TouchableOpacity
                style={styles.forwardCancelButton}
                onPress={() => {
                  setShowForwardModal(false);
                  setSelectedForwardTargets([]);
                }}
              >
                <Text style={styles.forwardCancelText}>Hủy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.forwardSendButton,
                  (selectedForwardTargets.length === 0 || forwarding) ? styles.forwardSendButtonDisabled : null,
                ]}
                onPress={handleForwardSelected}
                disabled={selectedForwardTargets.length === 0 || forwarding}
              >
                {forwarding ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.forwardSendText}>Chuyển tiếp</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Attachment Picker Modal */}
      <Modal visible={showAttachmentPicker} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowAttachmentPicker(false)}>
          <View style={styles.attachmentSheet}>
            <TouchableOpacity style={styles.attachBtn} onPress={pickImage}>
              <Ionicons name="image" size={30} color="#4CD964" />
              <Text>Ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
              <Ionicons name="document" size={30} color="#FF9500" />
              <Text>Tài liệu</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Quick Emoji Picker Modal */}
      <Modal visible={showEmojiPicker} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setShowEmojiPicker(false)}>
          <View style={styles.emojiSheet}>
            {QUICK_EMOJIS.map(emoji => (
              <TouchableOpacity 
                key={emoji} 
                style={styles.quickEmojiBtn}
                onPress={async () => {
                  setShowEmojiPicker(false);
                  try {
                    const convId = conversationId || conversation?.id || routeConversationId || routeUser?.conversationId;
                    if (convId) {
                      await messageAPI.sendMessage(convId, { content: emoji });
                      loadData();
                    }
                  } catch(e) {}
                }}
              >
                <Text style={styles.quickEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ImageViewer Modal */}
      <Modal visible={!!viewingImageUri} transparent animationType="fade" onRequestClose={() => setViewingImageUri(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" }}>
          <TouchableOpacity
            style={{ position: "absolute", top: 40, right: 20, zIndex: 10, padding: 10 }}
            onPress={() => setViewingImageUri(null)}
          >
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          {viewingImageUri ? (
            <Image
              source={{ uri: viewingImageUri }}
              style={{ width: "100%", height: "80%" }}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* Create Poll Modal */}
      <CreatePollModal
        visible={showCreatePoll}
        onClose={() => setShowCreatePoll(false)}
        conversationId={conversationId || conversation?.id || routeConversationId || ''}
        onCreated={() => loadData()}
      />
    </SafeAreaView>
  );
};

const ActionItem = ({ icon, label, onPress, color = "#333" }: any) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={[styles.actionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

/** --- STYLES --- **/
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
  container: { flex: 1, backgroundColor: "#F4F5F7" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 100 },
  emptyText: { color: "#6B7280", marginTop: 8, fontSize: 14 },
  restrictedComposer: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  restrictedText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  header: {
    height: 60,
    backgroundColor: ZALO_BLUE,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },
  headerTitle: { color: "white", fontSize: 18, fontWeight: "600" },
  headerSub: { color: "#D1D1D1", fontSize: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginHorizontal: 10 },
  headerActions: { flexDirection: "row", alignItems: "center" },

  listContent: { padding: 15 },
  messageContainer: { marginBottom: 15, maxWidth: "80%" },
  mineAlign: { alignSelf: "flex-end" },
  otherAlign: { alignSelf: "flex-start" },
  groupSenderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupSenderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  groupSenderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    maxWidth: 180,
  },

  bubble: { borderRadius: 18, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 1 },
  bubbleMine: { backgroundColor: ZALO_BLUE },
  bubbleOther: { backgroundColor: "white" },
  replyInBubble: { borderLeftWidth: 2, borderLeftColor: "#93C5FD", paddingLeft: 8, marginBottom: 6 },
  replyText: { fontSize: 12, color: "#374151" },

  messageText: { fontSize: 16, lineHeight: 22 },
  textWhite: { color: "white" },
  textBlack: { color: "#1A1A1A" },

  messageImagesContainer: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4, marginTop: 4 },
  messageImage: { width: 140, height: 140, borderRadius: 8, margin: 2, backgroundColor: "#E5E5E5" },
  messageFile: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.1)", padding: 8, borderRadius: 8, marginVertical: 2, width: 200 },
  messageFileText: { marginLeft: 8, flex: 1, fontSize: 13 },

  messageFooter: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, alignItems: "center" },
  timeText: { fontSize: 11, color: "#AAA", marginRight: 4 },

  composer: { backgroundColor: "white", borderTopWidth: 1, borderTopColor: "#E5E5E5", padding: 10 },
  inputRow: { flexDirection: "row", alignItems: "center" },
  input: { flex: 1, backgroundColor: "#F0F0F0", borderRadius: 20, paddingHorizontal: 15, paddingVertical: 8, marginHorizontal: 10, maxHeight: 100 },

  replyBar: { flexDirection: "row", backgroundColor: "#F9F9F9", padding: 8, borderRadius: 8, marginBottom: 10, alignItems: "center" },
  replySide: { width: 3, height: "100%", backgroundColor: ZALO_BLUE, marginRight: 10 },
  replyName: { fontWeight: "bold", fontSize: 12, color: ZALO_BLUE },
  replyContent: { fontSize: 13, color: "#666" },

  pendingAttachmentsContainer: { marginBottom: 10, maxHeight: 80, paddingVertical: 5 },
  pendingAttachmentItem: { marginRight: 12, position: "relative" },
  pendingAttachmentImage: { width: 70, height: 70, borderRadius: 8, backgroundColor: "#E5E5E5" },
  pendingAttachmentRemove: { position: "absolute", top: -8, right: -8, backgroundColor: "white", borderRadius: 12 },

  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  actionSheet: { width: "85%", backgroundColor: "white", borderRadius: 15, overflow: "hidden" },
  reactionPicker: { flexDirection: "row", justifyContent: "space-around", padding: 15, borderBottomWidth: 1, borderBottomColor: "#EEE" },
  emojiBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  actionMenu: { paddingVertical: 10 },
  actionItem: { flexDirection: "row", padding: 15, alignItems: "center" },
  actionLabel: { marginLeft: 15, fontSize: 16 },

  reactionRow: { flexDirection: "row", marginTop: -5 },
  reactionMine: { justifyContent: "flex-end", marginRight: 10 },
  reactionOther: { justifyContent: "flex-start", marginLeft: 10 },
  reactionTag: { backgroundColor: "white", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: "#EEE" },
  reactionTagActive: { backgroundColor: "#E0EEFF", borderColor: "#93C5FD" },

  forwardSheet: {
    width: "92%",
    maxHeight: "75%",
    backgroundColor: "white",
    borderRadius: 14,
    padding: 16,
  },
  forwardTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", marginBottom: 12 },
  forwardLoadingWrap: { paddingVertical: 24, alignItems: "center" },
  forwardList: { maxHeight: 360 },
  forwardRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  forwardAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  forwardName: { flex: 1, fontSize: 14, color: "#111827" },
  forwardEmptyWrap: { paddingVertical: 20, alignItems: "center" },
  forwardEmptyText: { color: "#6B7280" },
  forwardActions: { flexDirection: "row", marginTop: 12 },
  forwardCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginRight: 8,
  },
  forwardCancelText: { color: "#374151", fontWeight: "600" },
  forwardSendButton: {
    flex: 1,
    backgroundColor: ZALO_BLUE,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginLeft: 8,
  },
  forwardSendButtonDisabled: { opacity: 0.5 },
  forwardSendText: { color: "white", fontWeight: "700" },

  attachmentSheet: { width: "100%", backgroundColor: "white", position: "absolute", bottom: 0, padding: 20, flexDirection: "row", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  attachBtn: { alignItems: "center", marginRight: 30 },
  
  emojiSheet: { width: "100%", backgroundColor: "white", position: "absolute", bottom: 0, padding: 20, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  quickEmojiBtn: { padding: 15 },
  quickEmojiText: { fontSize: 32 },
  activeCallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F2FF',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#D1E4FF',
  },
  activeCallIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CD964',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeCallText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0068FF',
  },
  activeCallSub: {
    fontSize: 12,
    color: '#666',
  },
  joinCallBtn: {
    backgroundColor: '#0068FF',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
  },
  joinCallBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Call Message Styles
  callMessageContainer: {
    padding: 10,
    minWidth: 200,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  callMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  callIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  callMessageTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  callJoinButton: {
    backgroundColor: '#0068FF',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  callJoinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  callEndContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  callEndText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  
  // Audio message styles
  audioBubbleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
    minWidth: 150,
  },
  audioBubbleMine: {
    backgroundColor: ZALO_BLUE,
  },
  audioBubbleOther: {
    backgroundColor: "#F3F4F6",
  },
  audioPlayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  audioBarsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 24,
    marginHorizontal: 12,
    gap: 3,
  },
  audioBar: {
    width: 3,
    borderRadius: 1.5,
  },
  audioTimeText: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: "auto",
  },
  
  // Recording styles
  recordingComposer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    backgroundColor: "white",
  },
  recordingIndicatorContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF3B30",
    marginRight: 8,
  },
  recordingTimerText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF3B30",
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recordingCancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFEBEE",
    marginRight: 10,
  },
  recordingCancelText: {
    color: "#FF3B30",
    fontWeight: "600",
    marginLeft: 4,
    fontSize: 14,
  },
  recordingSendBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: ZALO_BLUE,
  },
  recordingSendText: {
    color: "white",
    fontWeight: "600",
    marginLeft: 4,
    fontSize: 14,
  },
  microphoneBtn: {
    padding: 2,
    marginLeft: 6,
  },
  
  // Pinned Banner styles
  pinnedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pinnedBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  pinnedBannerTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: ZALO_BLUE,
  },
  pinnedBannerText: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 1,
  },
  pinnedBannerClose: {
    padding: 4,
    marginLeft: 10,
  },
});

export default ChatScreen;
