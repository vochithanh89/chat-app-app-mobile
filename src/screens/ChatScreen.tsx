import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
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
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { RouteProp, useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";

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

// API & Context (Giả định theo project của bạn)
import { conversationAPI, messageAPI } from "../services/api";
import { normalizeConversation, normalizeMessage, normalizeUser, pickUserFromConversation } from "../services/chatMappers";
import { useAuth } from "../contexts/AuthContext";
import { useTabBarVisibility } from "../hooks/useTabBarVisibility";
import { useCall } from "../contexts/CallContext";

/** --- TYPES --- **/
type RootStackParamList = {
  Chat: { user: any; conversationId?: string };
  ChatOptions: { user: any };
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
const WINDOW_WIDTH = Dimensions.get("window").width;

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation<ChatScreenNavigationProp>();
  const { user: authUser } = useAuth();
  const insets = useSafeAreaInsets();
  const currentUserId = authUser?.uuid || authUser?.id || null;
  const { user: routeUser, conversationId: routeConversationId } = route.params;
  const { startCall, startGroupCall } = useCall();

  // Refs
  const listRef = useRef<FlatList>(null);

  // States
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  
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

  // Hide tab bar on mount
  useTabBarVisibility(true);

  /** --- LOGIC XỬ LÝ DỮ LIỆU --- **/

  const loadData = useCallback(async () => {
    try {
      const convId = routeConversationId || routeUser?.conversationId;
      if (!convId) return;

      const [convRes, msgRes] = await Promise.all([
        conversationAPI.getConversationById(convId),
        messageAPI.getMessages(convId)
      ]);

      const rawMessages = msgRes?.data?.messages || msgRes?.messages || [];
      const normalized = rawMessages
        .map((m: any) => normalizeMessage(m, currentUserId))
        .sort((a: any, b: any) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime());

      setMessages(normalized);
      if (convRes?.data?.conversation) {
        setConversation(normalizeConversation(convRes.data.conversation, currentUserId));
      }
    } catch (error) {
      console.error("Load Chat Error:", error);
    } finally {
      setLoading(false);
    }
  }, [routeConversationId, currentUserId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(loadData, 5000); // Polling 5s
      return () => clearInterval(interval);
    }, [loadData])
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
      const convId = routeConversationId || conversation?.id;
      
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
      Alert.alert("Error", "Failed to load conversations for forwarding");
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
      Alert.alert("Success", "Message forwarded successfully");
    } catch (error) {
      console.log("Forward message error:", error);
      Alert.alert("Error", "Failed to forward message");
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
      Alert.alert("Error", "Failed to delete message");
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
      Alert.alert("Error", "Failed to update reaction");
    }
  };

  /** --- RENDER HELPERS --- **/

  const renderMessage = ({ item }: { item: any }) => {
    const isMine = item.user === "me";
    
    return (
      <View style={[styles.messageContainer, isMine ? styles.mineAlign : styles.otherAlign]}>
        <TouchableOpacity
          onLongPress={() => {
            setSelectedMessage(item);
            setShowActions(true);
          }}
          delayLongPress={500}
          activeOpacity={0.8}
        >
          <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
            {/* Reply Preview inside bubble */}
            {item.replyToMessageId && (
              <View style={styles.replyInBubble}>
                <Text style={styles.replyText} numberOfLines={1}>
                  {messageById[item.replyToMessageId]?.content || "Đang trả lời tin nhắn..."}
                </Text>
              </View>
            )}

            {/* Image Attachments */}
            {item.imageAttachments?.length > 0 && (
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
            )}

            {/* Video Attachments */}
            {item.videoAttachments?.length > 0 && (
              <View style={styles.messageImagesContainer}>
                {item.videoAttachments.map((vid: any) => (
                  <VideoAttachment key={vid.id} uri={vid.url} />
                ))}
              </View>
            )}

            {/* File Attachments */}
            {item.fileAttachments?.length > 0 && (
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
            )}

            {(item.content || item.text) ? (
              <Text style={[styles.messageText, isMine ? styles.textWhite : styles.textBlack]}>
                {item.content || item.text}
              </Text>
            ) : null}
            
            <View style={styles.messageFooter}>
              <Text style={styles.timeText}>{item.time}</Text>
              {isMine && <Ionicons name="checkmark-done" size={14} color="#E0E0E0" />}
            </View>
          </View>
        </TouchableOpacity>
        
        {/* Reactions Row */}
        {item.reactions?.length > 0 && (
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
        )}
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Image source={{ uri: routeUser?.avatar || FALLBACK_AVATAR }} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{routeUser?.name || "Người dùng"}</Text>
          <Text style={styles.headerSub}>{routeUser?.online ? "Vừa mới truy cập" : "Offline"}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => handleCall('audio')}>
            <Ionicons name="call-outline" size={22} color="white" style={{ marginRight: 15 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleCall('video')}>
            <Ionicons name="videocam-outline" size={24} color="white" style={{ marginRight: 15 }} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate("ChatOptions", { user: routeUser })}>
            <Ionicons name="menu-outline" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Message List */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={{ flex: 1 }}
      >
        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color={ZALO_BLUE} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            inverted // Đảo ngược list để tối ưu chat
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Composer */}
        <View style={[styles.composer, { paddingBottom: insets.bottom || 10 }]}>
          {replyingTo && (
            <View style={styles.replyBar}>
              <View style={styles.replySide} />
              <View style={{ flex: 1 }}>
                <Text style={styles.replyName}>Trả lời {replyingTo.sender?.name}</Text>
                <Text style={styles.replyContent} numberOfLines={1}>{replyingTo.content}</Text>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            </View>
          )}

          {pendingAttachments.length > 0 && (
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
          )}

          <View style={styles.inputRow}>
            <TouchableOpacity onPress={() => setShowAttachmentPicker(true)}>
              <Ionicons name="add-circle-outline" size={28} color="#666" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Tin nhắn"
              multiline
              value={message}
              onChangeText={setMessage}
            />
            {message.trim().length > 0 || pendingAttachments.length > 0 ? (
              <TouchableOpacity onPress={handleSend}>
                <Ionicons name="send" size={24} color={ZALO_BLUE} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="happy-outline" size={26} color="#666" />
            )}
          </View>
        </View>
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
          <Pressable style={styles.forwardSheet} onPress={() => {}}>
            <Text style={styles.forwardTitle}>Forward message</Text>

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
                    <Text style={styles.forwardEmptyText}>No conversations available</Text>
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
                <Text style={styles.forwardCancelText}>Cancel</Text>
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
                  <Text style={styles.forwardSendText}>Forward</Text>
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
            <TouchableOpacity style={styles.attachBtn}>
              <Ionicons name="document" size={30} color="#FF9500" />
              <Text>Tài liệu</Text>
            </TouchableOpacity>
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
          {viewingImageUri && (
            <Image 
              source={{ uri: viewingImageUri }} 
              style={{ width: "100%", height: "80%" }} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>
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
  container: { flex: 1, backgroundColor: "#F4F5F7" },
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
  attachBtn: { alignItems: "center", marginRight: 30 }
});

export default ChatScreen;