import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
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

  // Inline error state per field
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateRegisterForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Vui lòng nhập họ tên";
    if (!email.trim()) newErrors.email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      newErrors.email = "Email không hợp lệ";

    if (!phone.trim()) newErrors.phone = "Vui lòng nhập số điện thoại";
    else if (!/^\+?[0-9\s\-()]{8,20}$/.test(phone.trim()))
      newErrors.phone = "Số điện thoại không hợp lệ";

    if (!password) newErrors.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 8)
      newErrors.password = "Mật khẩu phải có ít nhất 8 ký tự";

    if (!confirmPassword)
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateRegisterForm() || loading) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});
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
      console.log("Register error details:", JSON.stringify(error.response?.data, null, 2));
      const data = error.response?.data;
      const serverErrors: Record<string, string> = {};

      // Map server validation errors to fields
      if (data?.errors && typeof data.errors === "object") {
        if (Array.isArray(data.errors)) {
          data.errors.forEach((e: any) => {
            const field = e.field || e.path || "general";
            serverErrors[field] = e.message || e.msg || JSON.stringify(e);
          });
        } else {
          Object.entries(data.errors).forEach(([field, msgs]: [string, any]) => {
            serverErrors[field] = Array.isArray(msgs) ? msgs.join(", ") : String(msgs);
          });
        }
      }

      // Always set a general error message
      if (Object.keys(serverErrors).length === 0) {
        serverErrors.general = data?.message || "Đăng ký thất bại. Vui lòng thử lại.";
      } else if (data?.message) {
        serverErrors.general = data.message;
      }

      setErrors(serverErrors);
    } finally {
      setLoading(false);
    }
  };

  const ErrorText = ({ field }: { field: string }) =>
    errors[field] ? (
      <View className="mt-1 flex-row items-center">
        <Ionicons name="alert-circle" size={14} color="#EF4444" />
        <Text className="ml-1 text-xs text-red-500">{errors[field]}</Text>
      </View>
    ) : null;

  const inputBorder = (field: string) =>
    errors[field]
      ? "flex-row items-center rounded-xl border border-red-400 bg-red-50 px-4 py-3"
      : "flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3";

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

        {/* General error banner */}
        {errors.general ? (
          <View className="mb-4 flex-row items-center rounded-xl bg-red-50 px-4 py-3 border border-red-200">
            <Ionicons name="warning" size={20} color="#EF4444" />
            <Text className="ml-2 flex-1 text-sm text-red-600">{errors.general}</Text>
          </View>
        ) : null}

        <View className="mb-6">
          <View className="mb-4">
            <Text className="mb-2 font-medium text-gray-700">Full Name</Text>
            <View className={inputBorder("name")}>
              <Ionicons name="person" size={20} color={errors.name ? "#F87171" : "#9CA3AF"} />
              <TextInput
                placeholder="John Doe"
                value={name}
                onChangeText={(v) => { setName(v); clearFieldError("name"); }}
                className="ml-3 flex-1 text-gray-900"
              />
            </View>
            <ErrorText field="name" />
          </View>

          <View className="mb-4">
            <Text className="mb-2 font-medium text-gray-700">Email</Text>
            <View className={inputBorder("email")}>
              <Ionicons name="mail" size={20} color={errors.email ? "#F87171" : "#9CA3AF"} />
              <TextInput
                placeholder="john@example.com"
                value={email}
                onChangeText={(v) => { setEmail(v); clearFieldError("email"); }}
                className="ml-3 flex-1 text-gray-900"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <ErrorText field="email" />
          </View>

          <View className="mb-4">
            <Text className="mb-2 font-medium text-gray-700">Phone number</Text>
            <View className={inputBorder("phone")}>
              <Ionicons name="call" size={20} color={errors.phone ? "#F87171" : "#9CA3AF"} />
              <TextInput
                placeholder="+84 912 345 678"
                value={phone}
                onChangeText={(v) => { setPhone(v); clearFieldError("phone"); }}
                className="ml-3 flex-1 text-gray-900"
                keyboardType="phone-pad"
              />
            </View>
            <ErrorText field="phone" />
          </View>

          <View className="mb-4">
            <Text className="mb-2 font-medium text-gray-700">Password</Text>
            <View className={inputBorder("password")}>
              <Ionicons name="lock-closed" size={20} color={errors.password ? "#F87171" : "#9CA3AF"} />
              <TextInput
                placeholder="Create a password"
                value={password}
                onChangeText={(v) => { setPassword(v); clearFieldError("password"); }}
                secureTextEntry={!showPassword}
                className="ml-3 flex-1 text-gray-900"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ErrorText field="password" />
          </View>

          <View className="mb-2">
            <Text className="mb-2 font-medium text-gray-700">Confirm Password</Text>
            <View className={inputBorder("confirmPassword")}>
              <Ionicons name="lock-closed" size={20} color={errors.confirmPassword ? "#F87171" : "#9CA3AF"} />
              <TextInput
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearFieldError("confirmPassword"); }}
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
            <ErrorText field="confirmPassword" />
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
