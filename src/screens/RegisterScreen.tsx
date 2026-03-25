import React from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

const RegisterScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView className="flex-1 bg-gray-50 px-6 justify-center">
      <Text className="text-2xl font-bold text-zalo text-center mb-8">
        Đăng ký
      </Text>

      <TextInput
        placeholder="Số điện thoại"
        className="bg-white p-4 rounded-xl mb-3 border border-gray-200"
      />
      <TextInput
        placeholder="Mật khẩu"
        secureTextEntry
        className="bg-white p-4 rounded-xl mb-3 border border-gray-200"
      />
      <TextInput
        placeholder="Nhập lại mật khẩu"
        secureTextEntry
        className="bg-white p-4 rounded-xl mb-5 border border-gray-200"
      />

      <TouchableOpacity
        className="bg-zalo py-4 rounded-xl items-center"
        onPress={() => navigation.goBack()}
      >
        <Text className="text-white font-semibold">Tạo tài khoản</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default RegisterScreen;