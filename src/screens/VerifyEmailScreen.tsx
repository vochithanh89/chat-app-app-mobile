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
      Alert.alert("Lỗi", "Vui lòng nhập email và mã OTP của bạn");
      return;
    }

    try {
      setLoading(true);
      await authAPI.verifyEmail(email.trim(), otp.trim());
      Alert.alert("Thành công", "Đã xác thực email. Bây giờ bạn có thể đăng nhập.", [
        {
          text: "Đi tới đăng nhập",
          onPress: () => navigation.replace("Login"),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể xác thực email");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert("Lỗi", "Vui lòng nhập email của bạn trước");
      return;
    }

    try {
      setResending(true);
      await authAPI.sendOTP(email.trim());
      Alert.alert("Thành công", "Nếu email đã được đăng ký và chưa xác thực, mã mới đã được gửi.");
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể gửi lại mã");
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
          <Text className="ml-4 text-xl font-semibold text-gray-900">Xác thực email</Text>
        </View>

        <View className="mb-8 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-blue-500">
            <Ionicons name="shield-checkmark" size={36} color="white" />
          </View>
          <Text className="mb-2 text-lg font-semibold text-gray-900">Xác thực email của bạn</Text>
          <Text className="text-center text-gray-500">
            Chúng tôi đã gửi mã xác thực gồm 6 chữ số đến địa chỉ email của bạn.
          </Text>
        </View>

        <View className="mb-4">
          <Text className="mb-2 font-medium text-gray-700">Email</Text>
          <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <Ionicons name="mail" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="nguyenvana@example.com"
              value={email}
              onChangeText={setEmail}
              className="ml-3 flex-1 text-gray-900"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View className="mb-6">
          <Text className="mb-2 font-medium text-gray-700">Mã xác thực</Text>
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
          title="Xác thực email"
          onPress={handleVerify}
          loading={loading}
          variant="primary"
          size="full"
          fullWidth={true}
          icon="checkmark-circle"
        />

        <ButtonComponent
          title={resending ? "Đang gửi lại..." : "Gửi lại mã"}
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
