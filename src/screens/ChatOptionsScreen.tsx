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
import { conversationAPI, messageAPI } from "../services/api";
import { formatImageUrl, normalizeConversation, normalizeMessage, normalizeUser } from "../services/chatMappers";
import { getLargeAvatar } from "../utils/avatarUtils";
import { useAuth } from "../contexts/AuthContext";

interface FileItem {
  id: string;
  name: string;
  size: string;
  url: string;
}

interface LinkItem {
  id: string;
  title: string;
  url: string;
}

interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
}

const urlRegex = /(https?:\/\/[^\s]+)/gi;

const formatBytes = (value?: number) => {
  if (!value) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileName: string) => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "document-text";
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "grid";
  if (lower.endsWith(".pptx") || lower.endsWith(".ppt")) return "easel";
  if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "document";
  if (lower.endsWith(".zip") || lower.endsWith(".rar")) return "archive";
  if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm")) return "videocam";
  if (lower.endsWith(".mp3") || lower.endsWith(".wav")) return "musical-notes";
  return "document";
};

const openUrl = async (url: string) => {
  if (!url) return;
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    Alert.alert("Cannot open", url);
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
  const initialConversationId = routeConversationId || routeUser?.conversationId || null;

  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const tabNavigator = navigation.getParent() as any;
      tabNavigator?.setOptions({ tabBarStyle: { display: "none" } });
      return () => tabNavigator?.setOptions({ tabBarStyle: { display: "flex" } });
    }, [navigation]),
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      const tabNavigator = navigation.getParent() as any;
      tabNavigator?.setOptions({ tabBarStyle: { display: "none" } });
    });
    const unsubscribeBlur = navigation.addListener("blur", () => {
      const tabNavigator = navigation.getParent() as any;
      tabNavigator?.setOptions({ tabBarStyle: { display: "flex" } });
    });
    return () => {
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  const nicknameKey = conversationId
    ? `chat:nickname:${conversationId}:${normalizedRouteUser.id || normalizedRouteUser.uuid}`
    : null;

  const loadNickname = useCallback(async () => {
    if (!nicknameKey) return;
    const stored = await AsyncStorage.getItem(nicknameKey);
    setNickname(stored || "");
    setNicknameDraft(stored || normalizedRouteUser.name || "");
  }, [nicknameKey, normalizedRouteUser.name]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      let convId = conversationId || routeConversationId || routeUser?.conversationId || null;
      if (!convId && normalizedRouteUser.id) {
        const created = await conversationAPI.createDirectConversation(normalizedRouteUser.id);
        const raw = created?.data?.conversation || created?.conversation || null;
        if (raw) {
          const normalized = normalizeConversation(raw, currentUserId);
          convId = normalized.id;
          setConversationId(convId);
          setConversation(normalized);
        }
      }

      if (!convId) {
        setMessages([]);
        return;
      }

      const [convRes, msgRes] = await Promise.all([
        conversationAPI.getConversationById(convId),
        messageAPI.getMessages(convId, { limit: 100 }),
      ]);
      const rawConversation = convRes?.data?.conversation || convRes?.conversation || convRes?.data || convRes;
      const rawMessages = msgRes?.data?.messages || msgRes?.messages || [];
      setConversation(normalizeConversation(rawConversation, currentUserId));
      setMessages(rawMessages.map((item: any) => normalizeMessage(item, currentUserId)));
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || error?.message || "Cannot load chat options.");
    } finally {
      setLoading(false);
    }
  }, [conversationId, currentUserId, normalizedRouteUser.id, routeConversationId, routeUser?.conversationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadNickname();
  }, [loadNickname]);

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
            name: attachment.fileName || attachment.name || "Attachment",
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

  const displayName = nickname || normalizedRouteUser.name || conversation?.name || "Người dùng";
  const avatar = formatImageUrl(normalizedRouteUser.avatar || normalizedRouteUser.avatarUrl) || getLargeAvatar(displayName);

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

  const handleDeleteConversation = () => {
    if (!conversationId) return;
    const isGroup = conversation?.isGroup || conversation?.type === "group";
    const title = isGroup ? "Rời/xóa nhóm" : "Xóa lịch sử trò chuyện";
    const message = isGroup
      ? "Nếu bạn là chủ nhóm, nhóm sẽ bị giải tán. Nếu không, bạn sẽ rời nhóm."
      : "Tin nhắn đã tải sẽ được xóa ở phía bạn.";

    Alert.alert(title, message, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            setDeleting(true);
            if (isGroup) {
              const ownerId = conversation?.ownerId || conversation?.owner_id;
              if (ownerId && currentUserId && String(ownerId) === String(currentUserId)) {
                await conversationAPI.disbandGroup(conversationId);
              } else {
                await conversationAPI.leaveGroup(conversationId);
              }
            } else {
              await Promise.all(messages.map((item) => messageAPI.deleteForMe(item.id)));
            }
            navigation.popToTop?.();
            navigation.goBack();
          } catch (error: any) {
            Alert.alert("Error", error?.response?.data?.message || error?.message || "Cannot delete conversation.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const renderMedia = () => {
    const displayItems = shared.media.slice(0, 8);
    return (
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="images" size={18} color="#666" />
            <Text className="font-semibold text-gray-800 ml-2">Đã gửi ({shared.media.length})</Text>
          </View>
        </View>

        {displayItems.length === 0 ? (
          <Text className="text-gray-500 text-sm">Chưa có ảnh hoặc video.</Text>
        ) : (
          <View className="flex-row flex-wrap">
            {displayItems.map((item) => (
              <TouchableOpacity key={item.id} onPress={() => openUrl(item.url)}>
                {item.type === "image" ? (
                  <Image source={{ uri: item.url }} className="w-20 h-20 rounded-lg mr-2 mb-2 bg-gray-100" style={{ width: 80, height: 80 }} />
                ) : (
                  <View className="w-20 h-20 rounded-lg mr-2 mb-2 bg-gray-900 items-center justify-center">
                    <Ionicons name="play-circle" size={28} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {shared.media.length > displayItems.length && (
              <View className="w-20 h-20 rounded-lg mr-2 mb-2 bg-gray-100 items-center justify-center">
                <Text className="text-gray-600 font-semibold">+{shared.media.length - displayItems.length}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderFiles = () => {
    const displayFiles = shared.files.slice(0, 6);
    return (
      <View className="mb-6">
        <View className="flex-row items-center mb-3">
          <Ionicons name="folder" size={18} color="#666" />
          <Text className="font-semibold text-gray-800 ml-2">File ({shared.files.length})</Text>
        </View>

        {displayFiles.length === 0 ? (
          <Text className="text-gray-500 text-sm">Chưa có file.</Text>
        ) : (
          <View>
            {displayFiles.map((file) => (
              <TouchableOpacity key={file.id} className="flex-row items-center p-2 bg-gray-50 rounded-lg mb-2" onPress={() => openUrl(file.url)}>
                <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                  <Ionicons name={getFileIcon(file.name) as any} size={20} color="#0068FF" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>{file.name}</Text>
                  <Text className="text-xs text-gray-500">{file.size}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderLinks = () => {
    const displayLinks = shared.links.slice(0, 6);
    return (
      <View className="mb-6">
        <View className="flex-row items-center mb-3">
          <Ionicons name="link" size={18} color="#666" />
          <Text className="font-semibold text-gray-800 ml-2">Link ({shared.links.length})</Text>
        </View>

        {displayLinks.length === 0 ? (
          <Text className="text-gray-500 text-sm">Chưa có link.</Text>
        ) : (
          <View>
            {displayLinks.map((link) => (
              <TouchableOpacity key={link.id} className="flex-row items-center p-2 bg-gray-50 rounded-lg mb-2" onPress={() => openUrl(link.url)}>
                <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center mr-3">
                  <Ionicons name="globe" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>{link.title}</Text>
                  <Text className="text-xs text-blue-600" numberOfLines={1}>{link.url}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />

      <View className="bg-blue-500 px-4 pt-3 pb-4 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 rounded-full mr-3">
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white">Tùy chọn</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#0068FF" />
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 20 }}>
          <View className="bg-white px-4 py-4 mb-2">
            <View className="items-center">
              <Image source={{ uri: avatar }} className="w-20 h-20 rounded-full mb-3" style={{ width: 80, height: 80 }} />
              <Text className="text-lg font-semibold text-gray-800">{displayName}</Text>
              {nickname ? <Text className="text-xs text-gray-500 mt-1">Tên gốc: {normalizedRouteUser.name}</Text> : null}
            </View>

            <View className="flex-row mt-6">
              <TouchableOpacity className="flex-1 flex-row items-center justify-center py-3 bg-blue-50 rounded-lg mr-2" onPress={() => Alert.alert("Tìm tin nhắn", "Chức năng tìm trong hội thoại chưa có trên mobile.")}>
                <Ionicons name="search" size={18} color="#0068FF" />
                <Text className="text-blue-600 font-medium ml-2">Tìm tin nhắn</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 flex-row items-center justify-center py-3 bg-blue-50 rounded-lg ml-2" onPress={() => navigation.navigate("Profile", { user: normalizedRouteUser })}>
                <Ionicons name="person" size={18} color="#0068FF" />
                <Text className="text-blue-600 font-medium ml-2">Trang cá nhân</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="px-4 py-4">
            {renderMedia()}
            {renderFiles()}
            {renderLinks()}
          </View>

          <View className="h-4 bg-gray-200" />

          <View className="bg-white px-4 py-4">
            <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100" onPress={() => setShowNicknameModal(true)}>
              <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name="create-outline" size={20} color="#0068FF" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-800 font-medium">Đổi biệt danh</Text>
                <Text className="text-xs text-gray-500">{nickname || "Chưa đặt biệt danh"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100" onPress={() => Alert.alert("Tạo nhóm", "Chức năng tạo nhóm từ màn này chưa được nối UI.")}>
              <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name="people" size={20} color="#0068FF" />
              </View>
              <Text className="flex-1 text-gray-800 font-medium">Tạo nhóm với người này</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center py-3" onPress={handleDeleteConversation} disabled={deleting}>
              <View className="w-10 h-10 bg-red-100 rounded-lg items-center justify-center mr-3">
                {deleting ? <ActivityIndicator size="small" color="#EF4444" /> : <Ionicons name="trash" size={20} color="#EF4444" />}
              </View>
              <Text className="flex-1 text-red-500 font-medium">Xóa cuộc trò chuyện</Text>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <Modal visible={showNicknameModal} transparent animationType="fade" onRequestClose={() => setShowNicknameModal(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="bg-white rounded-2xl p-5 w-full">
            <Text className="text-lg font-semibold text-gray-900 mb-3">Đổi biệt danh</Text>
            <TextInput
              value={nicknameDraft}
              onChangeText={setNicknameDraft}
              placeholder="Nhập biệt danh"
              className="border border-gray-200 rounded-xl px-4 py-3 text-gray-900 mb-4"
            />
            <View className="flex-row justify-end">
              <TouchableOpacity className="px-4 py-2 mr-2" onPress={() => setShowNicknameModal(false)}>
                <Text className="text-gray-600 font-medium">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity className="px-4 py-2 bg-blue-500 rounded-lg" onPress={saveNickname}>
                <Text className="text-white font-medium">Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default ChatOptionsScreen;
