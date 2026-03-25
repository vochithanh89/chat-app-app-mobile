import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Import new components
import ButtonComponent from "../components/common/ButtonComponent";
import AvatarComponent from "../components/common/AvatarComponent";
import MenuItemComponent from "../components/list/MenuItemComponent";

const SettingsScreen = () => {
  const navigation = useNavigation<any>();

  // STATE THẬT
  const [isPrivate, setIsPrivate] = useState(false);
  const [notification, setNotification] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SafeAreaView className={`flex-1 ${darkMode ? "bg-black" : "bg-gray-50"}`}>
      
      {/* Header */}
      <View className="bg-blue-500 p-4 border-b border-gray-100">
        <Text className="text-xl font-semibold text-gray-900 text-white">Cài đặt</Text>
      </View>

      {/* Profile */}
      <View className="bg-white p-4 flex-row items-center mt-2">
        <AvatarComponent
          source={{
            uri: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
          }}
          size="large"
        />
        <View className="ml-3">
          <Text className="text-base font-semibold text-gray-900">
            Nguyễn Văn A
          </Text>
          <Text className="text-gray-500 text-sm">Xem trang cá nhân</Text>
        </View>
      </View>

      {/* SETTINGS */}
      <View className="bg-white mt-3">
        {/* Tài khoản */}
        <MenuItemComponent
          icon="person-outline"
          title="Tài khoản"
          onPress={() => navigation.navigate("Account")}
        />

        {/* Quyền riêng tư */}
        <MenuItemComponent 
          icon="lock-closed-outline" 
          title="Chế độ riêng tư"
          rightComponent={
            <Switch value={isPrivate} onValueChange={setIsPrivate} />
          }
        />

        {/* Thông báo */}
        <MenuItemComponent 
          icon="notifications-outline" 
          title="Thông báo"
          rightComponent={
            <Switch value={notification} onValueChange={setNotification} />
          }
        />

        {/* Giao diện */}
        <MenuItemComponent 
          icon="color-palette-outline" 
          title="Dark mode"
          rightComponent={
            <Switch value={darkMode} onValueChange={setDarkMode} />
          }
        />
      </View>

      {/* Logout */}
      <TouchableOpacity
        className="mt-6 mx-4 bg-white p-4 rounded-xl items-center"
        onPress={() => navigation.replace("Login")}
      >
        <Text className="text-red-500 font-semibold">Đăng xuất</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default SettingsScreen;