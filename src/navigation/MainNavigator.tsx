import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import HomeScreen from '../screens/HomeScreen';
import ContactsScreen from '../screens/ContactsScreen';
import ChatScreen from '../screens/ChatScreen';
import CallsScreen from '../screens/CallsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator 
      id="home-stack-navigator"
      screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        id="main-tab-navigator"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === "Trang chủ") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "Danh bạ") {
              iconName = focused ? "people" : "people-outline";
            } else if (route.name === "Cuộc gọi") {
              iconName = focused ? "call" : "call-outline";
            } else {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: "#0068FF",
          tabBarInactiveTintColor: "gray",
          headerShown: false,
        })}
      >
        <Tab.Screen name="Trang chủ" component={HomeStack} />
        <Tab.Screen name="Danh bạ" component={ContactsScreen} />
        <Tab.Screen name="Cuộc gọi" component={CallsScreen} />
        <Tab.Screen name="Cài đặt" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
