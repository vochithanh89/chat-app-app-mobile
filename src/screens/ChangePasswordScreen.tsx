import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import ButtonComponent from '../components/common/ButtonComponent';
import { useTheme } from '../contexts/ThemeContext';

const ChangePasswordScreen = () => {
  const navigation = useNavigation<any>();
  const { changePassword, loading } = useAuth();
  const { isDarkMode: darkMode, colors } = useTheme();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Hàm xác thực
  const validatePasswords = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ các trường mật khẩu');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp');
      return false;
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return false;
    }

    if (newPassword === currentPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải khác mật khẩu hiện tại');
      return false;
    }

    // Check for at least one number
    if (!/\d/.test(newPassword)) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải chứa ít nhất một chữ số');
      return false;
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(newPassword)) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải chứa ít nhất một chữ cái');
      return false;
    }

    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePasswords()) {
      return;
    }

    try {
      await changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      
      Alert.alert(
        'Thành công', 
        'Cập nhật mật khẩu thành công',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Cập nhật mật khẩu thất bại';
      Alert.alert('Lỗi', errorMessage);
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${darkMode ? "bg-gray-900" : "bg-white"}`}>
      <ScrollView className={`flex-1 px-6 ${darkMode ? "bg-gray-900" : "bg-white"}`}>
        {/* Tiêu đề */}
        <View className="flex-row items-center mt-4 mb-8">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={darkMode ? "white" : "#374151"} />
          </TouchableOpacity>
          <Text className={`text-xl font-semibold ml-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Đổi mật khẩu
          </Text>
        </View>

        {/* Nội dung */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-blue-500 rounded-2xl justify-center items-center mb-4">
            <Ionicons name="key" size={36} color="white" />
          </View>
          <Text className={`text-lg font-semibold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Cập nhật mật khẩu
          </Text>
          <Text className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            Nhập mật khẩu hiện tại và mật khẩu mới của bạn để cập nhật tài khoản
          </Text>
        </View>

        {/* Biểu mẫu */}
        <View className="mb-6">
          {/* Mật khẩu hiện tại */}
          <View className="mb-4">
            <Text className={`mb-2 font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Mật khẩu hiện tại</Text>
            <View className={`rounded-xl px-4 py-3 flex-row items-center border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                className={`flex-1 ${darkMode ? "text-white" : "text-gray-900"}`}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowCurrentPassword(!showCurrentPassword)}>
                <Ionicons 
                  name={showCurrentPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Mật khẩu mới */}
          <View className="mb-4">
            <Text className={`mb-2 font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Mật khẩu mới</Text>
            <View className={`rounded-xl px-4 py-3 flex-row items-center border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                value={newPassword}
                onChangeText={setNewPassword}
                className={`flex-1 ${darkMode ? "text-white" : "text-gray-900"}`}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons 
                  name={showNewPassword ? "eye-off" : "eye"} 
                  size={20} 
                  color="#9CA3AF" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Xác nhận mật khẩu mới */}
          <View className="mb-6">
            <Text className={`mb-2 font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>Xác nhận mật khẩu mới</Text>
            <View className={`rounded-xl px-4 py-3 flex-row items-center border ${darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"}`}>
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={darkMode ? "#9CA3AF" : "#9CA3AF"}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className={`flex-1 ${darkMode ? "text-white" : "text-gray-900"}`}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
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

          {/* Yêu cầu mật khẩu */}
          <View className={`p-4 rounded-xl mb-6 ${darkMode ? "bg-blue-955/30" : "bg-blue-50"}`}>
            <Text className={`text-sm font-medium mb-2 ${darkMode ? "text-blue-300" : "text-blue-900"}`}>Yêu cầu mật khẩu:</Text>
            <View className="space-y-1">
              <Text className={`text-xs ${darkMode ? "text-blue-200" : "text-blue-700"}`}>- Ít nhất 6 ký tự</Text>
              <Text className={`text-xs ${darkMode ? "text-blue-200" : "text-blue-700"}`}>- Bao gồm chữ cái và chữ số</Text>
              <Text className={`text-xs ${darkMode ? "text-blue-200" : "text-blue-700"}`}>- Khác với mật khẩu hiện tại</Text>
            </View>
          </View>

          {/* Gợi ý bảo mật */}
          <View className={`p-4 rounded-xl ${darkMode ? "bg-gray-800" : "bg-gray-50"}`}>
            <Text className={`text-sm font-medium mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>Gợi ý bảo mật:</Text>
            <View className="space-y-1">
              <Text className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>- Không chia sẻ mật khẩu của bạn với bất kỳ ai</Text>
              <Text className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>- Sử dụng mật khẩu duy nhất</Text>
              <Text className={`text-xs ${darkMode ? "text-gray-300" : "text-gray-600"}`}>- Thay đổi mật khẩu của bạn thường xuyên</Text>
            </View>
          </View>

          {/* Submit Button */}
          <ButtonComponent
            title="Cập nhật mật khẩu"
            icon="save"
            onPress={handleChangePassword}
            loading={loading}
            variant="primary"
            size="full"
            fullWidth={true}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChangePasswordScreen;
