import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CallsScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Cuộc gọi</Text>
        <Text className="text-gray-500">
          Danh sách cuộc gọi Zalo style sẽ ở đây
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default CallsScreen;
