import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const AccountScreen = () => {
  const navigation = useNavigation<any>();

  // 🔥 STATE DATA
  const [name, setName] = useState("Nguyễn Văn A");
  const [email, setEmail] = useState("vana@gmail.com");
  const [phone, setPhone] = useState("0123456789");
  const [dob, setDob] = useState("01/01/2000");

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
          Thông tin tài khoản
        </Text>
      </View>

      {/* 🔹 CONTENT */}
      <View className="px-4">

        {/* Avatar */}
        <View className="items-center mt-4 mb-6">
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
            }}
            className="w-24 h-24 rounded-full mb-2"
          />

          {isEditing && (
            <TouchableOpacity>
              <Text className="text-zalo">Đổi ảnh đại diện</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Form */}
        <View className="bg-white p-4 rounded-xl">
          {renderField("Tên", name, setName)}
          {renderField("Email", email, setEmail)}
          {renderField("Số điện thoại", phone, setPhone)}
          {renderField("Ngày sinh", dob, setDob)}
        </View>

        {/* Button */}
        <TouchableOpacity
          className="mt-6 bg-zalo p-4 rounded-xl items-center"
          onPress={() =>
            isEditing ? handleSave() : setIsEditing(true)
          }
        >
          <Text className="text-white font-semibold">
            {isEditing ? "Lưu thay đổi" : "Cập nhật thông tin"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AccountScreen;