import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const CallsScreen = () => {
  const [activeTab, setActiveTab] = useState("all");

  const callHistory = [
    {
      id: "1",
      name: "Friend A",
      avatar: "https://vienmoitruong5014.org.vn/wp-content/uploads/2023/03/anh-cho-con-de-thuong_022907461.jpg",
      time: "18:30",
      date: "Today",
      type: "incoming",
      duration: "5 min",
      missed: false,
    },
    {
      id: "2",
      name: "Friend Group",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face",
      time: "17:45",
      date: "Today",
      type: "outgoing",
      duration: "12 min",
      missed: false,
    },
    {
      id: "3",
      name: "Mom",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face",
      time: "16:20",
      date: "Yesterday",
      type: "incoming",
      duration: "0 min",
      missed: true,
    },
    {
      id: "4",
      name: "Company",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face",
      time: "14:15",
      date: "Yesterday",
      type: "incoming",
      duration: "8 min",
      missed: false,
    },
  ];

  const getFilteredCalls = () => {
    switch (activeTab) {
      case "missed":
        return callHistory.filter(call => call.missed);
      case "incoming":
        return callHistory.filter(call => call.type === "incoming");
      default:
        return callHistory;
    }
  };

  const renderCallItem = ({ item }: { item: any }) => (
    <TouchableOpacity className="flex-row items-center p-4 bg-white border-b border-gray-50">
      <View className="relative mr-3">
        <Image
          source={{ uri: item.avatar }}
          className="w-12 h-12 rounded-full"
        />
      </View>
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="font-semibold text-base text-gray-900 flex-1">
            {item.name}
          </Text>
          <Text className="text-xs text-gray-500">{item.time}</Text>
        </View>
        <View className="flex-row items-center">
          <Ionicons
            name={
              item.type === "incoming"
                ? item.missed
                  ? "call"
                  : "call"
                : "call"
            }
            size={14}
            color={item.missed ? "#EF4444" : "#10B981"}
            style={{
              transform: [{ rotateY: item.type === "outgoing" ? "180deg" : "0deg" }],
            }}
            className="mr-1"
          />
          <Text
            numberOfLines={1}
            className={`text-sm flex-1 ${
              item.missed ? "text-red-500" : "text-gray-600"
            }`}
          >
            {item.missed ? "Missed call" : `${item.duration} • ${item.date}`}
          </Text>
        </View>
      </View>
      <TouchableOpacity className="ml-2 p-2">
        <Ionicons name="call" size={20} color="#0068FF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-500 p-4 border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <Text className="text-xl font-semibold text-gray-900 text-white">Call</Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="bg-white px-4 py-2 border-b border-gray-100">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            className={`px-4 py-2 mr-4 rounded-full ${
              activeTab === "all" ? "bg-blue-500" : "bg-gray-100"
            }`}
            onPress={() => setActiveTab("all")}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === "all" ? "text-white" : "text-gray-700"
              }`}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 mr-4 rounded-full ${
              activeTab === "missed" ? "bg-blue-500" : "bg-gray-100"
            }`}
            onPress={() => setActiveTab("missed")}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === "missed" ? "text-white" : "text-gray-700"
              }`}
            >
              Missed call
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${
              activeTab === "incoming" ? "bg-blue-500" : "bg-gray-100"
            }`}
            onPress={() => setActiveTab("incoming")}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === "incoming" ? "text-white" : "text-gray-700"
              }`}
            >
              Incoming call
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Call List */}
      <View className="flex-1 bg-white">
        <FlatList
          data={getFilteredCalls()}
          renderItem={renderCallItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
};

export default CallsScreen;
