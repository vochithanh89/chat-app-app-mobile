import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { users } from "../data/users";

const LoginScreen = () => {
  const navigation = useNavigation<any>();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    const user = users.find(
      (u) => u.phone === phone && u.password === password
    );

    if (user) {
      navigation.replace("Main", { user });
    } else {
      Alert.alert("Sai thông tin", "Số điện thoại hoặc mật khẩu không đúng");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 px-6 justify-center">
      {/* Logo */}
      <View className="items-center mb-10">
        <Image
          source={{
            uri: "https://via.placeholder.com/100x100/0068FF/FFFFFF?text=Zalo",
          }}
          className="w-20 h-20 mb-4"
        />
        <Text className="text-2xl font-bold text-zalo">Zalo</Text>
      </View>

      {/* Input */}
      <View className="mb-4">
        <TextInput
          placeholder="Số điện thoại"
          value={phone}
          onChangeText={setPhone}
          className="bg-white p-4 rounded-xl mb-3 border border-gray-200"
        />
        <TextInput
          placeholder="Mật khẩu"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          className="bg-white p-4 rounded-xl border border-gray-200"
        />
      </View>

      {/* Button Login */}
      <TouchableOpacity
        className="bg-zalo py-4 rounded-xl items-center"
        onPress={handleLogin}
      >
        <Text className="text-white font-semibold">Đăng nhập</Text>
      </TouchableOpacity>

      {/* Register */}
      <TouchableOpacity
        className="mt-4 items-center"
        onPress={() => navigation.navigate("Register")}
      >
        <Text className="text-gray-600">
          Chưa có tài khoản?{" "}
          <Text className="text-zalo font-semibold">Đăng ký</Text>
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default LoginScreen;