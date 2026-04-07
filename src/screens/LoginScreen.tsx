import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { users } from "../data/users";

const LoginScreen = () => {
  const navigation = useNavigation<any>();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    const user = users.find(
      (u) => u.phone === phone && u.password === password
    );

    if (user) {
      navigation.replace("MainApp", { user });
    } else {
      Alert.alert("Login Failed", "Phone number or password is incorrect");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        {/* Logo and Welcome */}
        <View className="items-center mt-12 mb-8">
          <View className="w-24 h-24 bg-blue-500 rounded-2xl justify-center items-center mb-6">
            <Ionicons name="chatbubble-ellipses" size={40} color="white" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 mb-2">Welcome Back!</Text>
          <Text className="text-gray-500 text-center">Sign in to continue to your account</Text>
        </View>

        {/* Input Fields */}
        <View className="mb-6">
          {/* Email/Phone Input */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Email or Phone</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
              <Ionicons name="mail" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Enter your email or phone"
                value={phone}
                onChangeText={setPhone}
                className="flex-1 text-gray-900"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password Input */}
          <View className="mb-2">
            <Text className="text-gray-700 mb-2 font-medium">Password</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                className="flex-1 text-gray-900"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons 
                  name={showPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity className="self-end mb-6">
            <Text className="text-blue-500 text-sm">Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Login Button */}
        <TouchableOpacity
          className="bg-blue-500 py-4 rounded-xl items-center mb-6"
          onPress={handleLogin}
        >
          <Text className="text-white font-semibold text-lg">Sign In</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="px-4 text-gray-500 text-sm">Or continue with</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        {/* Social Login */}
        <View className="flex-row justify-center mb-8">
          <TouchableOpacity className="bg-gray-100 p-3 rounded-xl mr-4">
            <Ionicons name="logo-google" size={24} color="#4285F4" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-gray-100 p-3 rounded-xl">
            <Ionicons name="logo-github" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {/* Sign Up Link */}
        <View className="items-center mb-8">
          <Text className="text-gray-600">
            Don't have an account?{" "}
            <Text 
              className="text-blue-500 font-semibold"
              onPress={() => navigation.navigate("Register")}
            >
              Sign Up
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default LoginScreen;