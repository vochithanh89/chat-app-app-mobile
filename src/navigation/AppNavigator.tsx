import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import HomeScreen from "../screens/HomeScreen";
import ContactsScreen from "../screens/ContactsScreen";
import ChatScreen from "../screens/ChatScreen";
import CallsScreen from "../screens/CallsScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
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
          tabBarActiveTintColor: "#0068FF", // Zalo xanh
          tabBarInactiveTintColor: "gray",
          headerShown: false, // Ẩn header mặc định của Tab Navigator
          headerStyle: {
            backgroundColor: "#0068FF",
          },
          headerTintColor: "white",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        })}
      >
        <Tab.Screen name="Trang chủ" component={HomeScreen} />
        <Tab.Screen name="Danh bạ" component={ContactsScreen} />
        <Tab.Screen name="Cuộc gọi" component={CallsScreen} />
        <Tab.Screen name="Cài đặt" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
