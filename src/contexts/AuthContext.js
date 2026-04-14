import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, userAPI } from '../services/api';

const AuthContext = createContext();

// Hook để sử dụng AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng trong AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Kiểm tra trạng thái xác thực khi khởi động ứng dụng
  useEffect(() => {
    checkAuthStatus();
  }, []);

  let isCheckingAuth = false;

  // Kiểm tra trạng thái xác thực người dùng
  const checkAuthStatus = async (skipProfileCheck = false) => {
    // Ngăn chặn nhiều cuộc gọi kiểm tra đồng thời
    if (isCheckingAuth) {
      return;
    }
    
    isCheckingAuth = true;
    
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (token && !skipProfileCheck) {
        // Xác thực token bằng cách lấy thông tin người dùng
        const profileResponse = await userAPI.getProfile();
        // Kiểm tra trả response structure và lấy dữ liệu đúng
        const userData = profileResponse.data || profileResponse.data.data;
        setUser(userData);
        setIsAuthenticated(true);
      } else if (token && skipProfileCheck) {
        // Bỏ qua kiểm tra profile nhưng vẫn đặt trạng thái đã xác thực
        setIsAuthenticated(true);
      } else {
        // Không có token
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      // Xóa token khi có lỗi
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
      isCheckingAuth = false;
    }
  };

  // Đăng nhập người dùng
  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await authAPI.login(email, password);
      
      // Lấy thông tin người dùng sau khi đăng nhập thành công
      const profileResponse = await userAPI.getProfile();
      // Kiểm tra trả response structure và lấy dữ liệu đúng
      const userData = profileResponse.data.data || profileResponse.data;
      setUser(userData);
      setIsAuthenticated(true);
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Đăng xuất người dùng
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Lỗi đăng xuất:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // Đăng ký người dùng mới
  const register = async (userData) => {
    try {
      setLoading(true);
      const response = await authAPI.register(userData);
      return response;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Gửi mã OTP
  const sendOTP = async (email) => {
    try {
      const response = await authAPI.sendOTP(email);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Cập nhật thông tin người dùng
  const updateProfile = async (profileData) => {
    try {
      const response = await userAPI.updateProfile(profileData);
      // Kiểm tra trả response structure và lấy dữ liệu đúng
      const userData = response.data || response.data.data;
      setUser(userData);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Đổi mật khẩu
  const changePassword = async (passwordData) => {
    try {
      const response = await userAPI.changePassword(passwordData);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Tải lên ảnh đại diện
  const uploadAvatar = async (imageUri) => {
    try {
      const response = await userAPI.uploadAvatar(imageUri);
      console.log('Upload Avatar Response:', JSON.stringify(response, null, 2));
      // Kiểm tra trả response structure và lấy dữ liệu đúng
      const userData = response.data || response.data.data;
      console.log('User Data to set:', userData);
      setUser(userData);
      return response;
    } catch (error) {
      console.log('Upload Avatar Error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    register,
    sendOTP,
    updateProfile,
    changePassword,
    uploadAvatar,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
