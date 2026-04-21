import MainNavigator from "./src/navigation/MainNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/contexts/AuthContext";

let renderCount = 0;

export default function App() {
  renderCount++;
  // console.log(`DEBUG: App render #${renderCount}`);
  
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <MainNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
