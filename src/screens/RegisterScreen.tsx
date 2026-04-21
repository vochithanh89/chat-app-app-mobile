import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { authAPI } from "../services/api";
import ButtonComponent from "../components/common/ButtonComponent";

const RegisterScreen = () => {
  const navigation = useNavigation<any>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validateRegisterForm = () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return false;
    }

    if (!/^\+?[0-9\s\-()]{8,20}$/.test(phone.trim())) {
      Alert.alert("Error", "Please enter a valid phone number");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateRegisterForm() || loading) {
      return;
    }

    try {
      setLoading(true);
      await authAPI.register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        password_confirmation: confirmPassword,
      });

      navigation.replace("VerifyEmail", {
        email: email.trim(),
      });
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        <View className="mb-8 mt-12 items-center">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-2xl bg-blue-500">
            <Ionicons name="person-add" size={40} color="white" />
          </View>
          <Text className="mb-2 text-3xl font-bold text-gray-900">Create Account</Text>
          <Text className="text-center text-gray-500">
            Enter your details to get started with ChatApp
          </Text>
        </View>

        <View className="mb-6">
          <View className="mb-4">
            <Text className="mb-2 font-medium text-gray-700">Full Name</Text>
            <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <Ionicons name="person" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
                className="ml-3 flex-1 text-gray-900"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="mb-2 font-medium text-gray-700">Email</Text>
            <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <Ionicons name="mail" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="john@example.com"
                value={email}
                onChangeText={setEmail}
                className="ml-3 flex-1 text-gray-900"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="mb-2 font-medium text-gray-700">Phone number</Text>
            <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <Ionicons name="call" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="+84 912 345 678"
                value={phone}
                onChangeText={setPhone}
                className="ml-3 flex-1 text-gray-900"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="mb-2 font-medium text-gray-700">Password</Text>
            <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                className="ml-3 flex-1 text-gray-900"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <View className="mb-2">
            <Text className="mb-2 font-medium text-gray-700">Confirm Password</Text>
            <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
              <TextInput
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                className="ml-3 flex-1 text-gray-900"
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ButtonComponent
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          variant="primary"
          size="full"
          fullWidth={true}
          icon="person-add"
        />

        <View className="mb-8 mt-8 items-center">
          <Text className="text-gray-600">
            Already have an account?{" "}
            <Text className="font-semibold text-blue-500" onPress={() => navigation.goBack()}>
              Sign In
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RegisterScreen;
