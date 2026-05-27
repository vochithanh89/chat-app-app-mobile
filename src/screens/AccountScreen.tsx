import React from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { userAPI } from "../services/api";

const AccountScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isDarkMode: darkMode, colors } = useTheme();

  const [stats, setStats] = React.useState({
    chats: 0,
    calls: 0,
    documents: 0,
    groups: 0,
  });
  const [loadingStats, setLoadingStats] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await userAPI.getStatistics();
        const statsData = response?.data || response;
        if (statsData) {
          setStats({
            chats: statsData.chats || 0,
            calls: statsData.calls || 0,
            documents: statsData.documents || 0,
            groups: statsData.groups || 0,
          });
        }
      } catch (error) {
        console.error("Lỗi tải thống kê hoạt động:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, []);

  const createdAt = user?.createdAt || user?.created_at;
  const memberSince = (() => {
    if (!createdAt) return "Không rõ";
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return "Không rõ";
    return `tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`;
  })();

  const displayName = user ? `${user.lastName || ""} ${user.firstName || ""}`.trim() || user.name || user.username || "Thành viên" : "Thành viên";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? "#111827" : "#F3F4F6" }}>
      {/* HEADER */}
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: darkMode ? "#1F2937" : "#E5E7EB",
        backgroundColor: darkMode ? "#1F2937" : "#0068FF",
      }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "600", marginLeft: 16, color: "white" }}>
          Thống kê hoạt động
        </Text>
      </View>

      {/* CONTENT */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {/* Profile Card */}
        <View style={{
          backgroundColor: darkMode ? "#1F2937" : "white",
          borderRadius: 16,
          padding: 24,
          alignItems: "center",
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          elevation: 2,
        }}>
          <Image
            source={{
              uri: user?.avatarUrl || user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120",
            }}
            style={{ width: 96, height: 96, borderRadius: 48, marginBottom: 12 }}
          />
          <Text style={{
            fontSize: 20,
            fontWeight: "700",
            color: darkMode ? "white" : "#111827",
            marginBottom: 4,
          }}>
            {displayName}
          </Text>
          <Text style={{
            fontSize: 14,
            color: darkMode ? "#9CA3AF" : "#6B7280",
            marginBottom: 8,
          }}>
            {user?.email || ""}
          </Text>
          
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: darkMode ? "#374151" : "#F3F4F6",
          }}>
            <Ionicons name="calendar-outline" size={14} color={darkMode ? "#9CA3AF" : "#6B7280"} style={{ marginRight: 6 }} />
            <Text style={{
              fontSize: 12,
              fontWeight: "500",
              color: darkMode ? "#D1D5DB" : "#4B5563",
            }}>
              Thành viên từ {memberSince}
            </Text>
          </View>
        </View>

        {/* Statistics Grid */}
        <View style={{
          backgroundColor: darkMode ? "#1F2937" : "white",
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          elevation: 2,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: "600",
            color: darkMode ? "white" : "#111827",
            marginBottom: 16,
          }}>
            Thống kê hoạt động của tôi
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
            <StatCard
              icon="chatbubbles-outline"
              count={String(stats.chats)}
              label="Trò chuyện"
              color="#0068FF"
              darkMode={darkMode}
            />
            <StatCard
              icon="call-outline"
              count={String(stats.calls)}
              label="Cuộc gọi"
              color="#10B981"
              darkMode={darkMode}
            />
            <StatCard
              icon="document-text-outline"
              count={String(stats.documents)}
              label="Tài liệu"
              color="#F59E0B"
              darkMode={darkMode}
            />
            <StatCard
              icon="people-outline"
              count={String(stats.groups)}
              label="Nhóm tham gia"
              color="#8B5CF6"
              darkMode={darkMode}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const StatCard = ({ icon, count, label, color, darkMode }: { icon: any; count: string; label: string; color: string; darkMode: boolean }) => (
  <View style={{
    width: "48%",
    backgroundColor: darkMode ? "#374151" : "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: darkMode ? "#4B5563" : "#F3F4F6",
  }}>
    <View style={{
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${color}20`,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
    }}>
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={{
      fontSize: 22,
      fontWeight: "700",
      color: darkMode ? "white" : "#111827",
    }}>
      {count}
    </Text>
    <Text style={{
      fontSize: 12,
      color: darkMode ? "#9CA3AF" : "#6B7280",
      marginTop: 2,
      textAlign: "center",
    }}>
      {label}
    </Text>
  </View>
);

export default AccountScreen;
