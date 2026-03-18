import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SettingsScreen = () => {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-4">Cài đặt</Text>
        <Text className="text-gray-500">
          Cài đặt tài khoản, privacy Zalo-like
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default SettingsScreen;
