import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Lưu trữ token trong bộ nhớ khi AsyncStorage thất bại
let memoryToken = null;
let memoryRefreshToken = null;

const resolveApiBaseUrl = () => {
  const envUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim();
  if (envUrl) {
    return envUrl;
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `http://${window.location.hostname}:3333`;
  }

  const configApiUrl = (
    Constants.expoConfig?.extra?.apiBaseUrl ||
    Constants.manifest2?.extra?.expoClient?.extra?.apiBaseUrl ||
    Constants.manifest?.extra?.apiBaseUrl ||
    ""
  ).trim();
  if (configApiUrl) {
    return configApiUrl;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    "";
  const host = hostUri.split(":")[0];

  const isLocalIpHost = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)$/.test(
    host,
  );

  if (host && isLocalIpHost) {
    return `http://${host}:3333`;
  }

  return "http://127.0.0.1:3333";
};

export const API_BASE_URL = resolveApiBaseUrl();

const getPayloadData = (response) => response?.data?.data ?? response?.data ?? {};

const extractTokens = (response) => {
  const payload = getPayloadData(response);

  return {
    accessToken:
      payload.accessToken ||
      payload.token ||
      response?.data?.accessToken ||
      response?.data?.token ||
      null,
    refreshToken: payload.refreshToken || response?.data?.refreshToken || null,
  };
};

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

        const { accessToken } = extractTokens(response);
        if (!accessToken) {
          throw new Error("Khong lay duoc access token tu API refresh");
        }
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
  login: async (identifier, password) => {
    console.log("Login request:", {
      identifier,
      password: "***",
      API_BASE_URL,
    });

    const response = await api.post("/api/v1/auth/login", {
      email: identifier,
      identifier,
      password,
    });

    const { accessToken, refreshToken } = extractTokens(response);
    if (!accessToken || !refreshToken) {
      console.log("Unexpected login response:", response?.data);
      throw new Error("API login khong tra ve day du accessToken/refreshToken");
    }
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
      "/api/v1/auth/forgot-password",
      { email },
    );
    return response.data;
  },

  // Reset mật khẩu
  resetPassword: async (token, newPassword, confirmPassword) => {
    const response = await api.post("/api/v1/auth/reset-password", {
      token,
      password: newPassword,
      password_confirmation: confirmPassword,
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
    const response = await api.post("/api/v1/auth/resend-otp", {
      email,
    });
    return response.data;
  },

  verifyEmail: async (email, otp) => {
    const response = await api.post("/api/v1/auth/verify-email", {
      email,
      otp,
    });
    return response.data;
  },

  // Đăng ký
  register: async (userData) => {
    const response = await api.post("/api/v1/auth/register", userData);
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

    const config = {};
    if (Platform.OS !== "web") {
      config.headers = {
        "Content-Type": "multipart/form-data",
      };
    }

    const response = await api.post("/api/v1/user/avatar", formData, config);
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

export const conversationAPI = {
  getConversations: async () => {
    const response = await api.get("/api/v1/conversations");
    return response.data;
  },

  getConversationById: async (conversationId) => {
    const response = await api.get(`/api/v1/conversations/${conversationId}`);
    return response.data;
  },

  createDirectConversation: async (userId) => {
    const response = await api.post("/api/v1/conversations/direct", {
      user_id: userId,
    });
    return response.data;
  },

  markRead: async (conversationId, lastMessageId = null) => {
    const response = await api.post(`/api/v1/conversations/${conversationId}/read`, {
      last_message_id: lastMessageId,
    });
    return response.data;
  },
};

export const messageAPI = {
  getMessages: async (conversationId, params = {}) => {
    const response = await api.get(`/api/v1/conversations/${conversationId}/messages`, {
      params,
    });
    return response.data;
  },

  sendMessage: async (conversationId, payload) => {
    const response = await api.post(`/api/v1/conversations/${conversationId}/messages`, payload);
    return response.data;
  },

  uploadAttachment: async (file) => {
    const formData = new FormData();
    const fileName = file.name || `upload-${Date.now()}`;
    const mimeType = file.mimeType || file.type || "application/octet-stream";

    if (Platform.OS === "web") {
      if (file.file instanceof File) {
        formData.append("file", file.file, fileName);
      } else if (file.uri) {
        const blobResponse = await fetch(file.uri);
        const blob = await blobResponse.blob();
        formData.append("file", blob, fileName);
      } else {
        throw new Error("No browser file payload available for upload");
      }
    } else {
      formData.append("file", {
        uri: file.uri,
        type: mimeType,
        name: fileName,
      });
    }

    const config = {};
    if (Platform.OS !== "web") {
      config.headers = {
        "Content-Type": "multipart/form-data",
      };
    }

    const response = await api.post("/api/v1/messages/upload", formData, config);
    return response.data;
  },

  recallMessage: async (messageId) => {
    const response = await api.post(`/api/v1/messages/${messageId}/recall`);
    return response.data;
  },

  deleteForMe: async (messageId) => {
    const response = await api.post(`/api/v1/messages/${messageId}/delete`);
    return response.data;
  },

  forwardMessage: async (messageId, conversationIds) => {
    const response = await api.post(`/api/v1/messages/${messageId}/forward`, {
      conversation_ids: conversationIds,
    });
    return response.data;
  },

  reactToMessage: async (messageId, emoji) => {
    const response = await api.post(`/api/v1/messages/${messageId}/reactions`, {
      emoji,
    });
    return response.data;
  },

  removeReaction: async (messageId, emoji) => {
    const response = await api.delete(
      `/api/v1/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    );
    return response.data;
  },
};

export default api;
