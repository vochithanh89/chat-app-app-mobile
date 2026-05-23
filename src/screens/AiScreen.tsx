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

const SUGGESTED_PROMPTS = [
  "Giải thích cách sử dụng ứng dụng này",
  "Tóm tắt các tính năng chính",
  "Gợi ý cách quản lý nhóm chat hiệu quả",
  "Hướng dẫn chia sẻ tài liệu trong chat",
];

const AiScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
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
    const isMine = item.user === "me";
    const alignment = isMine ? "items-end" : "items-start";
    const bubbleColor = isMine ? "bg-blue-500" : "bg-gray-200";
    const textColor = isMine ? "text-white" : "text-gray-900";

    return (
      <View className={`px-4 py-2 ${alignment}`}>
        <View className={`max-w-[80%] rounded-2xl px-4 py-3 ${bubbleColor}`}>
          <Text className={`${textColor} text-base`}>{item.text || item.content}</Text>
        </View>
      </View>
    );
  };

  const isEmpty = !initializing && messages.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="border-b border-gray-200 bg-white px-4 py-4 flex-row items-center">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">AI Assistant</Text>
          <Text className="text-xs text-gray-500">Powered by Google Gemini</Text>
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
          <Ionicons name="time-outline" size={18} color="#4B5563" />
        </Pressable>
        <Pressable onPress={handleNewChat} className="mr-2 p-2">
          <Ionicons name="add-circle-outline" size={22} color="#0068FF" />
        </Pressable>
        <Pressable onPress={handleClearConversation} className="p-2">
          <Ionicons name="trash-outline" size={22} color="#EF4444" />
        </Pressable>
      </View>

      {showHistory && (
        <View className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <Text className="text-sm font-semibold text-gray-800 mb-2">Lịch sử chat AI</Text>
          {historyLoading ? (
            <ActivityIndicator size="small" color="#0068FF" />
          ) : conversations.length === 0 ? (
            <Text className="text-sm text-gray-500">Chưa có lịch sử conversation AI.</Text>
          ) : (
            conversations.map((conv) => (
              <Pressable
                key={conv.id}
                onPress={() => openHistoryConversation(conv)}
                className="rounded-xl px-3 py-3 mb-2 bg-white border border-gray-200"
              >
                <Text className="text-sm font-medium text-gray-900" numberOfLines={1}>
                  {conv.name || "Trò chuyện AI"}
                </Text>
                <Text className="text-xs text-gray-500" numberOfLines={1}>
                  {conv.lastMsg || "Không có tin nhắn"}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      )}

      <View className="flex-1 bg-gray-50">
        {initializing ? (
          <View className="flex-1 justify-center items-center px-4">
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
              <View className="flex-1 items-center justify-center px-8">
                <Text className="text-base text-gray-900 font-semibold mb-2">Chào bạn! Tôi là AI Assistant.</Text>
                <Text className="text-sm text-gray-500 text-center mb-4">
                  Hỏi tôi về tính năng, quản lý nhóm, hoặc cách làm việc với ứng dụng.
                </Text>
                <View className="w-full space-y-2">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <Pressable
                      key={prompt}
                      onPress={() => handleSend(prompt)}
                      className="rounded-full border border-gray-200 px-4 py-3 bg-white"
                    >
                      <Text className="text-sm text-gray-700">{prompt}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              <FlatList
                ref={listRef}
                data={messages}
                inverted
                keyExtractor={(item) => String(item.id)}
                renderItem={renderMessage}
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
                ListEmptyComponent={() => (
                  <View className="flex-1 items-center justify-center py-16">
                    <Text className="text-sm text-gray-500">Không có tin nhắn nào.</Text>
                  </View>
                )}
              />
            )}
          </>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.bottom + 10}
      >
        <View className="border-t border-gray-200 bg-white px-4 py-3">
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
              className="flex-1 min-h-[42px] max-h-24 rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-900"
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
                className="rounded-full bg-gray-100 px-3 py-2"
              >
                <Text className="text-xs text-gray-700">{prompt}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AiScreen;
