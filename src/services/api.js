import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Lưu trữ token trong bộ nhớ khi AsyncStorage thất bại
let memoryToken = null;
let memoryRefreshToken = null;

const API_BASE_URL = "http://192.168.1.39:3333";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

// Interceptor cho request - thêm token vào header
api.interceptors.request.use(
  async (config) => {
    let token = null;
    try {
      token = await AsyncStorage.getItem("accessToken");
    } catch (error) {
      console.log("Lỗi AsyncStorage trong request interceptor:", error);
    }
    // Sử dụng token trong bộ nhớ nếu AsyncStorage thất bại
    if (!token && memoryToken) {
      token = memoryToken;
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Interceptor cho response - xử lý refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi không phải 401 hoặc request đã được retry, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Nếu đang refresh token, đưa request vào hàng đợi
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then(() => {
          return api.request(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const refreshToken = await AsyncStorage.getItem("refreshToken");
      if (refreshToken) {
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {
            refreshToken: refreshToken,
          },
        );

        const { accessToken } = response.data.data;
        await AsyncStorage.setItem("accessToken", accessToken);
        memoryToken = accessToken; // Cập nhật memory token

        // Cập nhật header cho request gốc
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Xử lý hàng đợi
        failedQueue.forEach(({ resolve }) => {
          resolve(accessToken);
        });
        failedQueue = [];

        return api.request(originalRequest);
      } else {
        throw new Error("Không có refresh token");
      }
    } catch (refreshError) {
      // Reject tất cả request trong hàng đợi
      failedQueue.forEach(({ reject }) => {
        reject(refreshError);
      });
      failedQueue = [];

      // Xóa tokens khi refresh thất bại
      try {
        await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
      } catch (e) {
        console.log("Lỗi xóa AsyncStorage:", e);
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

// API xác thực người dùng
export const authAPI = {
  // Đăng nhập
  login: async (email, password) => {
    console.log('Login request:', { email, password: '***' });
    
    const response = await api.post("/api/v1/auth/login", {
      email,
      password,
    });
    

    const { token: accessToken, refreshToken } = response.data.data;
    try {
      await AsyncStorage.setItem("accessToken", accessToken);
      await AsyncStorage.setItem("refreshToken", refreshToken);
      memoryToken = accessToken;
      memoryRefreshToken = refreshToken;
    } catch (error) {
      console.log("Lỗi lưu token trong login:", error);
    }

    return response.data;
  },

  // Gửi OTP cho quên mật khẩu
  sendOTPForgotPassword: async (email) => {
    const response = await api.post(
      "/api/v1/users/send-otp-forgot-password",
      null,
      {
        params: { email },
      },
    );
    return response.data;
  },

  // Reset mật khẩu
  resetPassword: async (email, otp, newPassword) => {
    const response = await api.post("/api/v1/users/reset-password", null, {
      params: {
        email,
        otp,
        newPassword,
      },
    });
    return response.data;
  },

  // Đăng xuất
  logout: async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } finally {
      try {
        await AsyncStorage.multiRemove(["accessToken", "refreshToken"]);
      } catch (error) {
        console.log("Lỗi xóa token trong logout:", error);
      }
      // Xóa token trong bộ nhớ
      memoryToken = null;
      memoryRefreshToken = null;
    }
  },

  // Gửi OTP
  sendOTP: async (email) => {
    const response = await api.post("/api/v1/users/send-otp", null, {
      params: { email },
    });
    return response.data;
  },

  // Đăng ký
  register: async (userData) => {
    const response = await api.post("/api/v1/users/register", userData);
    return response.data;
  },
};

// API người dùng
export const userAPI = {
  // Lấy thông tin cá nhân
  getProfile: async () => {
    const response = await api.get("/api/v1/user/me");
    return response.data;
  },

  // Cập nhật thông tin cá nhân
  updateProfile: async (profileData) => {
    const response = await api.put("/api/v1/user/profile", profileData);
    return response.data;
  },

  // Đổi mật khẩu
  changePassword: async (passwordData) => {
    const response = await api.post("/api/v1/auth/change-password", passwordData);
    return response.data;
  },

  // Tải lên ảnh đại diện
  uploadAvatar: async (imageUri) => {
    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      type: "image/jpeg",
      name: "avatar.jpg",
    });

    const response = await api.post("/api/v1/user/avatar", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

// API kết bạn
export const friendshipAPI = {
  // GET /api/v1/users/search - Tìm kiếm người dùng
  searchUsers: async (query) => {
    const response = await api.get(`/api/v1/users/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // GET /api/v1/friends - Danh sách bạn bè
  getFriends: async () => {
    const response = await api.get("/api/v1/friends");
    return response.data;
  },

  // GET /api/v1/friends/requests/received - Lời mời đã nhận
  getReceivedRequests: async () => {
    const response = await api.get("/api/v1/friends/requests/received");
    return response.data;
  },

  // GET /api/v1/friends/requests/sent - Lời mời đã gửi
  getSentRequests: async () => {
    const response = await api.get("/api/v1/friends/requests/sent");
    return response.data;
  },

  // POST /api/v1/friends/requests - Gửi lời mời kết bạn
  sendRequest: async (addresseeId) => {
    const response = await api.post("/api/v1/friends/requests", {
      addressee_id: addresseeId
    });
    return response.data;
  },

  // POST /api/v1/friends/requests/:id/accept - Chấp nhận lời mời
  acceptRequest: async (requestId) => {
    const response = await api.post(`/api/v1/friends/requests/${requestId}/accept`);
    return response.data;
  },

  // POST /api/v1/friends/requests/:id/reject - Từ chối lời mời
  rejectRequest: async (requestId) => {
    const response = await api.post(`/api/v1/friends/requests/${requestId}/reject`);
    return response.data;
  },

  // DELETE /api/v1/friends/requests/:id - Hủy lời mời
  cancelRequest: async (requestId) => {
    const response = await api.delete(`/api/v1/friends/requests/${requestId}`);
    return response.data;
  },

  // DELETE /api/v1/friends/:userId - Hủy kết bạn
  unfriend: async (userId) => {
    const response = await api.delete(`/api/v1/friends/${userId}`);
    return response.data;
  },

  // GET /api/v1/users/:id - Lay thong tin user chi tiet
  getUserById: async (userId) => {
    const response = await api.get(`/api/v1/users/${userId}`);
    return response.data;
  },

  // Blocking APIs
  // GET /api/v1/blocks - Danh sách blocked users
  getBlockedUsers: async () => {
    const response = await api.get("/api/v1/blocks");
    return response.data;
  },

  // POST /api/v1/blocks - Block user
  blockUser: async (userId) => {
    const response = await api.post("/api/v1/blocks", {
      user_id: userId
    });
    return response.data;
  },

  // DELETE /api/v1/blocks/:userId - Unblock user
  unblockUser: async (userUuid) => {
    const response = await api.delete(`/api/v1/blocks/${userUuid}`);
    return response.data;
  }
};

export default api;
