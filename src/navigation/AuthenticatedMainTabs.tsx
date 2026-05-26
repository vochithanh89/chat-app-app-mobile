import React from 'react';
import { Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ChatScreen from '../screens/ChatScreen';
import AiScreen from '../screens/AiScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

function AuthenticatedMainTabs() {
  try {
    return (
      <Tab.Navigator
        id="main-tab-navigator"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "Contact") {
              iconName = focused ? "people" : "people-outline";
            } else if (route.name === "AI") {
              iconName = focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline";
            } else {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarLabel: ({ focused, color }) => {
            let label: string;
            if (route.name === "Home") {
              label = "Home";
            } else if (route.name === "Contact") {
              label = "Contact";
            } else if (route.name === "AI") {
              label = "AI";
            } else {
              label = "Settings";
            }
            return <Text style={{ color, fontSize: 12 }}>{label}</Text>;
          },
          tabBarActiveTintColor: "#0068FF",
          tabBarInactiveTintColor: "gray",
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Contact" component={ContactsScreen} />
        <Tab.Screen name="AI" component={AiScreen} />
        <Tab.Screen name="Setting" component={SettingsScreen} />
      </Tab.Navigator>
    );
  } catch (error) {
    console.error('AuthenticatedMainTabs - Lỗi render:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red', fontSize: 16 }}>Lỗi tải tabs</Text>
      </View>
    );
  }
}

export default AuthenticatedMainTabs;
