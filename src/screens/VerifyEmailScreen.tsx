import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { authAPI } from "../services/api";
import ButtonComponent from "../components/common/ButtonComponent";

const VerifyEmailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [email, setEmail] = useState(route.params?.email || "");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async () => {
    if (!email || !otp) {
      Alert.alert("Error", "Please enter your email and OTP code");
      return;
    }

    try {
      setLoading(true);
      await authAPI.verifyEmail(email.trim(), otp.trim());
      Alert.alert("Success", "Email verified. You can sign in now.", [
        {
          text: "Go to login",
          onPress: () => navigation.replace("Login"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Unable to verify email");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email first");
      return;
    }

    try {
      setResending(true);
      await authAPI.sendOTP(email.trim());
      Alert.alert("Success", "If the email is registered and unverified, a new code has been sent.");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Unable to resend code");
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        <View className="mb-8 mt-4 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="ml-4 text-xl font-semibold text-gray-900">Verify Email</Text>
        </View>

        <View className="mb-8 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-blue-500">
            <Ionicons name="shield-checkmark" size={36} color="white" />
          </View>
          <Text className="mb-2 text-lg font-semibold text-gray-900">Verify your email</Text>
          <Text className="text-center text-gray-500">
            We sent a 6-digit verification code to your email address.
          </Text>
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

        <View className="mb-6">
          <Text className="mb-2 font-medium text-gray-700">Verification code</Text>
          <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <Ionicons name="key" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="123456"
              value={otp}
              onChangeText={(value) => setOtp(value.replace(/\D/g, ""))}
              className="ml-3 flex-1 tracking-widest text-gray-900"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
        </View>

        <ButtonComponent
          title="Verify Email"
          onPress={handleVerify}
          loading={loading}
          variant="primary"
          size="full"
          fullWidth={true}
          icon="checkmark-circle"
        />

        <ButtonComponent
          title={resending ? "Resending..." : "Resend Code"}
          onPress={handleResend}
          loading={resending}
          variant="outline"
          size="full"
          fullWidth={true}
          className="mt-3"
          icon="refresh"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default VerifyEmailScreen;
