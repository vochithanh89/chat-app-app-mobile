import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Image,
  ScrollView,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import MenuItemComponent from "../components/list/MenuItemComponent";
import { getLargeAvatar } from "../utils/avatarUtils";
import { formatImageUrl } from "../services/chatMappers";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userAPI } from "../services/api";
import { socketService } from "../services/socketService";

import { useTheme } from "../contexts/ThemeContext";

const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { isDarkMode: darkMode, toggleDarkMode } = useTheme();

  // Settings State
  const [isPrivate, setIsPrivate] = useState(false);
  const [notification, setNotification] = useState(true);

  // Tải cài đặt từ AsyncStorage khi màn hình khởi động
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [storedPrivate, storedNotif] = await Promise.all([
          AsyncStorage.getItem("settings:private"),
          AsyncStorage.getItem("settings:notification"),
        ]);
        if (storedPrivate !== null) setIsPrivate(storedPrivate === "true");
        if (storedNotif !== null) setNotification(storedNotif === "true");
      } catch (error) {
        console.error("Lỗi tải cài đặt từ AsyncStorage:", error);
      }
    };
    loadSettings();
  }, []);

  const handleTogglePrivate = async (value: boolean) => {
    setIsPrivate(value);
    try {
      await AsyncStorage.setItem("settings:private", String(value));
      // Đồng bộ lên backend thông qua API REST
      await userAPI.updatePrivacySettings(value);
      // Đồng bộ thông qua Socket.IO để cập nhật ngay lập tức
      socketService.emit('presence:toggle_privacy', { isPrivate: value });
    } catch (error) {
      console.error("Lỗi lưu/đồng bộ cài đặt chế độ riêng tư:", error);
      Alert.alert("Lỗi", "Không thể cập nhật chế độ riêng tư lên hệ thống.");
      // Hoàn tác trạng thái
      setIsPrivate(!value);
      await AsyncStorage.setItem("settings:private", String(!value));
    }
  };

  const handleToggleNotification = async (value: boolean) => {
    setNotification(value);
    try {
      await AsyncStorage.setItem("settings:notification", String(value));
    } catch (error) {
      console.error("Lỗi lưu cài đặt thông báo:", error);
    }
  };

  const handleToggleDarkMode = async () => {
    await toggleDarkMode();
  };

  const displayName = user?.name || user?.fullName || (user?.lastName && user?.firstName ? `${user.lastName} ${user.firstName}` : "") || "Người dùng";
  const avatarUrl = formatImageUrl(user?.avatarUrl || user?.avatar_url || user?.avatar) || getLargeAvatar(displayName);

  const handleLogout = () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản này?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Đăng xuất", style: "destructive", onPress: logout }
      ]
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-100"}`}>
      <StatusBar barStyle="light-content" backgroundColor="#0068FF" />
      
      {/* Header */}
      <View className="bg-blue-500 px-4 py-4 shadow-sm">
        <Text className="text-xl font-bold text-white">Cài đặt</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* User Profile Card */}
        <TouchableOpacity 
          className={`flex-row items-center p-4 mt-3 mx-3 rounded-2xl shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}
          onPress={() => navigation.navigate("Profile")}
        >
          <Image 
            source={{ uri: avatarUrl }} 
            className="w-16 h-16 rounded-full bg-gray-100" 
          />
          <View className="flex-1 ml-4">
            <Text className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              {displayName}
            </Text>
            <Text className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Xem và chỉnh sửa trang cá nhân
            </Text>
          </View>
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color={darkMode ? "#9CA3AF" : "#6B7280"} 
          />
        </TouchableOpacity>

        {/* Section: Tài khoản và Bảo mật */}
        <View className={`mt-4 mx-3 rounded-2xl overflow-hidden shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className={`px-4 py-3 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
            <Text className={`text-xs font-bold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>TÀI KHOẢN VÀ BẢO MẬT</Text>
          </View>
          
          <MenuItemComponent
            icon="person-outline"
            title="Thông tin cá nhân"
            onPress={() => navigation.navigate("Profile")}
            className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}
          />

          <MenuItemComponent
            icon="shield-checkmark-outline"
            title="Quản lý tài khoản"
            onPress={() => navigation.navigate("Account")}
            className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}
          />

          <MenuItemComponent
            icon="key-outline"
            title="Đổi mật khẩu"
            onPress={() => navigation.navigate("ChangePassword")}
            className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}
          />
        </View>

        {/* Section: Cài đặt và Tuỳ chọn */}
        <View className={`mt-4 mx-3 rounded-2xl overflow-hidden shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className={`px-4 py-3 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
            <Text className={`text-xs font-bold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>CÀI ĐẶT VÀ TUỲ CHỌN</Text>
          </View>

          <MenuItemComponent 
            icon="lock-closed-outline" 
            title="Chế độ riêng tư"
            rightComponent={
              <Switch value={isPrivate} onValueChange={handleTogglePrivate} trackColor={{ false: '#D1D5DB', true: '#93C5FD' }} thumbColor={isPrivate ? '#0068FF' : '#F3F4F6'} />
            }
            showArrow={false}
            className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}
          />
 
          <MenuItemComponent 
            icon="notifications-outline" 
            title="Thông báo ứng dụng"
            rightComponent={
              <Switch value={notification} onValueChange={handleToggleNotification} trackColor={{ false: '#D1D5DB', true: '#93C5FD' }} thumbColor={notification ? '#0068FF' : '#F3F4F6'} />
            }
            showArrow={false}
            className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}
          />
 
          <MenuItemComponent 
            icon="color-palette-outline" 
            title="Giao diện tối (Dark mode)"
            rightComponent={
              <Switch value={darkMode} onValueChange={handleToggleDarkMode} trackColor={{ false: '#D1D5DB', true: '#93C5FD' }} thumbColor={darkMode ? '#0068FF' : '#F3F4F6'} />
            }
            showArrow={false}
            className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}
          />
        </View>

        {/* Section: Hỗ trợ và Thông tin */}
        <View className={`mt-4 mx-3 rounded-2xl overflow-hidden shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className={`px-4 py-3 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
            <Text className={`text-xs font-bold ${darkMode ? "text-gray-400" : "text-gray-500"}`}>HỖ TRỢ VÀ THÔNG TIN</Text>
          </View>

          <MenuItemComponent
            icon="help-circle-outline"
            title="Trợ giúp & Phản hồi"
            onPress={() => Alert.alert("Trợ giúp & Phản hồi", "Bạn có thể trò chuyện với AI hoặc nếu cần liên hệ trực tiếp hãy liên hệ tới email: chatappN7@support.com hoặc số điện thoại 0987654321")}
            className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}
          />

          <MenuItemComponent
            icon="information-circle-outline"
            title="Phiên bản ứng dụng"
            rightComponent={
              <Text className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>1.0.0</Text>
            }
            showArrow={false}
            className={darkMode ? "bg-gray-800 border-gray-700" : "bg-white"}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          className="mt-6 mx-3 bg-red-50 p-4 rounded-2xl items-center border border-red-100 shadow-sm mb-8"
          onPress={handleLogout}
        >
          <View className="flex-row items-center">
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text className="text-red-500 font-bold text-base ml-2">Đăng xuất tài khoản</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
