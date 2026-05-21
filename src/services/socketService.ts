import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { API_BASE_URL, forceLogout } from './api';

/**
 * Helper to determine the device type string for socket auth.
 * Matches the values used in the login request.
 */
const getDeviceType = (): string => {
  if (Platform.OS === 'ios') return 'mobile_ios';
  if (Platform.OS === 'android') return 'mobile_android';
  return 'web';
};

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();
  /** Callback set by AuthContext to handle force-logout */
  public onForceLogout: (() => void) | null = null;

  connect = async () => {
    if (this.socket?.connected) return;

    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (!token) return;

      this.socket = io(API_BASE_URL, {
        auth: { token, device_type: getDeviceType() },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected to server');
        // Re-attach listeners that were registered before connection
        this.listeners.forEach((callbacks, event) => {
          callbacks.forEach(cb => {
            this.socket?.on(event, cb as any);
          });
        });
      });

      this.socket.on('disconnect', () => {
        console.log('[Socket] Disconnected from server');
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
      });

      // ── Session replacement: another device of the SAME type logged in ──
      this.socket.on('auth:session_replaced', (data: any) => {
        console.warn('[Socket] Session replaced by same device type:', data);
        Alert.alert(
          'Phiên đăng nhập bị thay thế',
          data?.message || 'Tài khoản của bạn đã đăng nhập ở thiết bị khác cùng loại. Bạn sẽ bị đăng xuất.',
          [
            {
              text: 'OK',
              onPress: () => {
                this.handleForceLogout();
              },
            },
          ],
          { cancelable: false },
        );
      });

      // ── Force logout (e.g. password changed) ──
      this.socket.on('auth:force_logout', (data: any) => {
        console.warn('[Socket] Force logout:', data);
        Alert.alert(
          'Đăng xuất',
          data?.message || 'Mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.',
          [
            {
              text: 'OK',
              onPress: () => {
                this.handleForceLogout();
              },
            },
          ],
          { cancelable: false },
        );
      });

    } catch (error) {
      console.error('[Socket] Setup error:', error);
    }
  };

  /**
   * Perform a force-logout: clear tokens, disconnect socket, notify AuthContext.
   */
  private handleForceLogout = async () => {
    try {
      await forceLogout();
      this.disconnect();
      if (this.onForceLogout) {
        this.onForceLogout();
      }
    } catch (e) {
      console.error('[Socket] handleForceLogout error:', e);
    }
  };

  disconnect = () => {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  };

  emit = (event: string, data?: any) => {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`[Socket] Cannot emit ${event}, not connected`);
    }
  };

  on = (event: string, callback: Function) => {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }

    return () => this.off(event, callback);
  };

  off = (event: string, callback?: Function) => {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback as any);
      } else {
        this.socket.off(event);
      }
    }
    
    if (this.listeners.has(event)) {
      if (callback) {
        const cbs = this.listeners.get(event)?.filter(cb => cb !== callback) || [];
        this.listeners.set(event, cbs);
      } else {
        this.listeners.delete(event);
      }
    }
  };
}

export const socketService = new SocketService();
