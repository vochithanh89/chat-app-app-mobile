import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import HomeScreen from "../screens/HomeScreen";
import ContactsScreen from "../screens/ContactsScreen";
import ChatScreen from "../screens/ChatScreen";
import ChatOptionsScreen from "../screens/ChatOptionsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import VerifyEmailScreen from "../screens/VerifyEmailScreen";
import AccountScreen from "../screens/AccountScreen";
import ChangePasswordScreen from "../screens/ChangePasswordScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";
import GroupOptionsScreen from "../screens/GroupOptionsScreen";
import QrScanScreen from "../screens/QrScanScreen";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import AuthenticatedMainTabs
import AuthenticatedMainTabs from './AuthenticatedMainTabs';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// AuthWrapper component để kiểm tra authentication state
const AuthWrapper = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Chỉ hiển thị loading khi thực sự đang loading (không phải infinite loop)
  if (loading && !isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <NavigationContainer>
        <Stack.Navigator id="auth-stack-navigator" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return <>{children}</>;
};

function SettingsStack() {
  return (
    <Stack.Navigator
      id="settings-stack-navigator"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator
      id="home-stack-navigator"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ChatOptions" component={ChatOptionsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Account" component={AccountScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

function ContactStack() {
  return (
    <Stack.Navigator
      id="contact-stack-navigator"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="ContactsMain" component={ContactsScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="ChatOptions" component={ChatOptionsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="GroupOptions" component={GroupOptionsScreen} />
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <AuthWrapper>
      <NavigationContainer>
        <Stack.Navigator
          id="main-stack-navigator"
          screenOptions={{ headerShown: false }}
          initialRouteName={isAuthenticated ? "MainApp" : "Login"}
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="MainApp" component={AuthenticatedMainTabs} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ChatOptions" component={ChatOptionsScreen} />
          <Stack.Screen name="GroupOptions" component={GroupOptionsScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="QrScan" component={QrScanScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthWrapper>
  );
}

