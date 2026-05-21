import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import ButtonComponent from "../components/common/ButtonComponent";

const LoginScreen = () => {
  const navigation = useNavigation<any>();
  const { login, loading } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadCredentials = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('saved_email');
        const savedPassword = await AsyncStorage.getItem('saved_password');
        const isRemembered = await AsyncStorage.getItem('remember_me');
        
        if (isRemembered === 'true' && savedEmail && savedPassword) {
          setIdentifier(savedEmail);
          setPassword(savedPassword);
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Failed to load credentials', error);
      }
    };
    loadCredentials();
  }, []);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập email và password");
      return;
    }
    try {
      await login(identifier, password);
      
      if (rememberMe) {
        await AsyncStorage.setItem('saved_email', identifier);
        await AsyncStorage.setItem('saved_password', password);
        await AsyncStorage.setItem('remember_me', 'true');
      } else {
        await AsyncStorage.removeItem('saved_email');
        await AsyncStorage.removeItem('saved_password');
        await AsyncStorage.setItem('remember_me', 'false');
      }
      
      // AuthWrapper sẽ tự động chuyển sang MainApp khi isAuthenticated thay đổi
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed";

      Alert.alert("Login Failed", message);
      console.log("Login error details:", {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      });
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
          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Email</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
              <Ionicons name="mail" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Enter your email"
                value={identifier}
                onChangeText={setIdentifier}
                className="flex-1 text-gray-900"
                keyboardType="email-address"
                autoCapitalize="none"
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

          <View className="flex-row justify-between items-center mb-6">
            <TouchableOpacity 
              className="flex-row items-center"
              onPress={() => setRememberMe(!rememberMe)}
            >
              <Ionicons
                name={rememberMe ? "checkbox" : "square-outline"}
                size={22}
                color={rememberMe ? "#3B82F6" : "#9CA3AF"}
              />
              <Text className="ml-2 text-gray-700">Nhớ mật khẩu</Text>
            </TouchableOpacity>

            <TouchableOpacity>
              <Text className="text-blue-500 text-sm" onPress={() => {
                navigation.navigate("ForgotPassword");
              }}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Login Button */}
        <ButtonComponent
          title="Sign In"
          onPress={handleLogin}
          loading={loading}
          variant="primary"
          size="full"
          fullWidth={true}
        />

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

        {/* Forgot Password Link */}
        {/* <View className="items-center mb-4">
          <TouchableOpacity onPress={() => {
            navigation.navigate("ForgotPassword");
          }}>
            <Text className="text-blue-500 font-semibold">Quên Mát Kháu?</Text>
          </TouchableOpacity>
        </View> */}

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
