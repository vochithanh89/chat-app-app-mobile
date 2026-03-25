import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface TabHeaderProps {
  tabs: Array<{
    key: string;
    title: string;
  }>;
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const TabHeaderComponent: React.FC<TabHeaderProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}) => {
  return (
    <View className={`bg-white px-4 py-2 border-b border-gray-100 ${className}`}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingRight: 16 }}
      >
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            className={`px-4 py-2 mr-4 rounded-full ${
              activeTab === tab.key ? "bg-blue-500" : "bg-gray-100"
            }`}
            onPress={() => onTabChange(tab.key)}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab.key ? "text-white" : "text-gray-700"
              }`}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

export default TabHeaderComponent;
