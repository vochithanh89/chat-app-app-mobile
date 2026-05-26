import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal } from "react-native";
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

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

    if (!acceptedTerms)
      newErrors.acceptedTerms = "Bạn phải đồng ý với các điều khoản sử dụng";

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
        accepted_terms: acceptedTerms,
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
          <Text className="mb-2 text-3xl font-bold text-gray-900">Đăng ký tài khoản</Text>
          <Text className="text-center text-gray-500">
            Nhập thông tin chi tiết của bạn để bắt đầu với ChatApp
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
            <Text className="mb-2 font-medium text-gray-700">Họ và tên</Text>
            <View className={inputBorder("name")}>
              <Ionicons name="person" size={20} color={errors.name ? "#F87171" : "#9CA3AF"} />
              <TextInput
                placeholder="Nguyễn Văn A"
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
                placeholder="nguyenvana@example.com"
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
            <Text className="mb-2 font-medium text-gray-700">Số điện thoại</Text>
            <View className={inputBorder("phone")}>
              <Ionicons name="call" size={20} color={errors.phone ? "#F87171" : "#9CA3AF"} />
              <TextInput
                placeholder="0912 345 678"
                value={phone}
                onChangeText={(v) => { setPhone(v); clearFieldError("phone"); }}
                className="ml-3 flex-1 text-gray-900"
                keyboardType="phone-pad"
              />
            </View>
            <ErrorText field="phone" />
          </View>

          <View className="mb-4">
            <Text className="mb-2 font-medium text-gray-700">Mật khẩu</Text>
            <View className={inputBorder("password")}>
              <Ionicons name="lock-closed" size={20} color={errors.password ? "#F87171" : "#9CA3AF"} />
              <TextInput
                placeholder="Tạo mật khẩu"
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
            <Text className="mb-2 font-medium text-gray-700">Xác nhận mật khẩu</Text>
            <View className={inputBorder("confirmPassword")}>
              <Ionicons name="lock-closed" size={20} color={errors.confirmPassword ? "#F87171" : "#9CA3AF"} />
              <TextInput
                placeholder="Nhập lại mật khẩu"
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

        <View className="mb-6 flex-row items-start">
          <TouchableOpacity
            onPress={() => { setAcceptedTerms(!acceptedTerms); clearFieldError("acceptedTerms"); }}
            className="mr-3 mt-0.5"
          >
            <Ionicons
              name={acceptedTerms ? "checkbox" : "square-outline"}
              size={24}
              color={acceptedTerms ? "#3B82F6" : errors.acceptedTerms ? "#F87171" : "#9CA3AF"}
            />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-gray-700">
              Tôi đồng ý với các{" "}
              <Text 
                className="text-blue-500 font-semibold"
                onPress={() => setShowTerms(true)}
              >
                điều khoản sử dụng
              </Text>
            </Text>
            <ErrorText field="acceptedTerms" />
          </View>
        </View>

        <ButtonComponent
          title="Đăng ký"
          onPress={handleRegister}
          loading={loading}
          variant="primary"
          size="full"
          fullWidth={true}
          icon="person-add"
        />

        <View className="mb-8 mt-8 items-center">
          <Text className="text-gray-600">
            Đã có tài khoản?{" "}
            <Text className="font-semibold text-blue-500" onPress={() => navigation.goBack()}>
              Đăng nhập
            </Text>
          </Text>
        </View>
      </ScrollView>

      {/* Terms Modal */}
      <Modal
        visible={showTerms}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTerms(false)}
      >
        <View className="flex-1 bg-black/50 justify-center px-4 py-12">
          <View className="bg-white rounded-2xl flex-1 overflow-hidden">
            <View className="p-4 border-b border-gray-200 flex-row justify-between items-center bg-blue-500">
              <Text className="text-lg font-bold text-white">Điều khoản sử dụng</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-4">
              <Text className="text-gray-800 leading-6 mb-8">
                <Text className="font-bold">1. Chấp nhận điều khoản{"\n"}</Text>
                Khi đăng ký tài khoản hoặc sử dụng ứng dụng, người dùng đồng ý tuân thủ toàn bộ Điều khoản sử dụng này và các chính sách liên quan của ứng dụng.{"\n\n"}
                
                <Text className="font-bold">2. Tài khoản người dùng{"\n"}</Text>
                Người dùng phải cung cấp thông tin chính xác khi đăng ký tài khoản.{"\n"}
                Người dùng tự chịu trách nhiệm bảo mật tài khoản và mật khẩu.{"\n"}
                Không được sử dụng tài khoản của người khác khi chưa được cho phép.{"\n"}
                Ứng dụng có quyền khóa hoặc xóa tài khoản nếu phát hiện vi phạm.{"\n\n"}
                
                <Text className="font-bold">3. Quy tắc sử dụng{"\n"}</Text>
                Người dùng cam kết không:{"\n"}
                - Đăng tải nội dung vi phạm pháp luật.{"\n"}
                - Xúc phạm, quấy rối, đe dọa người khác.{"\n"}
                - Phát tán virus, mã độc hoặc spam.{"\n"}
                - Mạo danh cá nhân hoặc tổ chức khác.{"\n"}
                - Thu thập dữ liệu trái phép từ hệ thống.{"\n\n"}
                
                <Text className="font-bold">4. Nội dung người dùng{"\n"}</Text>
                Người dùng chịu trách nhiệm đối với nội dung đã gửi hoặc đăng tải.{"\n"}
                Ứng dụng có quyền xóa nội dung vi phạm mà không cần báo trước.{"\n"}
                Người dùng cấp quyền cho ứng dụng lưu trữ và xử lý dữ liệu phục vụ hoạt động hệ thống.{"\n\n"}
                
                <Text className="font-bold">5. Quyền riêng tư{"\n"}</Text>
                Thông tin cá nhân được thu thập và xử lý theo Chính sách bảo mật.{"\n"}
                Ứng dụng cam kết không bán thông tin người dùng cho bên thứ ba trái phép.{"\n"}
                Dữ liệu có thể được cung cấp cho cơ quan chức năng khi pháp luật yêu cầu.{"\n\n"}
                
                <Text className="font-bold">6. Quyền sở hữu trí tuệ{"\n"}</Text>
                Mọi giao diện, logo, mã nguồn và nội dung thuộc quyền sở hữu của ứng dụng.{"\n"}
                Người dùng không được sao chép hoặc sử dụng trái phép.{"\n\n"}
                
                <Text className="font-bold">7. Giới hạn trách nhiệm{"\n"}</Text>
                Ứng dụng không chịu trách nhiệm đối với:{"\n"}
                - Mất dữ liệu do lỗi thiết bị hoặc mạng.{"\n"}
                - Nội dung do người dùng đăng tải.{"\n"}
                - Thiệt hại phát sinh từ việc sử dụng trái phép tài khoản.{"\n\n"}
                
                <Text className="font-bold">8. Tạm ngừng hoặc chấm dứt dịch vụ{"\n"}</Text>
                Ứng dụng có quyền:{"\n"}
                - Tạm khóa tài khoản vi phạm.{"\n"}
                - Ngừng cung cấp dịch vụ để bảo trì hoặc nâng cấp hệ thống.{"\n"}
                - Chấm dứt tài khoản nếu người dùng vi phạm nghiêm trọng điều khoản.{"\n\n"}
                
                <Text className="font-bold">9. Thay đổi điều khoản{"\n"}</Text>
                Điều khoản có thể được cập nhật theo thời gian. Người dùng tiếp tục sử dụng ứng dụng đồng nghĩa với việc chấp nhận các thay đổi mới.{"\n\n"}
                
                <Text className="font-bold">10. Liên hệ hỗ trợ{"\n"}</Text>
                Mọi thắc mắc vui lòng liên hệ:{"\n"}
                Email: support@chatapN7.com{"\n"}
                Hotline: 1900 1234
              </Text>
            </ScrollView>
            <View className="p-4 border-t border-gray-200">
              <ButtonComponent
                title="Đóng"
                onPress={() => setShowTerms(false)}
                variant="primary"
                fullWidth={true}
              />
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default RegisterScreen;
