import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { authAPI } from "../services/api";
import ButtonComponent from "../components/common/ButtonComponent";

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSendResetEmail = async () => {
    if (!email) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return;
    }

    try {
      setLoading(true);
      await authAPI.sendOTPForgotPassword(email);
      setSent(true);
      Alert.alert(
        "Thành công",
        "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư của bạn.",
      );
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể yêu cầu đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        <View className="mb-8 mt-4 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="ml-4 text-xl font-semibold text-gray-900">Quên mật khẩu</Text>
        </View>

        <View className="mb-8 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-blue-500">
            <Ionicons name="mail-open" size={36} color="white" />
          </View>
          <Text className="mb-2 text-lg font-semibold text-gray-900">Đặt lại mật khẩu</Text>
          <Text className="text-center text-gray-500">
            Nhập email của bạn và chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
          </Text>
        </View>

        <View className="mb-6">
          <Text className="mb-2 font-medium text-gray-700">Email</Text>
          <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <Ionicons name="mail" size={20} color="#9CA3AF" />
            <TextInput
              placeholder="Nhập email của bạn"
              value={email}
              onChangeText={setEmail}
              className="ml-3 flex-1 text-gray-900"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!sent}
            />
          </View>
        </View>

        <ButtonComponent
          title={sent ? "Đã gửi email đặt lại" : "Gửi email đặt lại"}
          icon="mail"
          onPress={handleSendResetEmail}
          loading={loading}
          variant="primary"
          size="full"
          fullWidth={true}
          disabled={sent}
        />

        <View className="mt-6 rounded-xl bg-gray-50 p-4">
          <Text className="mb-2 text-sm font-medium text-gray-900">Lưu ý</Text>
          <Text className="text-xs text-gray-600">
            Hệ thống sẽ gửi liên kết đặt lại mật khẩu qua email. Mở liên kết đó để hoàn tất thay đổi mật khẩu.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
