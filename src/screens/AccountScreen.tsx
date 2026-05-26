import React, { useState, useEffect } from "react";

import {

  View,

  Text,

  TextInput,

  TouchableOpacity,

  Image,

  ScrollView,

  Alert,

  ActivityIndicator,

  Modal,

} from "react-native";

import DateTimePicker from "@react-native-community/datetimepicker";

import * as ImagePicker from "expo-image-picker";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../contexts/AuthContext";

import ButtonComponent from "../components/common/ButtonComponent";
import { useTheme } from "../contexts/ThemeContext";



const AccountScreen = () => {

  const navigation = useNavigation<any>();

  const { user, updateProfile, uploadAvatar } = useAuth();
  const { isDarkMode: darkMode, colors } = useTheme();



  // State for form data

  const [formData, setFormData] = useState({

    firstName: "",

    lastName: "",

    email: "",

    bio: "",

    phoneNumber: "",

    address: "",

    dateOfBirth: "",

    gender: "MALE",

  });

  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);



  // Initialize form data with user data

  useEffect(() => {

    console.log("AccountScreen - User changed:", user?.avatarUrl);

    if (user) {

      setFormData({

        firstName: user.firstName || "",

        lastName: user.lastName || "",

        email: user.email || "",

        bio: user.bio || "",

        phoneNumber: user.phoneNumber || "",

        address: user.address || "",

        dateOfBirth: user.dateOfBirth || "",

        gender: user.gender || "MALE",

      });

    }

  }, [user]);



  // Hàm validation cho form

  const validateForm = () => {

    const errors = [];



    // Kiểm tra các trường bắt buộc

    if (!formData.firstName.trim()) {

      errors.push("Tên là bắt buộc");

    }



    if (!formData.lastName.trim()) {

      errors.push("Họ là bắt buộc");

    }



    if (!formData.email.trim()) {

      errors.push("Email là bắt buộc");

    } else {

      // Kiểm tra format email

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(formData.email)) {

        errors.push("Định dạng email không hợp lệ");

      }

    }



    // Kiểm tra số điện thoại nếu có

    if (formData.phoneNumber && formData.phoneNumber.trim()) {

      const phoneRegex = /^[+]?[0-9]{10,15}$/;

      if (!phoneRegex.test(formData.phoneNumber.replace(/[^0-9+]/g, ""))) {

        errors.push("Định dạng số điện thoại không hợp lệ");

      }

    }



    // Kiểm tra ngày sinh nếu có

    if (formData.dateOfBirth && formData.dateOfBirth.trim()) {

      const date = new Date(formData.dateOfBirth);

      const today = new Date();

      if (isNaN(date.getTime()) || date >= today) {

        errors.push("Vui lòng nhập ngày sinh hợp lệ");

      }

    }



    return errors;

  };



  const handleSave = async () => {

    // Validation trước khi lưu

    const errors = validateForm();

    if (errors.length > 0) {

      Alert.alert("Lỗi xác thực", errors.join("\n"));

      return;

    }



    // Confirm dialog

    Alert.alert(

      "Xác nhận cập nhật",

      "Bạn có chắc chắn muốn cập nhật hồ sơ không?",

      [

        {

          text: "Hủy",

          style: "cancel",

        },

        {

          text: "Cập nhật",

          onPress: async () => {

            try {

              setLoading(true);

              await updateProfile(formData);

              setIsEditing(false);

              Alert.alert("Thành công", "Cập nhật hồ sơ thành công");

            } catch (error) {

              Alert.alert(

                "Lỗi",

                error.response?.data?.message || "Không thể cập nhật hồ sơ",

              );

            } finally {

              setLoading(false);

            }

          },

        },

      ],

    );

  };



  const handleCancel = () => {

    // Reset form về dữ liệu gốc từ user

    if (user) {

      setFormData({

        firstName: user.firstName || "",

        lastName: user.lastName || "",

        email: user.email || "",

        bio: user.bio || "",

        phoneNumber: user.phoneNumber || "",

        address: user.address || "",

        dateOfBirth: user.dateOfBirth || "",

        gender: user.gender || "MALE",

      });

    }

    setIsEditing(false);

  };



  const handleDateChange = (event, selectedDate) => {

    setShowDatePicker(false);

    if (selectedDate) {

      const formattedDate = selectedDate.toISOString().split("T")[0];

      setFormData({ ...formData, dateOfBirth: formattedDate });

    }

  };



  const handleAvatarUpload = async () => {

    try {

      // Request permissions

      const permissionResult =

        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {

        Alert.alert(

          "Yêu cầu quyền truy cập",

          "Vui lòng cấp quyền truy cập thư viện ảnh để thay đổi ảnh đại diện",

        );

        return;

      }



      // Show options

      Alert.alert("Thay đổi ảnh đại diện", "Chọn một tùy chọn", [

        {

          text: "Hủy",

          style: "cancel",

        },

        {

          text: "Chụp ảnh",

          onPress: () => pickImageFromCamera(),

        },

        {

          text: "Chọn từ thư viện",

          onPress: () => pickImageFromGallery(),

        },

      ]);

    } catch (error) {

      Alert.alert("Lỗi", "Không thể mở trình chọn ảnh");

    }

  };



  const pickImageFromCamera = async () => {

    try {

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.5,

        base64: false,

      });



      if (!result.canceled && result.assets[0]) {

        await uploadSelectedImage(result.assets[0].uri);

      }

    } catch (error) {

      Alert.alert("Lỗi", "Không thể chụp ảnh");

    }

  };



  const pickImageFromGallery = async () => {

    try {

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,

        aspect: [1, 1],

        quality: 0.5,

        base64: false,

      });



      if (!result.canceled && result.assets[0]) {

        await uploadSelectedImage(result.assets[0].uri);

      }

    } catch (error) {

      Alert.alert("Lỗi", "Không thể chọn ảnh");

    }

  };



  const uploadSelectedImage = async (imageUri) => {

    try {

      setLoading(true);

      await uploadAvatar(imageUri);

      Alert.alert("Thành công", "Cập nhật ảnh đại diện thành công!");

    } catch (error) {

      Alert.alert(

        "Lỗi",

        error.response?.data?.message || "Không thể tải ảnh đại diện lên",

      );

    } finally {

      setLoading(false);

    }

  };



  const renderField = (label: string, value: string, setValue: any) => (

    <View className="mb-3">

      <Text className="text-gray-500 mb-1">{label}</Text>



      {isEditing ? (

        <TextInput

          value={value}

          onChangeText={setValue}

          className="border border-gray-200 p-3 rounded-lg"

        />

      ) : (

        <View className="bg-gray-100 p-3 rounded-lg">

          <Text className="text-gray-800">{value}</Text>

        </View>

      )}

    </View>

  );



  return (
    <SafeAreaView className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* HEADER */}
      <View className={`flex-row items-center p-4 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-blue-500 border-gray-100"}`}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold ml-4 text-white">Hồ sơ</Text>
      </View>



      {/* CONTENT */}
      <ScrollView className="flex-1 px-4 py-4">
        {/* Profile Header Card */}
        <View className={`rounded-xl p-6 mb-4 shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <View className="items-center">
            <View className="relative">
              <Image
                source={{
                  uri: user?.avatarUrl
                    ? `${user.avatarUrl}?t=${Date.now()}`
                    : "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
                }}
                className="w-24 h-24 rounded-full"
              />
              <TouchableOpacity
                className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full shadow-sm"
                onPress={handleAvatarUpload}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="camera" size={16} color="white" />
                )}
              </TouchableOpacity>
              {user?.isOnline && <View className={`absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 ${darkMode ? "border-gray-800" : "border-white"}`} />}
            </View>

            <Text className={`text-xl font-bold mt-3 ${darkMode ? "text-white" : "text-gray-800"}`}>
              {formData.lastName} {formData.firstName}{" "}
            </Text>
            <Text className={darkMode ? "text-gray-400" : "text-gray-500"}>{formData.email}</Text>

            <TouchableOpacity className={`flex-row items-center mt-2 px-3 py-1.5 rounded-full ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-green-600 text-sm font-medium">Trực tuyến</Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color="#22c55e"
                className="ml-1"
              />
            </TouchableOpacity>
          </View>
        </View>



        {/* Personal Information Card */}
        <View className={`rounded-xl p-6 mb-4 shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`text-lg font-semibold mb-1 ${darkMode ? "text-white" : "text-gray-800"}`}>
            Thông tin cá nhân
          </Text>
          <Text className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Cập nhật thông tin chi tiết cá nhân của bạn tại đây.
          </Text>

          {/* First Name */}
          <View className="mb-4">
            <Text className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Tên</Text>
            <View className={`flex-row items-center rounded-lg px-3 py-3 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <Ionicons name="person" size={18} color={darkMode ? "#9CA3AF" : "#666"} className="mr-3" />
              {isEditing ? (
                <TextInput
                  value={formData.firstName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, firstName: text })
                  }
                  placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                  className={`flex-1 ${darkMode ? "text-white" : "text-gray-800"}`}
                />
              ) : (
                <Text className={`flex-1 ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {formData.firstName}
                </Text>
              )}
            </View>
          </View>



          {/* Last Name */}
          <View className="mb-4">
            <Text className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Họ</Text>
            <View className={`flex-row items-center rounded-lg px-3 py-3 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <Ionicons name="person" size={18} color={darkMode ? "#9CA3AF" : "#666"} className="mr-3" />
              {isEditing ? (
                <TextInput
                  value={formData.lastName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, lastName: text })
                  }
                  placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                  className={`flex-1 ${darkMode ? "text-white" : "text-gray-800"}`}
                />
              ) : (
                <Text className={`flex-1 ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {formData.lastName}
                </Text>
              )}
            </View>
          </View>



          {/* Email */}
          <View className="mb-4">
            <Text className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Email</Text>
            <View className={`flex-row items-center rounded-lg px-3 py-3 ${darkMode ? "bg-gray-900 border border-gray-800" : "bg-gray-50"}`}>
              <Ionicons name="mail" size={18} color={darkMode ? "#9CA3AF" : "#666"} className="mr-3" />
              {isEditing ? (
                <TextInput
                  value={formData.email}
                  editable={false}
                  selectTextOnFocus={false}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  className={`flex-1 ${darkMode ? "text-gray-400" : "text-gray-800"}`}
                  keyboardType="email-address"
                />
              ) : (
                <Text className={`flex-1 ${darkMode ? "text-gray-400" : "text-gray-800"}`}>{formData.email}</Text>
              )}
            </View>
          </View>



          {/* Role */}
          <View className="mb-4">
            <Text className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Vai trò</Text>
            <View className={`flex-row items-center rounded-lg px-3 py-3 ${darkMode ? "bg-gray-900 border border-gray-800" : "bg-gray-50"}`}>
              <Ionicons
                name="briefcase"
                size={18}
                color={darkMode ? "#9CA3AF" : "#666"}
                className="mr-3"
              />
              <Text className={`flex-1 ${darkMode ? "text-gray-400" : "text-gray-800"}`}>Người dùng</Text>
            </View>
          </View>



          {/* Bio */}
          <View className="mb-4">
            <Text className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Tiểu sử</Text>
            <View className={`rounded-lg px-3 py-3 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              {isEditing ? (
                <TextInput
                  value={formData.bio}
                  onChangeText={(text) =>
                    setFormData({ ...formData, bio: text })
                  }
                  placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                  className={darkMode ? "text-white" : "text-gray-800"}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text className={darkMode ? "text-white" : "text-gray-800"}>{formData.bio}</Text>
              )}
            </View>
          </View>



          {/* Phone Number */}
          <View className="mb-4">
            <Text className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Số điện thoại</Text>
            <View className={`flex-row items-center rounded-lg px-3 py-3 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <Ionicons name="call" size={18} color={darkMode ? "#9CA3AF" : "#666"} className="mr-3" />
              {isEditing ? (
                <TextInput
                  value={formData.phoneNumber}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phoneNumber: text })
                  }
                  placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                  className={`flex-1 ${darkMode ? "text-white" : "text-gray-800"}`}
                  keyboardType="phone-pad"
                  placeholder="Nhập số điện thoại"
                />
              ) : (
                <Text className={`flex-1 ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {formData.phoneNumber || "Chưa cung cấp"}
                </Text>
              )}
            </View>
          </View>



          {/* Address */}
          <View className="mb-4">
            <Text className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Địa chỉ</Text>
            <View className={`flex-row items-center rounded-lg px-3 py-3 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <Ionicons
                name="location"
                size={18}
                color={darkMode ? "#9CA3AF" : "#666"}
                className="mr-3"
              />
              {isEditing ? (
                <TextInput
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                  className={`flex-1 ${darkMode ? "text-white" : "text-gray-800"}`}
                  placeholder="Nhập địa chỉ"
                />
              ) : (
                <Text className={`flex-1 ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {formData.address || "Chưa cung cấp"}
                </Text>
              )}
            </View>
          </View>



          {/* Date of Birth */}
          <View className="mb-4">
            <Text className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Ngày sinh</Text>
            <TouchableOpacity
              className={`flex-row items-center rounded-lg px-3 py-3 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}
              onPress={() => isEditing && setShowDatePicker(true)}
              disabled={!isEditing}
            >
              <Ionicons
                name="calendar"
                size={18}
                color={darkMode ? "#9CA3AF" : "#666"}
                className="mr-3"
              />
              <Text className={`flex-1 ${darkMode ? "text-white" : "text-gray-800"}`}>
                {formData.dateOfBirth
                  ? new Date(formData.dateOfBirth).toLocaleDateString("vi-VN")
                  : "Chọn ngày sinh"}
              </Text>
              {isEditing && (
                <Ionicons name="chevron-down" size={16} color={darkMode ? "#9CA3AF" : "#666"} />
              )}
            </TouchableOpacity>
          </View>



          {/* Date Picker Modal */}

          {showDatePicker && (

            <Modal

              transparent={true}

              animationType="slide"

              visible={showDatePicker}

              onRequestClose={() => setShowDatePicker(false)}

            >

              <View className="flex-1 justify-end bg-black bg-opacity-50">

                <View className={`rounded-t-2xl p-4 ${darkMode ? "bg-gray-800" : "bg-white"}`}>

                  <View className="flex-row justify-between items-center mb-4">

                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>

                      <Text className="text-blue-500 font-semibold">

                        Hủy

                      </Text>

                    </TouchableOpacity>

                    <Text className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>

                      Chọn ngày sinh

                    </Text>

                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>

                      <Text className="text-blue-500 font-semibold">Xong</Text>

                    </TouchableOpacity>

                  </View>

                  <DateTimePicker

                    value={

                      formData.dateOfBirth

                        ? new Date(formData.dateOfBirth)

                        : new Date()

                    }

                    mode="date"

                    display="spinner"

                    maximumDate={new Date()}

                    onChange={handleDateChange}

                    style={{ width: "100%" }}

                  />

                </View>

              </View>

            </Modal>

          )}



          {/* Gender */}
          <View className="mb-4">
            <Text className={`text-sm mb-2 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Giới tính</Text>
            <View className={`flex-row items-center rounded-lg px-3 py-3 ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <Ionicons name="person" size={18} color={darkMode ? "#9CA3AF" : "#666"} className="mr-3" />
              {isEditing ? (
                <View className="flex-row space-x-4">
                  <TouchableOpacity
                    onPress={() => setFormData({ ...formData, gender: "MALE" })}
                    className={`px-3 py-1 rounded ${formData.gender === "MALE" ? "bg-blue-500" : (darkMode ? "bg-gray-600" : "bg-gray-300")}`}
                  >
                    <Text
                      className={`text-sm ${formData.gender === "MALE" ? "text-white" : (darkMode ? "text-gray-300" : "text-gray-700")}`}
                    >
                      Nam
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      setFormData({ ...formData, gender: "FEMALE" })
                    }
                    className={`px-3 py-1 rounded ${formData.gender === "FEMALE" ? "bg-blue-500" : (darkMode ? "bg-gray-600" : "bg-gray-300")}`}
                  >
                    <Text
                      className={`text-sm ${formData.gender === "FEMALE" ? "text-white" : (darkMode ? "text-gray-300" : "text-gray-700")}`}
                    >
                      Nữ
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      setFormData({ ...formData, gender: "OTHER" })
                    }
                    className={`px-3 py-1 rounded ${formData.gender === "OTHER" ? "bg-blue-500" : (darkMode ? "bg-gray-600" : "bg-gray-300")}`}
                  >
                    <Text
                      className={`text-sm ${formData.gender === "OTHER" ? "text-white" : (darkMode ? "text-gray-300" : "text-gray-700")}`}
                    >
                      Khác
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text className={`flex-1 ${darkMode ? "text-white" : "text-gray-800"}`}>
                  {formData.gender === "MALE"
                    ? "Nam"
                    : formData.gender === "FEMALE"
                      ? "Nữ"
                      : formData.gender === "OTHER"
                        ? "Khác"
                        : "Chưa xác định"}
                </Text>
              )}
            </View>
          </View>



          {/* Member Since and Action Buttons */}
          <View className="flex-col items-start mt-4">
            <View className="flex-row items-center mb-3">
              <Ionicons
                name="calendar"
                size={18}
                color={darkMode ? "#9CA3AF" : "#666"}
                className="mr-3"
              />
              <Text className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                Thành viên từ tháng 1 năm 2024
              </Text>
            </View>



            {/* Action Buttons */}

            <View className={`${isEditing ? "flex-row space-x-3" : "w-full"}`}>

              {isEditing && (

                <View className="flex-1">

                  <ButtonComponent

                    title="Hủy"

                    icon="close"

                    onPress={handleCancel}

                    disabled={loading}

                    variant="secondary"

                    size="medium"

                    fullWidth={true}

                  />

                </View>

              )}



              <View className={isEditing ? "flex-1" : "w-full"}>

                <ButtonComponent

                  title={isEditing ? "Lưu thay đổi" : "Chỉnh sửa hồ sơ"}

                  icon={isEditing ? "save" : "create"}

                  onPress={() =>

                    isEditing ? handleSave() : setIsEditing(true)

                  }

                  loading={loading}

                  variant="primary"

                  size="medium"

                  fullWidth={true}

                />

              </View>

            </View>

          </View>

        </View>



        {/* Activity Statistics Card */}
        <View className={`rounded-xl p-6 mb-4 shadow-sm ${darkMode ? "bg-gray-800" : "bg-white"}`}>
          <Text className={`text-lg font-semibold mb-1 ${darkMode ? "text-white" : "text-gray-800"}`}>
            Thống kê hoạt động
          </Text>
          <Text className={`text-sm mb-4 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Tổng quan về hoạt động trò chuyện của bạn
          </Text>

          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-500">156</Text>
              <Text className={`text-sm mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Trò chuyện</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-500">12</Text>
              <Text className={`text-sm mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Cuộc gọi</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-purple-500">8</Text>
              <Text className={`text-sm mt-1 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Tài liệu</Text>
            </View>
          </View>
        </View>

      </ScrollView>

    </SafeAreaView>

  );

};



export default AccountScreen;

