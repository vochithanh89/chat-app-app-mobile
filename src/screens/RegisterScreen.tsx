import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import ButtonComponent from "../components/common/ButtonComponent";

const RegisterScreen = () => {
  const navigation = useNavigation<any>();
  const { sendOTP, register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleSendOtp = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    try {
      setLoading(true);
      await sendOTP(email);
      setOtpSent(true);
      Alert.alert("Success", "OTP has been sent to your email");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!otp) {
      Alert.alert("Error", "Please fill OTP");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await register({
        fullName: name,
        email: email,
        password: password,
        confirmPassword: confirmPassword,
        otp: otp
      });
      Alert.alert("Success", "Account registered successfully!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        {/* Logo and Welcome */}
        <View className="items-center mt-12 mb-8">
          <View className="w-24 h-24 bg-blue-500 rounded-2xl justify-center items-center mb-6">
            <Ionicons name="person-add" size={40} color="white" />
          </View>
          <Text className="text-3xl font-bold text-gray-900 mb-2">Create Account</Text>
          <Text className="text-gray-500 text-center">Sign up to get started with your account</Text>
        </View>

        {/* Input Fields */}
        <View className="mb-6">
          {/* Name Input */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Full Name</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
              <Ionicons name="person" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                className="flex-1 text-gray-900"
              />
            </View>
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Email</Text>
            <View className="flex-row">
              <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200 flex-1">
                <Ionicons name="mail" size={20} color="#9CA3AF" className="mr-3" />
                <TextInput
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  className="flex-1 text-gray-900"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <ButtonComponent
                title="Send OTP"
                onPress={handleSendOtp}
                loading={loading}
                disabled={!email}
                variant="primary"
                size="medium"
                icon="mail"
              />
            </View>
          </View>

          {/* OTP Input */}
          {otpSent && (
            <View className="mb-4">
              <Text className="text-gray-700 mb-2 font-medium">OTP Code</Text>
              <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
                <Ionicons name="key" size={20} color="#9CA3AF" className="mr-3" />
                <TextInput
                  placeholder="Enter OTP"
                  value={otp}
                  onChangeText={setOtp}
                  className="flex-1 text-gray-900"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>
          )}

          {/* Password Input */}
          <View className="mb-4">
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

          {/* Confirm Password Input */}
          <View className="mb-2">
            <Text className="text-gray-700 mb-2 font-medium">Confirm Password</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                className="flex-1 text-gray-900"
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

        {/* Terms and Conditions */}
        <View className="mb-6">
          <Text className="text-gray-600 text-center text-sm">
            By creating an account, you agree to our{" "}
            <Text className="text-blue-500 font-semibold">Terms of Service</Text>
            {" "}and{" "}
            <Text className="text-blue-500 font-semibold">Privacy Policy</Text>
          </Text>
        </View>

        {/* Register Button */}
        <ButtonComponent
          title="Create Account"
          onPress={handleRegister}
          loading={loading}
          disabled={!otpSent}
          variant="primary"
          size="full"
          fullWidth={true}
          icon="person-add"
        />

        {/* Divider */}
        <View className="flex-row items-center mb-6">
          <View className="flex-1 h-px bg-gray-300" />
          <Text className="px-4 text-gray-500 text-sm">Or sign up with</Text>
          <View className="flex-1 h-px bg-gray-300" />
        </View>

        {/* Social Register */}
        <View className="flex-row justify-center mb-8">
          <TouchableOpacity className="bg-gray-100 p-3 rounded-xl mr-4">
            <Ionicons name="logo-google" size={24} color="#4285F4" />
          </TouchableOpacity>
          <TouchableOpacity className="bg-gray-100 p-3 rounded-xl">
            <Ionicons name="logo-github" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {/* Sign In Link */}
        <View className="items-center mb-8">
          <Text className="text-gray-600">
            Already have an account?{" "}
            <Text 
              className="text-blue-500 font-semibold"
              onPress={() => navigation.goBack()}
            >
              Sign In
            </Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RegisterScreen;