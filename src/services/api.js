import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// Lưu trữ token trong bộ nhớ khi AsyncStorage thất bại
let memoryToken = null;
let memoryRefreshToken = null;

const isWeb = Platform.OS === "web";

const webStorage = {
  getItem: (key) => {
    if (!isWeb || typeof window === "undefined") return null;
    return window.localStorage?.getItem(key) || null;
  },
  setItem: (key, value) => {
    if (!isWeb || typeof window === "undefined") return;
    window.localStorage?.setItem(key, value);
  },
  removeItem: (key) => {
    if (!isWeb || typeof window === "undefined") return;
    window.localStorage?.removeItem(key);
  },
};

const tokenStorage = {
  getItem: async (key) => {
    if (isWeb) {
      const value = webStorage.getItem(key);
      if (value) return value;
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error("Loi doc token:", error);
      return key === "accessToken" ? memoryToken : memoryRefreshToken;
    }
  },
  setItem: async (key, value) => {
    if (key === "accessToken") memoryToken = value;
    if (key === "refreshToken") memoryRefreshToken = value;

    if (isWeb) {
      webStorage.setItem(key, value);
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error("Loi luu token:", error);
    }
  },
  removeItems: async (keys) => {
    keys.forEach((key) => {
      if (key === "accessToken") memoryToken = null;
      if (key === "refreshToken") memoryRefreshToken = null;
      if (isWeb) webStorage.removeItem(key);
    });

    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error("Loi xoa token:", error);
    }
  },
};

const resolveApiBaseUrl = () => {
  const envUrl = (process.env.EXPO_PUBLIC_API_BASE_URL || "").trim();
  if (envUrl) {
    return envUrl;
  }

  if (isWeb && typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:3333`;
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

const assertId = (value, label) => {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label} is required`);
  }
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

// Interceptor cho request - thêm token vào header
api.interceptors.request.use(
  async (config) => {
    let token = await tokenStorage.getItem("accessToken");
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

// Các endpoint auth không cần refresh token
const AUTH_ENDPOINTS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
  "/api/v1/auth/verify-email",
  "/api/v1/auth/resend-otp",
];

const isAuthEndpoint = (url) => {
  return AUTH_ENDPOINTS.some((endpoint) => url?.includes(endpoint));
};

// Interceptor cho response - xử lý refresh token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi không phải 401 hoặc request đã được retry, reject
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Bỏ qua refresh token cho các endpoint auth (login, register, v.v.)
    if (isAuthEndpoint(originalRequest.url)) {
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
      const refreshToken = await tokenStorage.getItem("refreshToken");
      if (refreshToken) {
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          {
            headers: {
              Authorization: `Bearer ${refreshToken}`,
            },
          },
        );

        const { accessToken } = extractTokens(response);
        if (!accessToken) {
          throw new Error("Khong lay duoc access token tu API refresh");
        }
        await tokenStorage.setItem("accessToken", accessToken);

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
        await tokenStorage.removeItems(["accessToken", "refreshToken"]);
      } catch (e) {
        console.log("Lỗi xóa AsyncStorage:", e);
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

/**
 * Helper to determine device_type for login requests.
 * Returns 'mobile_ios', 'mobile_android', or 'web'.
 */
const getDeviceType = () => {
  if (Platform.OS === 'ios') return 'mobile_ios';
  if (Platform.OS === 'android') return 'mobile_android';
  return 'web';
};

/**
 * Force-logout the current session (clear tokens).
 * Called by socketService when the server emits `auth:session_replaced`.
 */
export const forceLogout = async () => {
  try {
    await tokenStorage.removeItems(["accessToken", "refreshToken"]);
    await AsyncStorage.multiRemove(["userData", "isAuthenticated"]);
  } catch (e) {
    console.error("forceLogout error:", e);
  }
};

// API xác thực người dùng
export const authAPI = {
  // Đăng nhập
  login: async (identifier, password) => {
    const normalizedIdentifier = identifier?.trim() || ''
    const email = normalizedIdentifier.includes('@') ? normalizedIdentifier.toLowerCase() : undefined

    console.log("Login request:", {
      identifier: normalizedIdentifier,
      password: "***",
      API_BASE_URL,
    });

    const response = await api.post("/api/v1/auth/login", {
      email: email || normalizedIdentifier,
      identifier: normalizedIdentifier,
      password,
      device_type: getDeviceType(),
    });

    const { accessToken, refreshToken } = extractTokens(response);
    if (!accessToken || !refreshToken) {
      console.log("Unexpected login response:", response?.data);
      throw new Error("API login khong tra ve day du accessToken/refreshToken");
    }
    try {
      await tokenStorage.setItem("accessToken", accessToken);
      await tokenStorage.setItem("refreshToken", refreshToken);
    } catch (error) {
      console.error("Lỗi lưu token trong login:", error);
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
        await tokenStorage.removeItems(["accessToken", "refreshToken"]);
      } catch (error) {
        console.error("Lỗi xóa token trong logout:", error);
      }
      // Xóa token trong bộ nhớ
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

  getUserById: async (userId) => {
    const response = await api.get(`/api/v1/users/${userId}`);
    return response.data;
  },

  // Cập nhật thông tin cá nhân
  updateProfile: async (profileData) => {
    const response = await api.put("/api/v1/user/profile", profileData);
    return response.data;
  },

  // Đổi mật khẩu
  changePassword: async (passwordData) => {
    const dataWithDevice = {
      ...passwordData,
      device_type: getDeviceType()
    };
    const response = await api.post("/api/v1/auth/change-password", dataWithDevice);
    return response.data;
  },

  // Tải lên ảnh đại diện
  uploadAvatar: async (imageInput) => {
    const formData = new FormData();
    if (Platform.OS === "web") {
      if (imageInput instanceof File) {
        formData.append("avatar", imageInput, imageInput.name || "avatar.jpg");
      } else if (imageInput instanceof Blob) {
        formData.append("avatar", imageInput, "avatar.jpg");
      } else if (imageInput?.file instanceof File) {
        formData.append("avatar", imageInput.file, imageInput.file.name || "avatar.jpg");
      } else if (typeof imageInput === "string" || imageInput?.uri) {
        const blobResponse = await fetch(typeof imageInput === "string" ? imageInput : imageInput.uri);
        const blob = await blobResponse.blob();
        formData.append("avatar", blob, imageInput?.fileName || "avatar.jpg");
      } else {
        throw new Error("No browser avatar payload available for upload");
      }
    } else {
      const imageUri = typeof imageInput === "string" ? imageInput : imageInput?.uri;
      if (!imageUri) {
        throw new Error("No avatar uri available for upload");
      }
      formData.append("avatar", {
        uri: imageUri,
        type: imageInput?.mimeType || imageInput?.type || "image/jpeg",
        name: imageInput?.fileName || imageInput?.name || "avatar.jpg",
      });
    }

    const token = await tokenStorage.getItem("accessToken");
    const response = await fetch(`${API_BASE_URL}/api/v1/user/avatar`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const error = new Error(data?.message || data || "Failed to upload avatar");
      error.response = { status: response.status, data };
      throw error;
    }

    return data;
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

// Conversation/Group APIs
export const conversationAPI = {
  // POST /api/v1/conversations/group - Tạo nhóm mới
  createGroup: async (groupData) => {
    const response = await api.post('/api/v1/conversations/group', groupData);
    return response.data;
  },

  // GET /api/v1/conversations - Lấy danh sách cuộc trò chuyện
  getConversations: async () => {
    const response = await api.get('/api/v1/conversations');
    return response.data;
  },

  // GET /api/v1/conversations/:id - Xem chi tiết cuộc trò chuyện
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

  // POST /api/v1/conversations/:id/members - Thêm thành viên vào nhóm
  addMembers: async (conversationId, memberIds) => {
    const response = await api.post(`/api/v1/conversations/${conversationId}/members`, {
      user_ids: memberIds
    });
    return response.data;
  },

  // DELETE /api/v1/conversations/:id/members/:userId - Xóa thành viên khỏi nhóm
  removeMember: async (conversationId, userId) => {
    const response = await api.delete(`/api/v1/conversations/${conversationId}/members/${userId}`);
    return response.data;
  },

  // POST /api/v1/conversations/:id/leave - Rời nhóm
  leaveGroup: async (conversationId) => {
    const response = await api.post(`/api/v1/conversations/${conversationId}/leave`);
    return response.data;
  },

  // PUT /api/v1/conversations/:id/members/:userId/role - Cập nhật quyền thành viên
  updateMemberRole: async (conversationId, userId, role) => {
    const response = await api.put(`/api/v1/conversations/${conversationId}/members/${userId}/role`, {
      role: role
    });
    return response.data;
  },

  // POST /api/v1/conversations/:id/transfer - Chuyển quyền sở hữu
  transferOwnership: async (conversationId, newOwnerId) => {
    const response = await api.post(`/api/v1/conversations/${conversationId}/transfer`, {
      user_id: newOwnerId
    });
    return response.data;
  },

  // DELETE /api/v1/conversations/:id - Giải tán nhóm
  disbandGroup: async (conversationId) => {
    const response = await api.delete(`/api/v1/conversations/${conversationId}`);
    return response.data;
  },

  // PUT /api/v1/conversations/:id/avatar - Cập nhật avatar nhóm
  updateGroupAvatar: async (conversationId, imageData) => {
    const response = await api.put(`/api/v1/conversations/${conversationId}/avatar`, imageData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  // POST /api/v1/conversations/:id/read - Đánh dấu đã đọc
  markAsRead: async (conversationId) => {
    const response = await api.post(`/api/v1/conversations/${conversationId}/read`);
    return response.data;
  },
  
  markRead: async (conversationId, lastMessageId = null) => {
    const response = await api.post(`/api/v1/conversations/${conversationId}/read`, {
      last_message_id: lastMessageId,
    });
    return response.data;
  },
};

export const aiAPI = {
  startConversation: async () => {
    const response = await api.post('/api/v1/ai/conversations');
    return getPayloadData(response);
  },

  startNewConversation: async () => {
    const response = await api.post('/api/v1/ai/conversations/new');
    return getPayloadData(response);
  },

  sendMessage: async (conversationId, content) => {
    const response = await api.post('/api/v1/ai/chat', {
      conversation_id: conversationId,
      content,
    });
    return getPayloadData(response);
  },
};

export const messageAPI = {
  getMessages: async (conversationId, params = {}) => {
    assertId(conversationId, "conversationId");
    const response = await api.get(`/api/v1/conversations/${conversationId}/messages`, {
      params,
    });
    return response.data;
  },

  sendMessage: async (conversationId, payload) => {
    assertId(conversationId, "conversationId");
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
      } else if (file.file instanceof Blob) {
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

    const token = await tokenStorage.getItem("accessToken");
    const response = await fetch(`${API_BASE_URL}/api/v1/messages/upload`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const error = new Error(data?.message || data || "Failed to upload attachment");
      error.response = { status: response.status, data };
      throw error;
    }

    return data;
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
