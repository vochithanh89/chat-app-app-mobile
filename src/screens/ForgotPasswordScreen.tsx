import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { authAPI } from '../services/api';
import ButtonComponent from '../components/common/ButtonComponent';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Hàm xác thực
  const validateEmail = () => {
    if (!email) {
      Alert.alert('Error', 'Please enter email');
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Email is invalid');
      return false;
    }
    
    return true;
  };

  const validateOTP = () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter 6-digit OTP code');
      return false;
    }
    return true;
  };

  const validatePasswords = () => {
    if (!newPassword || !confirmPassword) {
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

  // Gửi OTP
  const handleSendOTP = async () => {
    if (!validateEmail()) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await authAPI.sendOTPForgotPassword(email);
      
      setOtpSent(true);
      Alert.alert('Success', 'OTP code has been sent to your email');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Send OTP failed';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Đặt lại mật khẩu
  const handleResetPassword = async () => {
    if (!validateOTP() || !validatePasswords()) {
      return;
    }

    try {
      setLoading(true);
      
      const response = await authAPI.resetPassword(email, otp, newPassword);
      
      Alert.alert(
        'Success',
        'Password updated successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Login')
          }
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Password update failed';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
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
            Forgot Password
          </Text>
        </View>

        {/* Nội dung */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 bg-blue-500 rounded-2xl justify-center items-center mb-4">
            <Ionicons name="lock-open" size={36} color="white" />
          </View>
          <Text className="text-lg font-semibold text-gray-900 mb-2">
            Reset Password
          </Text>
          <Text className="text-gray-500 text-center">
            {!otpSent 
              ? "Enter email to receive OTP code for password reset"
              : "Enter OTP code and new password to update"
            }
          </Text>
        </View>

        {/* Biểu mẫu */}
        <View className="mb-6">
          {/* Email */}
          <View className="mb-4">
            <Text className="text-gray-700 mb-2 font-medium">Email</Text>
            <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
              <Ionicons name="mail" size={20} color="#9CA3AF" className="mr-3" />
              <TextInput
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                className="flex-1 text-gray-900"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!otpSent}
              />
            </View>
          </View>

          {otpSent && (
            <>
              {/* OTP */}
              <View className="mb-4">
                <Text className="text-gray-700 mb-2 font-medium">OTP Code</Text>
                <View className="bg-gray-50 rounded-xl px-4 py-3 flex-row items-center border border-gray-200">
                  <Ionicons name="key" size={20} color="#9CA3AF" className="mr-3" />
                  <TextInput
                    placeholder="Enter 6-digit code"
                    value={otp}
                    onChangeText={setOtp}
                    className="flex-1 text-gray-900"
                    keyboardType="numeric"
                    maxLength={6}
                  />
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
                </View>
              </View>
            </>
          )}

          {/* Submit Button */}
          <ButtonComponent
            title={!otpSent ? "Send OTP" : "Update Password"}
            icon={!otpSent ? "mail" : "save"}
            onPress={!otpSent ? handleSendOTP : handleResetPassword}
            loading={loading}
            variant="primary"
            size="full"
            fullWidth={true}
          />
        </View>

        {/* Gợi ý */}
        <View className="bg-gray-50 p-4 rounded-xl">
          <Text className="text-sm font-medium text-gray-900 mb-2">Note:</Text>
          <View className="space-y-1">
            <Text className="text-xs text-gray-600">- Check your inbox to receive OTP code</Text>
            <Text className="text-xs text-gray-600">- OTP code is valid for 5 minutes</Text>
            <Text className="text-xs text-gray-600">- Use a strong password</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPasswordScreen;
