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

const AccountScreen = () => {
  const navigation = useNavigation<any>();
  const { user, updateProfile, uploadAvatar } = useAuth();

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
      errors.push("First name is required");
    }

    if (!formData.lastName.trim()) {
      errors.push("Last name is required");
    }

    if (!formData.email.trim()) {
      errors.push("Email is required");
    } else {
      // Kiểm tra format email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.push("Email format is invalid");
      }
    }

    // Kiểm tra số điện thoại nếu có
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneRegex = /^[+]?[0-9]{10,15}$/;
      if (!phoneRegex.test(formData.phoneNumber.replace(/[^0-9+]/g, ""))) {
        errors.push("Phone number format is invalid");
      }
    }

    // Kiểm tra ngày sinh nếu có
    if (formData.dateOfBirth && formData.dateOfBirth.trim()) {
      const date = new Date(formData.dateOfBirth);
      const today = new Date();
      if (isNaN(date.getTime()) || date >= today) {
        errors.push("Please enter a valid date of birth");
      }
    }

    return errors;
  };

  const handleSave = async () => {
    // Validation trước khi lưu
    const errors = validateForm();
    if (errors.length > 0) {
      Alert.alert("Validation Error", errors.join("\n"));
      return;
    }

    // Confirm dialog
    Alert.alert(
      "Confirm Update",
      "Are you sure you want to update your profile?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Update",
          onPress: async () => {
            try {
              setLoading(true);
              await updateProfile(formData);
              setIsEditing(false);
              Alert.alert("Success", "Profile updated successfully");
            } catch (error) {
              Alert.alert(
                "Error",
                error.response?.data?.message || "Failed to update profile",
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
          "Permission Required",
          "Please grant camera roll permissions to change your avatar",
        );
        return;
      }

      // Show options
      Alert.alert("Change Avatar", "Choose an option", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Take Photo",
          onPress: () => pickImageFromCamera(),
        },
        {
          text: "Choose from Gallery",
          onPress: () => pickImageFromGallery(),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to access image picker");
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to select image");
    }
  };

  const uploadSelectedImage = async (imageUri) => {
    try {
      setLoading(true);
      await uploadAvatar(imageUri);
      Alert.alert("Success", "Avatar updated successfully!");
    } catch (error) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to upload avatar",
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
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* HEADER */}
      <View className="flex-row items-center p-4 bg-blue-500 border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold ml-4 text-white">Profile</Text>
      </View>

      {/* CONTENT */}
      <ScrollView className="flex-1 px-4 py-4">
        {/* Profile Header Card */}
        <View className="bg-white rounded-xl p-6 mb-4 shadow-sm">
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
              <View className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </View>

            <Text className="text-xl font-bold text-gray-800 mt-3">
              {formData.lastName} {formData.firstName}{" "}
            </Text>
            <Text className="text-gray-500">{formData.email}</Text>

            <TouchableOpacity className="flex-row items-center mt-2 bg-gray-100 px-3 py-1.5 rounded-full">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-green-600 text-sm font-medium">Online</Text>
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
        <View className="bg-white rounded-xl p-6 mb-4 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-1">
            Personal Information
          </Text>
          <Text className="text-sm text-gray-500 mb-4">
            Update your personal details here.
          </Text>

          {/* First Name */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">First Name</Text>
            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3">
              <Ionicons name="person" size={18} color="#666" className="mr-3" />
              {isEditing ? (
                <TextInput
                  value={formData.firstName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, firstName: text })
                  }
                  className="flex-1 text-gray-800"
                />
              ) : (
                <Text className="flex-1 text-gray-800">
                  {formData.firstName}
                </Text>
              )}
            </View>
          </View>

          {/* Last Name */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Last Name</Text>
            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3">
              <Ionicons name="person" size={18} color="#666" className="mr-3" />
              {isEditing ? (
                <TextInput
                  value={formData.lastName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, lastName: text })
                  }
                  className="flex-1 text-gray-800"
                />
              ) : (
                <Text className="flex-1 text-gray-800">
                  {formData.lastName}
                </Text>
              )}
            </View>
          </View>

          {/* Email */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Email</Text>
            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3">
              <Ionicons name="mail" size={18} color="#666" className="mr-3" />
              {isEditing ? (
                <TextInput
                  value={formData.email}
                  editable={false}
                  selectTextOnFocus={false}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  className="flex-1 text-gray-800"
                  keyboardType="email-address"
                />
              ) : (
                <Text className="flex-1 text-gray-800">{formData.email}</Text>
              )}
            </View>
          </View>

          {/* Role */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Role</Text>
            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3">
              <Ionicons
                name="briefcase"
                size={18}
                color="#666"
                className="mr-3"
              />
              <Text className="flex-1 text-gray-800">User</Text>
            </View>
          </View>

          {/* Bio */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Bio</Text>
            <View className="bg-gray-50 rounded-lg px-3 py-3">
              {isEditing ? (
                <TextInput
                  value={formData.bio}
                  onChangeText={(text) =>
                    setFormData({ ...formData, bio: text })
                  }
                  className="text-gray-800"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text className="text-gray-800">{formData.bio}</Text>
              )}
            </View>
          </View>

          {/* Phone Number */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Phone Number</Text>
            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3">
              <Ionicons name="call" size={18} color="#666" className="mr-3" />
              {isEditing ? (
                <TextInput
                  value={formData.phoneNumber}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phoneNumber: text })
                  }
                  className="flex-1 text-gray-800"
                  keyboardType="phone-pad"
                  placeholder="Enter phone number"
                />
              ) : (
                <Text className="flex-1 text-gray-800">
                  {formData.phoneNumber || "Not provided"}
                </Text>
              )}
            </View>
          </View>

          {/* Address */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Address</Text>
            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3">
              <Ionicons
                name="location"
                size={18}
                color="#666"
                className="mr-3"
              />
              {isEditing ? (
                <TextInput
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  className="flex-1 text-gray-800"
                  placeholder="Enter address"
                />
              ) : (
                <Text className="flex-1 text-gray-800">
                  {formData.address || "Not provided"}
                </Text>
              )}
            </View>
          </View>

          {/* Date of Birth */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Date of Birth</Text>
            <TouchableOpacity
              className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3"
              onPress={() => isEditing && setShowDatePicker(true)}
              disabled={!isEditing}
            >
              <Ionicons
                name="calendar"
                size={18}
                color="#666"
                className="mr-3"
              />
              <Text className="flex-1 text-gray-800">
                {formData.dateOfBirth
                  ? new Date(formData.dateOfBirth).toLocaleDateString()
                  : "Select date of birth"}
              </Text>
              {isEditing && (
                <Ionicons name="chevron-down" size={16} color="#666" />
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
                <View className="bg-white rounded-t-2xl p-4">
                  <View className="flex-row justify-between items-center mb-4">
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text className="text-blue-500 font-semibold">
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <Text className="text-lg font-semibold">
                      Select Date of Birth
                    </Text>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text className="text-blue-500 font-semibold">Done</Text>
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
            <Text className="text-sm text-gray-600 mb-2">Gender</Text>
            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3">
              <Ionicons name="person" size={18} color="#666" className="mr-3" />
              {isEditing ? (
                <View className="flex-row space-x-4">
                  <TouchableOpacity
                    onPress={() => setFormData({ ...formData, gender: "MALE" })}
                    className={`px-3 py-1 rounded ${formData.gender === "MALE" ? "bg-blue-500" : "bg-gray-300"}`}
                  >
                    <Text
                      className={`text-sm ${formData.gender === "MALE" ? "text-white" : "text-gray-700"}`}
                    >
                      Male
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      setFormData({ ...formData, gender: "FEMALE" })
                    }
                    className={`px-3 py-1 rounded ${formData.gender === "FEMALE" ? "bg-blue-500" : "bg-gray-300"}`}
                  >
                    <Text
                      className={`text-sm ${formData.gender === "FEMALE" ? "text-white" : "text-gray-700"}`}
                    >
                      Female
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      setFormData({ ...formData, gender: "OTHER" })
                    }
                    className={`px-3 py-1 rounded ${formData.gender === "OTHER" ? "bg-blue-500" : "bg-gray-300"}`}
                  >
                    <Text
                      className={`text-sm ${formData.gender === "OTHER" ? "text-white" : "text-gray-700"}`}
                    >
                      Other
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text className="flex-1 text-gray-800">
                  {formData.gender === "MALE"
                    ? "Male"
                    : formData.gender === "FEMALE"
                      ? "Female"
                      : formData.gender === "OTHER"
                        ? "Other"
                        : "Not specified"}
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
                color="#666"
                className="mr-3"
              />
              <Text className="text-sm text-gray-600">
                Member since January 2024
              </Text>
            </View>

            {/* Action Buttons */}
            <View className={`${isEditing ? "flex-row space-x-3" : "w-full"}`}>
              {isEditing && (
                <View className="flex-1">
                  <ButtonComponent
                    title="Cancel"
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
                  title={isEditing ? "Save Changes" : "Edit Profile"}
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
        <View className="bg-white rounded-xl p-6 mb-4 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-1">
            Activity Statistics
          </Text>
          <Text className="text-sm text-gray-500 mb-4">
            Your chat activity overview
          </Text>

          <View className="flex-row justify-around">
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-500">156</Text>
              <Text className="text-sm text-gray-600 mt-1">Chats</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-500">12</Text>
              <Text className="text-sm text-gray-600 mt-1">Calls</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-purple-500">8</Text>
              <Text className="text-sm text-gray-600 mt-1">Files</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountScreen;
