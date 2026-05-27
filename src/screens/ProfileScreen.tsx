import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { friendshipAPI, userAPI } from "../services/api";
import { formatImageUrl, normalizeUser } from "../services/chatMappers";
import { getExtraLargeAvatar } from "../utils/avatarUtils";
import { useTheme } from "../contexts/ThemeContext";

type RootStackParamList = {
  Profile: { user?: any; friends?: any[] } | undefined;
  Chat: { user: any };
};

type ProfileScreenRouteProp = RouteProp<RootStackParamList, "Profile">;
type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, "Profile">;

type FieldErrors = Record<string, string>;

const getResponseMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

const getFieldErrors = (error: any): FieldErrors =>
  Array.isArray(error?.response?.data?.errors)
    ? error.response.data.errors.reduce((acc: FieldErrors, item: any) => {
        if (item?.field) acc[item.field] = item.message || "";
        return acc;
      }, {})
    : error?.response?.data?.errors || error?.response?.data?.fieldErrors || {};

const getResponseData = (response: any) =>
  response?.data?.user || response?.data?.data?.user || response?.data?.data || response?.user || response;

const getInitials = (name?: string) =>
  (name || "Người dùng")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const ProfileScreen = () => {
  const route = useRoute<ProfileScreenRouteProp>();
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user: authUser, loading: authLoading, updateProfile, uploadAvatar, changePassword, checkAuthStatus } = useAuth();
  const { isDarkMode: darkMode, colors } = useTheme();

  const routeUser = route.params?.user;
  const initialFriends = route.params?.friends || [];
  const currentUserId = authUser?.uuid || authUser?.id;
  const routeUserId = routeUser?.uuid || routeUser?.id;
  const isPublicProfile = Boolean(routeUser && routeUserId && currentUserId && routeUserId !== currentUserId);

  const [showFriendMenu, setShowFriendMenu] = useState(false);
  const [friends, setFriends] = useState(initialFriends);
  const [requestSent, setRequestSent] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(!authUser);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileFieldErrors, setProfileFieldErrors] = useState<FieldErrors>({});
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<FieldErrors>({});

  const normalizedAuthUser = useMemo(() => normalizeUser(authUser || {}), [authUser]);
  const normalizedRouteUser = useMemo(() => normalizeUser(routeUser || {}), [routeUser]);
  const displayedUser = isPublicProfile ? normalizedRouteUser : normalizedAuthUser;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (isPublicProfile) return;
    let active = true;

    const applyProfile = (profile: any) => {
      if (!active || !profile) return;
      setFormData({
        name: profile.name || profile.fullName || "",
        email: profile.email || "",
        phone: profile.phone || profile.phoneNumber || "",
        bio: profile.bio || "",
      });
      setAvatarPreviewUri(null);
      setLoadingProfile(false);
    };

    const loadProfile = async () => {
      if (authUser) {
        applyProfile(authUser);
      }

      try {
        const response = await userAPI.getProfile();
        applyProfile(getResponseData(response));
      } catch {
        if (!authUser) {
          checkAuthStatus?.();
        }
      } finally {
        if (active) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      active = false;
    };
  }, [authUser, checkAuthStatus, isPublicProfile]);

  const isAlreadyFriend =
    friends?.some((friend: any) => (friend.uuid || friend.id) === routeUserId) || false;

  const handleChat = () => {
    if (routeUser) {
      navigation.navigate("Chat", { user: normalizedRouteUser });
    }
  };

  const handleAddFriend = async () => {
    try {
      await friendshipAPI.sendRequest(routeUserId);
      setRequestSent(true);
      Alert.alert("Thành công", "Đã gửi yêu cầu kết bạn.");
    } catch (error) {
      Alert.alert("Lỗi", getResponseMessage(error, "Không thể gửi yêu cầu kết bạn."));
    }
  };

  const handleUnfriend = () => {
    Alert.alert("Hủy kết bạn", `Hủy kết bạn với ${displayedUser.name || "người dùng này"}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await friendshipAPI.unfriend(routeUserId);
            setFriends((prevFriends: any[]) =>
              prevFriends.filter((friend) => (friend.uuid || friend.id) !== routeUserId),
            );
            setShowFriendMenu(false);
            Alert.alert("Thành công", "Đã hủy kết bạn.");
          } catch (error) {
            Alert.alert("Lỗi", getResponseMessage(error, "Không thể hủy kết bạn."));
          }
        },
      },
    ]);
  };

  const handleBlock = () => {
    Alert.alert("Chặn người dùng", `Chặn ${displayedUser.name || "người dùng này"}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Chặn",
        style: "destructive",
        onPress: async () => {
          try {
            if (isAlreadyFriend) {
              await friendshipAPI.unfriend(routeUserId);
              setFriends((prevFriends: any[]) =>
                prevFriends.filter((friend) => (friend.uuid || friend.id) !== routeUserId),
              );
            }
            await friendshipAPI.blockUser(routeUserId);
            setIsBlocked(true);
            setShowFriendMenu(false);
            Alert.alert("Thành công", "Đã chặn người dùng.");
          } catch (error) {
            Alert.alert("Lỗi", getResponseMessage(error, "Không thể chặn người dùng."));
          }
        },
      },
    ]);
  };

  const handleUnblock = () => {
    Alert.alert("Bỏ chặn người dùng", `Bỏ chặn ${displayedUser.name || "người dùng này"}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Bỏ chặn",
        onPress: async () => {
          try {
            await friendshipAPI.unblockUser(routeUserId);
            setIsBlocked(false);
            Alert.alert("Thành công", "Đã bỏ chặn người dùng.");
          } catch (error) {
            Alert.alert("Lỗi", getResponseMessage(error, "Không thể bỏ chặn người dùng."));
          }
        },
      },
    ]);
  };

  const handleAvatarChange = async () => {
    setAvatarError("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setAvatarError("Vui lòng cấp quyền truy cập thư viện ảnh để thay đổi ảnh đại diện.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > 2 * 1024 * 1024) {
      setAvatarError("Ảnh đại diện phải nhỏ hơn 2MB.");
      return;
    }

    const previousPreview = avatarPreviewUri;
    setAvatarPreviewUri(asset.uri);

    try {
      setUploadingAvatar(true);
      await uploadAvatar(asset);
    } catch (error) {
      setAvatarPreviewUri(previousPreview);
      setAvatarError(getResponseMessage(error, "Không thể tải ảnh đại diện lên."));
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleProfileSubmit = async () => {
    setSaving(true);
    setSaved(false);
    setProfileError("");
    setProfileFieldErrors({});

    try {
      await updateProfile({
        name: formData.name,
        bio: formData.bio,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      setProfileError(getResponseMessage(error, "Không thể cập nhật hồ sơ."));
      setProfileFieldErrors(getFieldErrors(error));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async () => {
    setPasswordError("");
    setPasswordFieldErrors({});
    setPasswordSaved(false);

    if (passwordData.password !== passwordData.confirmPassword) {
      setPasswordFieldErrors({ password_confirmation: "Mật khẩu xác nhận không khớp." });
      return;
    }
    if (passwordData.password.length < 8) {
      setPasswordFieldErrors({ password: "Mật khẩu phải có ít nhất 8 ký tự." });
      return;
    }

    try {
      setChangingPassword(true);
      await changePassword({
        current_password: passwordData.currentPassword,
        password: passwordData.password,
        password_confirmation: passwordData.confirmPassword,
      });
      setPasswordData({ currentPassword: "", password: "", confirmPassword: "" });
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2000);
    } catch (error) {
      setPasswordError(getResponseMessage(error, "Không thể thay đổi mật khẩu."));
      setPasswordFieldErrors(getFieldErrors(error));
    } finally {
      setChangingPassword(false);
    }
  };

  const renderPublicProfile = () => (
    <>
      <View className={`${darkMode ? "bg-gray-800" : "bg-blue-500"} pt-12 pb-8 px-4`}>
        <View className="flex-row items-center mb-6">
          <TouchableOpacity className="mr-4" onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">Hồ sơ</Text>
        </View>

        <View className="items-center">
          <View className="relative mb-4">
            <Image
              source={{ uri: displayedUser.avatarUrl || getExtraLargeAvatar(displayedUser.name) }}
              className="w-24 h-24 rounded-full border-4 border-white"
            />
            {displayedUser.isOnline && (
              <View className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white" />
            )}
          </View>

          <Text className="text-white text-2xl font-bold mb-2">{displayedUser.name || "Người dùng ẩn danh"}</Text>
          <Text className="text-blue-100 text-base">{displayedUser.email || "Không có email"}</Text>

          {isBlocked ? (
            <View className="mt-3 px-4 py-2 bg-red-600 rounded-full flex-row items-center">
              <Ionicons name="close-circle" size={16} color="white" />
              <Text className="text-white text-sm font-medium ml-2">Đã chặn</Text>
            </View>
          ) : isAlreadyFriend ? (
            <View className="mt-3 relative">
              <TouchableOpacity
                className="px-4 py-2 bg-blue-600 rounded-full flex-row items-center"
                onPress={() => setShowFriendMenu(!showFriendMenu)}
              >
                <Ionicons name="people" size={16} color="white" />
                <Text className="text-white text-sm font-medium ml-2">Bạn bè</Text>
                <Ionicons name="chevron-down" size={14} color="white" />
              </TouchableOpacity>

              {showFriendMenu && (
                <View className={`absolute top-12 left-0 right-0 rounded-lg shadow-lg border z-10 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                  <TouchableOpacity className={`px-3 py-3 flex-row items-center justify-center border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`} onPress={handleUnfriend}>
                    <Ionicons name="person-remove" size={18} color="#EF4444" />
                    <Text className="text-red-500 ml-2 text-sm">Hủy kết bạn</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="px-3 py-3 flex-row items-center justify-center" onPress={handleBlock}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                    <Text className="text-red-500 ml-2 text-sm">Chặn</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : requestSent ? (
            <View className="mt-3 px-4 py-2 bg-gray-400 rounded-full flex-row items-center">
              <Ionicons name="time" size={16} color="white" />
              <Text className="text-white text-sm font-medium ml-2">Đã gửi yêu cầu</Text>
            </View>
          ) : (
            <TouchableOpacity className="mt-3 px-4 py-2 bg-green-500 rounded-full flex-row items-center" onPress={handleAddFriend}>
              <Ionicons name="person-add" size={16} color="white" />
              <Text className="text-white text-sm font-medium ml-2">Thêm bạn bè</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <View className={`mx-4 mt-4 rounded-lg p-4 shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-700"}`}>Giới thiệu</Text>
          <Text className={darkMode ? "text-gray-300" : "text-gray-600"}>{displayedUser.bio || "Không có mô tả tiểu sử"}</Text>
        </View>

        <View className={`mx-4 mt-4 rounded-lg shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <TouchableOpacity className={`flex-row items-center justify-between p-4 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`} onPress={handleChat}>
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${darkMode ? "bg-blue-950" : "bg-blue-100"}`}>
                <Ionicons name="chatbubble-outline" size={20} color="#0068FF" />
              </View>
              <Text className={`font-medium ${darkMode ? "text-gray-100" : "text-gray-800"}`}>Gửi tin nhắn</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className={`flex-row items-center justify-between p-4 border-b ${darkMode ? "border-gray-700" : "border-gray-100"}`} onPress={() => Alert.alert("Thông báo", "Tính năng gọi thoại sẽ sớm ra mắt!")}>
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${darkMode ? "bg-green-950" : "bg-green-100"}`}>
                <Ionicons name="call-outline" size={20} color="#10B981" />
              </View>
              <Text className={`font-medium ${darkMode ? "text-gray-100" : "text-gray-800"}`}>Gọi thoại</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between p-4" onPress={() => Alert.alert("Thông báo", "Tính năng gọi video sẽ sớm ra mắt!")}>
            <View className="flex-row items-center">
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${darkMode ? "bg-purple-950" : "bg-purple-100"}`}>
                <Ionicons name="videocam-outline" size={20} color="#8B5CF6" />
              </View>
              <Text className={`font-medium ${darkMode ? "text-gray-100" : "text-gray-800"}`}>Gọi video</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {isBlocked && (
            <TouchableOpacity className={`flex-row items-center justify-between p-4 border-t ${darkMode ? "border-gray-700" : "border-gray-100"}`} onPress={handleUnblock}>
              <View className="flex-row items-center">
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${darkMode ? "bg-red-950" : "bg-red-100"}`}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#EF4444" />
                </View>
                <Text className="text-red-500 font-medium">Bỏ chặn</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </>
  );

  const renderSettingsProfile = () => {
    const avatarSrc =
      avatarPreviewUri ||
      formatImageUrl(authUser?.avatarUrl || authUser?.avatar_url || authUser?.avatar);
    const createdAt = authUser?.createdAt || authUser?.created_at;
    const memberSince = (() => {
      if (!createdAt) return "Không rõ";
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return "Không rõ";
      return `tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
    })();

    return (
      <>
        <View className={`px-5 py-4 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
          <View className="flex-row items-center">
            <TouchableOpacity className="mr-3" onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={darkMode ? "white" : "#111827"} />
            </TouchableOpacity>
            <View>
              <Text className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Cài đặt hồ sơ</Text>
              <Text className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Quản lý cài đặt tài khoản và tùy chọn của bạn</Text>
            </View>
          </View>
        </View>

        <ScrollView className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          <View className={`rounded-xl p-5 shadow-sm border mb-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
            <View className="flex-row items-center">
              <View className="relative">
                <Image source={{ uri: avatarSrc || getExtraLargeAvatar(formData.name) }} className={`w-24 h-24 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-100"}`} />
                {!avatarSrc && (
                  <View className="absolute inset-0 items-center justify-center">
                    <Text className={`text-2xl font-semibold ${darkMode ? "text-white" : "text-gray-700"}`}>{getInitials(formData.name)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-blue-500 items-center justify-center shadow"
                  onPress={handleAvatarChange}
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Ionicons name="camera" size={18} color="white" />
                  )}
                </TouchableOpacity>
              </View>

              <View className="flex-1 ml-5">
                <Text className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>{formData.name || "Người dùng"}</Text>
                <Text className={`mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{formData.email || "Không có email"}</Text>
                {avatarError ? <Text className="text-red-500 text-xs mt-2">{avatarError}</Text> : null}
              </View>
            </View>

            <View className={`mt-5 pt-4 border-t flex-row items-center ${darkMode ? "border-gray-700" : "border-gray-100"}`}>
              <View className={`w-2 h-2 rounded-full mr-2 ${authUser?.isOnline === false ? "bg-gray-400" : "bg-green-500"}`} />
              <Text className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{authUser?.isOnline === false ? "Ngoại tuyến" : "Trực tuyến"}</Text>
            </View>
          </View>

          <View className={`rounded-xl p-5 shadow-sm border mb-4 ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
            <Text className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Thông tin cá nhân</Text>
            <Text className={`text-sm mt-1 mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Cập nhật thông tin chi tiết cá nhân của bạn tại đây.</Text>

            {profileError ? <View className="bg-red-50 rounded-lg p-3 mb-4"><Text className="text-red-600 text-sm">{profileError}</Text></View> : null}

            <View className="mb-4">
              <Text className={`mb-2 font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Họ và tên</Text>
              <View className={`rounded-xl px-4 py-3 flex-row items-center border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                <Ionicons name="person-outline" size={20} color="#9CA3AF" />
                <TextInput
                  value={formData.name}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                  placeholder="Tên của bạn"
                  placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                  className={`flex-1 ml-3 ${darkMode ? "text-white" : "text-gray-900"}`}
                />
              </View>
              {profileFieldErrors.name ? <Text className="text-red-500 text-xs mt-1">{profileFieldErrors.name}</Text> : null}
            </View>

            <View className="mb-4">
              <Text className={`mb-2 font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Email</Text>
              <View className={`rounded-xl px-4 py-3 flex-row items-center border ${darkMode ? "bg-gray-900 border-gray-800" : "bg-gray-100 border-gray-200"}`}>
                <Ionicons name="mail-outline" size={20} color="#9CA3AF" />
                <TextInput value={formData.email} editable={false} className={`flex-1 ml-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              </View>
            </View>

            <View className="mb-4">
              <Text className={`mb-2 font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Số điện thoại</Text>
              <View className={`rounded-xl px-4 py-3 flex-row items-center border ${darkMode ? "bg-gray-900 border-gray-800" : "bg-gray-100 border-gray-200"}`}>
                <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                <TextInput value={formData.phone} editable={false} placeholder="Chưa có số điện thoại" placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"} className={`flex-1 ml-3 ${darkMode ? "text-gray-400" : "text-gray-500"}`} />
              </View>
            </View>

            <View className="mb-4">
              <Text className={`mb-2 font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Tiểu sử</Text>
              <TextInput
                value={formData.bio}
                onChangeText={(value) => setFormData((prev) => ({ ...prev, bio: value }))}
                placeholder="Hãy giới thiệu về bản thân bạn..."
                placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                multiline
                textAlignVertical="top"
                className={`min-h-28 rounded-xl px-4 py-3 border ${darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
              />
              {profileFieldErrors.bio ? <Text className="text-red-500 text-xs mt-1">{profileFieldErrors.bio}</Text> : null}
            </View>

            <View className="flex-row items-center justify-between pt-2">
              <View className="flex-row items-center flex-1">
                <Ionicons name="calendar-outline" size={16} color={darkMode ? "#9CA3AF" : "#6B7280"} />
                <Text className={`text-sm ml-2 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Thành viên từ {memberSince}</Text>
              </View>
              <TouchableOpacity className="bg-blue-500 rounded-xl px-4 py-3 flex-row items-center" onPress={handleProfileSubmit} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons name={saved ? "checkmark" : "save-outline"} size={18} color="white" />
                )}
                <Text className="text-white font-semibold ml-2">{saving ? "Đang lưu..." : saved ? "Đã lưu!" : "Lưu"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className={`rounded-xl p-5 shadow-sm border ${darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}>
            <Text className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>Đổi mật khẩu</Text>
            <Text className={`text-sm mt-1 mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>Chọn một mật khẩu mạnh mà bạn không sử dụng ở nơi nào khác.</Text>

            {passwordError ? <View className="bg-red-50 rounded-lg p-3 mb-4"><Text className="text-red-600 text-sm">{passwordError}</Text></View> : null}

            <View className="mb-4">
              <Text className={`mb-2 font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Mật khẩu hiện tại</Text>
              <View className={`rounded-xl px-4 py-3 flex-row items-center border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                <TextInput
                  value={passwordData.currentPassword}
                  onChangeText={(value) => setPasswordData((prev) => ({ ...prev, currentPassword: value }))}
                  secureTextEntry={!showPassword}
                  placeholder="Nhập mật khẩu hiện tại"
                  placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                  autoCapitalize="none"
                  className={`flex-1 ml-3 ${darkMode ? "text-white" : "text-gray-900"}`}
                />
                <TouchableOpacity onPress={() => setShowPassword((value) => !value)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              {passwordFieldErrors.current_password ? <Text className="text-red-500 text-xs mt-1">{passwordFieldErrors.current_password}</Text> : null}
            </View>

            <View className="mb-4">
              <Text className={`mb-2 font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Mật khẩu mới</Text>
              <View className={`rounded-xl px-4 py-3 flex-row items-center border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                <TextInput
                  value={passwordData.password}
                  onChangeText={(value) => setPasswordData((prev) => ({ ...prev, password: value }))}
                  secureTextEntry={!showPassword}
                  placeholder="Ít nhất 8 ký tự"
                  placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                  autoCapitalize="none"
                  className={`flex-1 ml-3 ${darkMode ? "text-white" : "text-gray-900"}`}
                />
              </View>
              {passwordFieldErrors.password ? <Text className="text-red-500 text-xs mt-1">{passwordFieldErrors.password}</Text> : null}
            </View>

            <View className="mb-5">
              <Text className={`mb-2 font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Xác nhận mật khẩu mới</Text>
              <View className={`rounded-xl px-4 py-3 flex-row items-center border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
                <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" />
                <TextInput
                  value={passwordData.confirmPassword}
                  onChangeText={(value) => setPasswordData((prev) => ({ ...prev, confirmPassword: value }))}
                  secureTextEntry={!showPassword}
                  placeholder="Nhập lại mật khẩu mới"
                  placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                  autoCapitalize="none"
                  className={`flex-1 ml-3 ${darkMode ? "text-white" : "text-gray-900"}`}
                />
              </View>
              {passwordFieldErrors.password_confirmation ? <Text className="text-red-500 text-xs mt-1">{passwordFieldErrors.password_confirmation}</Text> : null}
            </View>

            <TouchableOpacity className="self-end bg-blue-500 rounded-xl px-4 py-3 flex-row items-center" onPress={handlePasswordSubmit} disabled={changingPassword}>
              {changingPassword ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name={passwordSaved ? "checkmark" : "lock-closed-outline"} size={18} color="white" />
              )}
              <Text className="text-white font-semibold ml-2">
                {changingPassword ? "Đang cập nhật..." : passwordSaved ? "Đã cập nhật" : "Cập nhật mật khẩu"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </>
    );
  };

  if (!isPublicProfile && (authLoading || loadingProfile)) {
    return (
      <SafeAreaView className={`flex-1 items-center justify-center ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
        <ActivityIndicator size="large" color="#0068FF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <StatusBar barStyle={darkMode ? "light-content" : (isPublicProfile ? "light-content" : "dark-content")} backgroundColor={darkMode ? "#111827" : (isPublicProfile ? "#0068FF" : "#FFFFFF")} />
      {isPublicProfile ? renderPublicProfile() : renderSettingsProfile()}
    </SafeAreaView>
  );
};

export default ProfileScreen;
