import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { authAPI } from "../services/api";
import ButtonComponent from "../components/common/ButtonComponent";

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState(""); // Hidden secure reset token
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Resend OTP countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // --- Step 1: Send OTP to Email -------------------------------------------
  const handleSendResetEmail = async () => {
    if (!email) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return;
    }

    try {
      setLoading(true);
      await authAPI.sendOTPForgotPassword(email);
      setStep("otp");
      setCooldown(60);
      Alert.alert(
        "Thành công",
        "Mã xác thực OTP đã được gửi đến hòm thư của bạn. Vui lòng kiểm tra hộp thư!"
      );
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể yêu cầu đặt lại mật khẩu");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 2: Verify OTP code ---------------------------------------------
  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Lỗi", "Vui lòng nhập mã OTP gồm 6 chữ số");
      return;
    }

    try {
      setLoading(true);
      const response = await authAPI.verifyResetOtp(email, otp);
      // Backend returns Envelope data: { token: secureToken }
      const secureToken = response?.token || response?.data?.token || response;
      
      if (!secureToken) {
        throw new Error("Không nhận được mã bảo mật đặt lại mật khẩu.");
      }

      setToken(secureToken);
      setStep("reset"); // Transition to Step 3: Enter New Password
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Mã xác thực không hợp lệ hoặc đã hết hạn");
    } finally {
      setLoading(false);
    }
  };

  // --- Step 3: Reset Password ---------------------------------------------
  const handleResetPassword = async () => {
    if (!password) {
      Alert.alert("Lỗi", "Vui lòng nhập mật khẩu mới");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword(token, password, confirmPassword);
      Alert.alert("Thành công", "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại!", [
        { text: "OK", onPress: () => navigation.navigate("Login") }
      ]);
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  // --- Resend OTP ----------------------------------------------------------
  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    try {
      setLoading(true);
      await authAPI.sendOTPForgotPassword(email);
      setCooldown(60);
      Alert.alert("Thành công", "Mã OTP mới đã được gửi lại vào email của bạn!");
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể gửi lại mã OTP");
    } finally {
      setLoading(false);
    }
  };

  // --- Render Header -------------------------------------------------------
  const renderHeader = () => {
    let title = "Quên mật khẩu";
    if (step === "otp") title = "Xác thực OTP";
    if (step === "reset") title = "Mật khẩu mới";

    return (
      <View className="mb-6 mt-4 flex-row items-center">
        <TouchableOpacity 
          onPress={() => {
            if (step === "otp") {
              setStep("email");
              setOtp("");
            } else if (step === "reset") {
              Alert.alert("Xác nhận", "Hủy quá trình đổi mật khẩu?", [
                { text: "Hủy", style: "cancel" },
                { text: "Đồng ý", style: "destructive", onPress: () => navigation.navigate("Login") }
              ]);
            } else {
              navigation.goBack();
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="ml-4 text-xl font-semibold text-gray-900">{title}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {renderHeader()}

        {/* STEP 1: REQUEST EMAIL FORM */}
        {step === "email" && (
          <View>
            <View className="mb-8 items-center">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-blue-500">
                <Ionicons name="mail-open" size={36} color="white" />
              </View>
              <Text className="mb-2 text-lg font-semibold text-gray-900">Quên mật khẩu?</Text>
              <Text className="text-center text-gray-500 leading-relaxed px-4">
                Nhập email tài khoản của bạn để nhận mã xác thực OTP thiết lập lại mật khẩu.
              </Text>
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">Email đăng ký</Text>
              <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <Ionicons name="mail" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="Nhập email của bạn"
                  value={email}
                  onChangeText={setEmail}
                  className="ml-3 flex-1 text-gray-900 py-0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <ButtonComponent
              title="Gửi mã xác thực OTP"
              icon="mail"
              onPress={handleSendResetEmail}
              loading={loading}
              variant="primary"
              size="full"
              fullWidth={true}
            />
          </View>
        )}

        {/* STEP 2: VERIFY OTP FORM */}
        {step === "otp" && (
          <View>
            <View className="mb-8 items-center">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-amber-500">
                <Ionicons name="key" size={36} color="white" />
              </View>
              <Text className="mb-2 text-lg font-semibold text-gray-900">Xác thực mã OTP</Text>
              <Text className="text-center text-gray-500 leading-relaxed px-2">
                Nhập mã OTP gồm 6 chữ số vừa được gửi tới email:{"\n"}
                <Text className="font-bold text-gray-800">{email}</Text>
              </Text>
            </View>

            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">Mã xác thực OTP (6 chữ số)</Text>
              <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <Ionicons name="shield-checkmark" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="Nhập 6 số xác thực"
                  value={otp}
                  onChangeText={(val) => setOtp(val.replace(/\D/g, ""))}
                  className="ml-3 flex-1 text-gray-900 py-0 text-center font-bold text-lg tracking-widest"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <ButtonComponent
              title="Xác nhận mã OTP"
              icon="checkmark-circle"
              onPress={handleVerifyOtp}
              loading={loading}
              variant="primary"
              size="full"
              fullWidth={true}
            />

            <View className="mt-6 flex-row justify-between items-center px-1">
              <TouchableOpacity onPress={() => setStep("email")} className="flex-row items-center">
                <Ionicons name="arrow-back-outline" size={14} color="#6B7280" />
                <Text className="text-xs text-gray-500 ml-1">Đổi email khác</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleResendOtp} 
                disabled={cooldown > 0}
              >
                <Text className={`text-xs font-semibold ${cooldown > 0 ? "text-gray-400" : "text-blue-500"}`}>
                  {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : "Gửi lại mã OTP"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* STEP 3: RESET NEW PASSWORD FORM (TOKEN IS HIDDEN IN STATE) */}
        {step === "reset" && (
          <View>
            <View className="mb-8 items-center">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500">
                <Ionicons name="lock-closed" size={36} color="white" />
              </View>
              <Text className="mb-2 text-lg font-semibold text-gray-900">Thiết lập mật khẩu</Text>
              <Text className="text-center text-gray-500 leading-relaxed">
                Tạo một mật khẩu mới an toàn cho tài khoản của bạn.
              </Text>
            </View>

            {/* Password input */}
            <View className="mb-4">
              <Text className="mb-2 font-medium text-gray-700">Mật khẩu mới</Text>
              <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="Tối thiểu 8 ký tự"
                  value={password}
                  onChangeText={setPassword}
                  className="ml-3 flex-1 text-gray-900 py-0"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password input */}
            <View className="mb-6">
              <Text className="mb-2 font-medium text-gray-700">Xác nhận mật khẩu mới</Text>
              <View className="flex-row items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
                <TextInput
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  className="ml-3 flex-1 text-gray-900 py-0"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <ButtonComponent
              title="Đặt lại mật khẩu"
              icon="save-outline"
              onPress={handleResetPassword}
              loading={loading}
              variant="primary"
              size="full"
              fullWidth={true}
            />
          </View>
        )}

        <View className="mt-8 mb-8 border-t border-gray-100 pt-6">
          <TouchableOpacity onPress={() => navigation.navigate("Login")} className="items-center">
            <Text className="text-sm font-semibold text-blue-500">Quay lại Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
