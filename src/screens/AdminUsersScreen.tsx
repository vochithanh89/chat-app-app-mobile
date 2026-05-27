import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { adminAPI } from "../services/api";
import { formatImageUrl } from "../services/chatMappers";
import { getLargeAvatar } from "../utils/avatarUtils";
import { useTheme } from "../contexts/ThemeContext";

const FALLBACK_AVATAR =
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face";

interface UserItem {
  id: string;
  uuid: string;
  name: string;
  email: string;
  avatarUrl?: string;
  avatar_url?: string;
  avatar?: string;
  isAdmin: boolean;
  is_admin: boolean;
  accountStatus: "active" | "locked";
  account_status?: "active" | "locked";
}

const AdminUsersScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode: darkMode, colors } = useTheme();
  const [searchText, setSearchText] = useState("");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchUsers = useCallback(async (searchQuery = "", pageNum = 1, isAppend = false) => {
    try {
      if (pageNum === 1 && !isAppend) setLoading(true);
      const res = await adminAPI.listUsers(searchQuery, pageNum, 20);
      const userList = res?.data?.users || res?.users || [];
      const meta = res?.data?.meta || res?.meta || {};

      if (isAppend) {
        setUsers((prev) => {
          const ids = new Set(prev.map((u) => u.uuid));
          const filtered = userList.filter((u: UserItem) => !ids.has(u.uuid));
          return [...prev, ...filtered];
        });
      } else {
        setUsers(userList);
      }

      setHasMore(pageNum < (meta.lastPage || meta.last_page || 1));
      setPage(pageNum);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      Alert.alert("Lỗi", error.message || "Không thể lấy danh sách người dùng");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(searchText, 1, false);
  }, [searchText, fetchUsers]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchUsers(searchText, 1, false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchUsers(searchText, page + 1, true);
    }
  };

  const handleToggleLock = async (user: UserItem, isCurrentlyActive: boolean) => {
    const nextStatus = isCurrentlyActive ? "locked" : "active";
    const actionText = isCurrentlyActive ? "Khóa" : "Mở khóa";

    Alert.alert(
      "Xác nhận thay đổi",
      `Bạn có chắc chắn muốn ${actionText.toLowerCase()} tài khoản của "${user.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: actionText,
          style: isCurrentlyActive ? "destructive" : "default",
          onPress: async () => {
            try {
              await adminAPI.updateUserStatus(user.uuid || user.id, nextStatus);
              // Update local state
              setUsers((prev) =>
                prev.map((u) =>
                  (u.uuid === user.uuid || u.id === user.id)
                    ? { ...u, accountStatus: nextStatus, account_status: nextStatus }
                    : u
                )
              );
              Alert.alert("Thành công", `Đã ${actionText.toLowerCase()} tài khoản thành công.`);
            } catch (err: any) {
              console.error("Lock/Unlock user error:", err);
              Alert.alert("Lỗi", err.message || `Không thể ${actionText.toLowerCase()} tài khoản.`);
            }
          },
        },
      ]
    );
  };

  const renderUserItem = ({ item }: { item: UserItem }) => {
    const avatar = formatImageUrl(item.avatarUrl || item.avatar_url || item.avatar) || getLargeAvatar(item.name);
    const status = item.accountStatus || item.account_status || "active";
    const isLocked = status === "locked";
    const isAdminUser = item.isAdmin || item.is_admin;

    return (
      <View
        className={`flex-row items-center p-4 border-b ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
        }`}
      >
        <Image
          source={{ uri: avatar }}
          className="w-12 h-12 rounded-full mr-3 bg-gray-200"
        />

        <View className="flex-1">
          <View className="flex-row items-center">
            <Text
              className={`text-base font-semibold mr-2 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            {isAdminUser && (
              <View className="bg-red-500 px-1.5 py-0.5 rounded">
                <Text className="text-[10px] font-bold text-white uppercase">Admin</Text>
              </View>
            )}
          </View>
          <Text
            className={`text-xs mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
            numberOfLines={1}
          >
            {item.email}
          </Text>
        </View>

        <View className="flex-row items-center ml-2">
          {isLocked ? (
            <View className="flex-row items-center mr-2">
              <Ionicons name="lock-closed" size={16} color="#EF4444" />
              <Text className="text-red-500 text-xs ml-1 font-semibold">Đã khóa</Text>
            </View>
          ) : (
            <View className="flex-row items-center mr-2">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text className="text-green-500 text-xs ml-1 font-semibold">Hoạt động</Text>
            </View>
          )}

          {!isAdminUser && (
            <Switch
              value={!isLocked}
              onValueChange={() => handleToggleLock(item, !isLocked)}
              trackColor={{ false: "#EF4444", true: "#10B981" }}
              thumbColor={darkMode ? "#FFF" : "#FFF"}
            />
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />

      {/* Header */}
      <View className="bg-blue-500 px-4 py-4 flex-row items-center shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white flex-1">Quản lý người dùng</Text>
      </View>

      {/* Search Input */}
      <View className={`px-4 py-3 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
        <View className={`flex-row items-center rounded-full px-4 py-2 ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
          <Ionicons name="search" size={18} color="#9CA3AF" />
          <TextInput
            placeholder="Tìm theo tên hoặc email..."
            placeholderTextColor={darkMode ? "#6B7280" : "#9CA3AF"}
            value={searchText}
            onChangeText={setSearchText}
            className={`flex-1 ml-2 text-sm py-1 ${darkMode ? "text-white" : "text-gray-900"}`}
          />
          {searchText ? (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Users List */}
      {loading && page === 1 ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0068FF" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.uuid}
          renderItem={renderUserItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() =>
            loading && page > 1 ? (
              <ActivityIndicator className="py-4" color="#0068FF" />
            ) : null
          }
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-20">
              <Ionicons name="people-outline" size={48} color="#9CA3AF" />
              <Text className={`mt-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Không tìm thấy người dùng nào
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default AdminUsersScreen;
