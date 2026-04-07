import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const AccountScreen = () => {
  const navigation = useNavigation<any>();

  // 🔥 STATE DATA
  const [name, setName] = useState("John Doe");
  const [email, setEmail] = useState("john@example.com");
  const [role, setRole] = useState("Admin");
  const [bio, setBio] = useState("Full-stack developer passionate about building great products.");
  const [status, setStatus] = useState("Online");

  // 🔥 MODE: view / edit
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
  };

  const renderField = (
    label: string,
    value: string,
    setValue: any
  ) => (
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

      {/* 🔹 HEADER */}
      <View className="flex-row items-center p-4 bg-blue-500 border-b border-gray-100">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold ml-4 text-white">
          Profile
        </Text>
      </View>

      {/* CONTENT */}
      <ScrollView className="flex-1 px-4 py-4">
        {/* Profile Header Card */}
        <View className="bg-white rounded-xl p-6 mb-4 shadow-sm">
          <View className="items-center">
            <View className="relative">
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
                }}
                className="w-24 h-24 rounded-full"
              />
              <TouchableOpacity className="absolute bottom-0 right-0 bg-blue-500 p-2 rounded-full shadow-sm">
                <Ionicons name="camera" size={16} color="white" />
              </TouchableOpacity>
              <View className="absolute bottom-1 right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            </View>
            
            <Text className="text-xl font-bold text-gray-800 mt-3">{name}</Text>
            <Text className="text-gray-500">{email}</Text>
            
            <TouchableOpacity className="flex-row items-center mt-2 bg-gray-100 px-3 py-1.5 rounded-full">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="text-green-600 text-sm font-medium">{status}</Text>
              <Ionicons name="chevron-down" size={14} color="#22c55e" className="ml-1" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Information Card */}
        <View className="bg-white rounded-xl p-6 mb-4 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-1">Personal Information</Text>
          <Text className="text-sm text-gray-500 mb-4">Update your personal details here.</Text>
          
          {/* Full Name */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Full Name</Text>
            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3">
              <Ionicons name="person" size={18} color="#666" className="mr-3" />
              {isEditing ? (
                <TextInput
                  value={name}
                  onChangeText={setName}
                  className="flex-1 text-gray-800"
                />
              ) : (
                <Text className="flex-1 text-gray-800">{name}</Text>
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
                  value={email}
                  onChangeText={setEmail}
                  className="flex-1 text-gray-800"
                  keyboardType="email-address"
                />
              ) : (
                <Text className="flex-1 text-gray-800">{email}</Text>
              )}
            </View>
          </View>
          
          {/* Role */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Role</Text>
            <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-3">
              <Ionicons name="briefcase" size={18} color="#666" className="mr-3" />
              <Text className="flex-1 text-gray-800">{role}</Text>
            </View>
          </View>
          
          {/* Bio */}
          <View className="mb-4">
            <Text className="text-sm text-gray-600 mb-2">Bio</Text>
            <View className="bg-gray-50 rounded-lg px-3 py-3">
              {isEditing ? (
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  className="text-gray-800"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <Text className="text-gray-800">{bio}</Text>
              )}
            </View>
          </View>
          
          {/* Member Since and Save Button */}
          <View className="flex-row items-center justify-between mt-4">
            <View className="flex-row items-center">
              <Ionicons name="calendar" size={18} color="#666" className="mr-3" />
              <Text className="text-sm text-gray-600">Member since January 2024</Text>
            </View>
            
            <TouchableOpacity
              className="bg-blue-500 p-3 rounded-lg flex-row items-center justify-center"
              onPress={() => isEditing ? handleSave() : setIsEditing(true)}
            >
              <Ionicons name="save" size={18} color="white" className="mr-2" />
              <Text className="text-white font-semibold">
                {isEditing ? "Save Changes" : "Edit Profile"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Activity Statistics Card */}
        <View className="bg-white rounded-xl p-6 mb-4 shadow-sm">
          <Text className="text-lg font-semibold text-gray-800 mb-1">Activity Statistics</Text>
          <Text className="text-sm text-gray-500 mb-4">Your chat activity overview</Text>
          
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