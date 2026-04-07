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

const ChangePasswordScreen = () => {
  const navigation = useNavigation<any>();
  const { changePassword, loading } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Hàm xác thực
  const validatePasswords = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return false;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return false;
    }

    if (newPassword === currentPassword) {
      Alert.alert('Error', 'New password must be different from current password');
      return false;
    }

    // Check for at least one number
    if (!/\d/.test(newPassword)) {
      Alert.alert('Error', 'New password must contain at least one number');
      return false;
    }

    // Check for at least one letter
    if (!/[a-zA-Z]/.test(newPassword)) {
      Alert.alert('Error', 'New password must contain at least one letter');
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
        oldPassword: currentPassword,
        newPassword: newPassword,
        confirmNewPassword: confirmPassword,
      });
      
      Alert.alert(
        'Success', 
        'Password updated successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Password update failed';
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6">
        {/* Tiêu đề */}
        <View className="flex-row items-center mt-4 mb-8">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-gray-900 ml-4">
            Change Password
          </Text>
        </View>

        {/* Nội dung */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-blue-500 rounded-2xl justify-center items-center mb-4">
            <Ionicons name="key" size={36} color="white" />
          </View>
          <Text className="text-lg font-semibold text-gray-900 mb-2">
            Update Password
          </Text>
          <Text className="text-gray-500 text-center">
            Enter your current password and new password to update your account
          </Text>
        </View>

        {/* Biểu mẫu */}
        <View className="mb-6">
          {/* Mật khẩu hiện tại */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Current Password</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Enter current password"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                className="flex-1 text-gray-900"
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
            <Text className="text-gray-700 mb-2 font-medium">New Password</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                className="flex-1 text-gray-900"
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
            <Text className="text-gray-700 mb-2 font-medium">Confirm New Password</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
              <Ionicons name="lock-closed" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className="flex-1 text-gray-900"
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
          <View className="bg-blue-50 p-4 rounded-xl mb-6">
            <Text className="text-sm font-medium text-blue-900 mb-2">Password Requirements:</Text>
            <View className="space-y-1">
              <Text className="text-xs text-blue-700">- At least 6 characters</Text>
              <Text className="text-xs text-blue-700">- Include letters and numbers</Text>
              <Text className="text-xs text-blue-700">- Different from current password</Text>
            </View>
          </View>

          {/* Gợi ý bảo mật */}
          <View className="bg-gray-50 p-4 rounded-xl">
            <Text className="text-sm font-medium text-gray-900 mb-2">Security Tips:</Text>
            <View className="space-y-1">
              <Text className="text-xs text-gray-600">- Don't share your password with anyone</Text>
              <Text className="text-xs text-gray-600">- Use a unique password</Text>
              <Text className="text-xs text-gray-600">- Change your password regularly</Text>
            </View>
          </View>

          {/* Submit Button */}
          <ButtonComponent
            title="Update Password"
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
