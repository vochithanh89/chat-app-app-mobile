import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { aiAPI, conversationAPI, messageAPI } from "../services/api";
import { normalizeConversation, normalizeMessage } from "../services/chatMappers";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";

const SUGGESTED_PROMPTS = [
  "Giải thích cách sử dụng ứng dụng này",
  "Tóm tắt các tính năng chính",
  "Gợi ý cách quản lý nhóm chat hiệu quả",
  "Hướng dẫn chia sẻ tài liệu trong chat",
];

const AiScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDarkMode: darkMode, colors } = useTheme();
  const currentUserId = user?.uuid || user?.id || null;
  const listRef = useRef<FlatList<any> | null>(null);

  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const botEmail = "ai-bot@system.local";

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
  }, []);

  const loadMessages = useCallback(
    async (conv: any) => {
      if (!conv?.id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await messageAPI.getMessages(conv.id, { limit: 50 });
        const rawMessages = response?.data?.messages || response?.messages || [];
        const normalized = Array.isArray(rawMessages)
          ? rawMessages
              .map((item: any) => normalizeMessage(item, currentUserId))
              .sort((a: any, b: any) => new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime())
          : [];
        setMessages(normalized);
      } catch (err: any) {
        console.error("AI load messages error:", err);
        setError(err?.message || "Không thể tải tin nhắn AI.");
        setMessages([]);
      } finally {
        setLoading(false);
      }
    },
    [currentUserId],
  );

  const ensureConversation = useCallback(async () => {
    if (conversation?.id) {
      return conversation;
    }

    try {
      const response = await aiAPI.startConversation();
      const conv = response?.conversation || response;
      const normalized = normalizeConversation(conv, currentUserId);
      setConversation(normalized);
      return normalized;
    } catch (err: any) {
      console.error("AI start conversation error:", err);
      setError(err?.message || "Không thể khởi tạo trò chuyện AI.");
      throw err;
    }
  }, [conversation?.id, currentUserId]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await conversationAPI.getConversations();
      const rawConversations = response?.data?.conversations || response?.conversations || [];
      const aiConversations = Array.isArray(rawConversations)
        ? rawConversations
            .map((conv: any) => normalizeConversation(conv, currentUserId))
            .filter((conv: any) =>
              Array.isArray(conv.members) &&
              conv.members.some((member: any) => member?.user?.email === botEmail)
            )
        : [];
      setConversations(aiConversations);
    } catch (err) {
      console.error("Load AI history error:", err);
      setConversations([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [currentUserId]);

  const init = useCallback(async () => {
    setInitializing(true);
    setError(null);
    try {
      const conv = await ensureConversation();
      await loadMessages(conv);
    } catch (err) {
      // error already set
    } finally {
      setInitializing(false);
    }
  }, [ensureConversation, loadMessages]);

  useEffect(() => {
    init();
  }, [init]);

  useFocusEffect(
    useCallback(() => {
      if (showHistory) {
        loadHistory();
      }
    }, [loadHistory, showHistory])
  );

  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, loading, scrollToBottom]);

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);
    setInput("");

    let activeConversation = conversation;
    try {
      if (!activeConversation?.id) {
        activeConversation = await ensureConversation();
        setConversation(activeConversation);
      }
    } catch (err: any) {
      setSending(false);
      setError(err?.message || "Không thể khởi tạo cuộc trò chuyện AI.");
      return;
    }

    const optimisticMessage = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: currentUserId,
      sender: { id: currentUserId, name: user?.name || "Bạn" },
      content,
      text: content,
      user: "me",
      rawTime: new Date().toISOString(),
    };

    setMessages((prev) => [optimisticMessage, ...(prev || [])]);

    try {
      const response = await aiAPI.sendMessage(activeConversation.id, content);
      const userMessage = normalizeMessage(response?.userMessage || response?.user_message || response?.user, currentUserId);
      const aiMessage = normalizeMessage(response?.aiMessage || response?.ai_message || response?.ai, currentUserId);

      setMessages((prev) => {
        const filtered = prev.filter((msg) => msg.id !== optimisticMessage.id);
        return [aiMessage, userMessage, ...filtered];
      });
    } catch (err: any) {
      console.error("AI send message error:", err?.response?.data || err);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
      setError(err?.response?.data?.message || err?.message || "AI không phản hồi. Vui lòng thử lại.");
    } finally {
      setSending(false);
    }
  };

  const handleNewChat = async () => {
    Alert.alert(
      "Tạo đoạn chat mới",
      "Bạn có chắc muốn bắt đầu trò chuyện AI mới?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đồng ý",
          onPress: async () => {
            try {
              const response = await aiAPI.startNewConversation();
              const conv = normalizeConversation(response?.conversation || response, currentUserId);
              setConversation(conv);
              setMessages([]);
              setError(null);
            } catch (err: any) {
              console.error("AI new chat error:", err);
              Alert.alert("Lỗi", err?.message || "Không thể tạo chat mới.");
            }
          },
        },
      ]
    );
  };

  const handleClearConversation = async () => {
    if (!conversation?.id || messages.length === 0) return;
    Alert.alert(
      "Xóa lịch sử",
      "Bạn có chắc muốn xóa toàn bộ tin nhắn trong cuộc trò chuyện này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const deletePromises = messages
                .filter((msg) => !String(msg.id).startsWith("temp-"))
                .map((msg) => messageAPI.deleteForMe(msg.id).catch(() => undefined));

              await Promise.all(deletePromises);
              setMessages([]);
            } catch (err) {
              console.error("AI clear conversation error:", err);
              Alert.alert("Lỗi", "Không thể xóa lịch sử. Vui lòng thử lại.");
            }
          },
        },
      ]
    );
  };

  const openHistoryConversation = async (conv: any) => {
    if (!conv?.id) return;
    setShowHistory(false);
    try {
      setConversation(conv);
      await loadMessages(conv);
    } catch (err) {
      console.error("AI open history error:", err);
    }
  };

  const botUserId = useMemo(() => {
    return conversation?.members?.find((m: any) => m.user?.email === botEmail)?.user?.id || null;
  }, [conversation]);

  const renderMessage = ({ item }: { item: any }) => {
    if (item.isTyping) {
      return (
        <View className="px-4 py-2 items-start">
          <View className={`rounded-2xl px-4 py-3 flex-row items-center gap-2 ${darkMode ? "bg-gray-800" : "bg-gray-200"}`}>
            <ActivityIndicator size="small" color={darkMode ? "#9CA3AF" : "#4B5563"} />
            <Text className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>AI đang trả lời...</Text>
          </View>
        </View>
      );
    }

    const isMine = item.user === "me";
    const alignment = isMine ? "items-end" : "items-start";
    const bubbleColor = isMine ? "bg-blue-500" : (darkMode ? "bg-gray-800" : "bg-gray-200");
    const textColor = isMine ? "text-white" : (darkMode ? "text-gray-100" : "text-gray-900");

    return (
      <View className={`px-4 py-2 ${alignment}`}>
        <View className={`max-w-[80%] rounded-2xl px-4 py-3 ${bubbleColor}`}>
          <Text className={`${textColor} text-base`}>{item.text || item.content}</Text>
        </View>
      </View>
    );
  };

  const isEmpty = !initializing && messages.length === 0;

  const listData = useMemo(() => {
    if (sending) {
      return [{ id: "typing", isTyping: true, user: "other" }, ...messages];
    }
    return messages;
  }, [messages, sending]);

  return (
    <SafeAreaView className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-white"}`} edges={["top", "left", "right"]}>
      <View className={`border-b px-4 py-4 flex-row items-center ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        <View className="flex-1">
          <Text className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Trợ lý AI</Text>
          <Text className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Hỗ trợ bởi Google Gemini</Text>
        </View>
        <Pressable
          onPress={() => {
            setShowHistory((prev) => !prev);
            if (!showHistory) {
              loadHistory();
            }
          }}
          className="mr-3 p-2"
        >
          <Ionicons name="time-outline" size={18} color={darkMode ? "#9CA3AF" : "#4B5563"} />
        </Pressable>
        <Pressable onPress={handleNewChat} className="mr-2 p-2">
          <Ionicons name="add-circle-outline" size={22} color="#0068FF" />
        </Pressable>
        <Pressable onPress={handleClearConversation} className="p-2">
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </Pressable>
      </View>

      <View className={`py-2 px-4 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"}`}>
        <Text className={`text-[11px] text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          🕒 Tin nhắn trong cuộc trò chuyện này sẽ tự động được xóa sau 24 giờ.
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        style={{ flex: 1 }}
      >
        {showHistory && (
          <View className={`border-b px-4 py-3 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
            <Text className={`text-sm font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-800"}`}>Lịch sử chat AI</Text>
            {historyLoading ? (
              <ActivityIndicator size="small" color="#0068FF" />
            ) : conversations.length === 0 ? (
              <Text className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Chưa có lịch sử trò chuyện AI.</Text>
            ) : (
              conversations.map((conv) => (
                <Pressable
                  key={conv.id}
                  onPress={() => openHistoryConversation(conv)}
                  className={`rounded-xl px-3 py-3 mb-2 border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"}`}
                >
                  <Text className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`} numberOfLines={1}>
                    {conv.name || "Trò chuyện AI"}
                  </Text>
                  <Text className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`} numberOfLines={1}>
                    {conv.lastMsg || "Không có tin nhắn"}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}

        <View style={{ flex: 1, backgroundColor: darkMode ? "#111827" : "#F9FAFB" }}>
          {initializing ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 16 }}>
              <ActivityIndicator size="large" color="#0068FF" />
              <Text className="text-sm text-gray-500 mt-3">Đang khởi động AI...</Text>
            </View>
          ) : (
            <>
              {error ? (
                <View className="p-4 bg-red-50 border border-red-200 m-4 rounded-xl">
                  <Text className="text-red-700 text-sm">{error}</Text>
                </View>
              ) : null}

              {isEmpty ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
                  <Text className={`text-base font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>Chào bạn! Tôi là AI Assistant.</Text>
                  <Text className={`text-sm text-center mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Hỏi tôi về tính năng, quản lý nhóm, hoặc cách làm việc với ứng dụng.
                  </Text>
                  <View className="w-full space-y-2">
                    {SUGGESTED_PROMPTS.map((prompt) => (
                      <Pressable
                        key={prompt}
                        onPress={() => handleSend(prompt)}
                        className={`rounded-full border px-4 py-3 ${darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"}`}
                      >
                        <Text className={`text-sm ${darkMode ? "text-gray-200" : "text-gray-700"}`}>{prompt}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <FlatList
                  ref={listRef}
                  data={listData}
                  inverted
                  keyExtractor={(item) => String(item.id)}
                  renderItem={renderMessage}
                  contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
                  ListEmptyComponent={() => (
                    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 64 }}>
                      <Text className="text-sm text-gray-500">Không có tin nhắn nào.</Text>
                    </View>
                  )}
                />
              )}
            </>
          )}
        </View>

        <View className={`border-t px-4 py-3 ${darkMode ? "bg-gray-850 border-gray-700" : "bg-white border-gray-200"}`} style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Viết tin nhắn cho AI..."
              placeholderTextColor="#9CA3AF"
              multiline
              onSubmitEditing={() => handleSend()}
              blurOnSubmit={false}
              returnKeyType="send"
              className={`flex-1 min-h-[42px] max-h-24 rounded-2xl border px-4 py-3 text-sm ${darkMode ? "border-gray-700 bg-gray-700 text-white" : "border-gray-200 bg-gray-100 text-gray-900"}`}
            />
            <Pressable
              onPress={() => handleSend()}
              disabled={sending || !input.trim()}
              className="rounded-full bg-blue-500 p-3"
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {SUGGESTED_PROMPTS.slice(0, 3).map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => handleSend(prompt)}
                className={`rounded-full px-3 py-2 ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}
              >
                <Text className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AiScreen;
