import 'react-native-gesture-handler';
import MainNavigator from "./src/navigation/MainNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/contexts/AuthContext";
import { CallProvider } from "./src/contexts/CallContext";
import CallOverlay from "./src/components/CallOverlay";

let renderCount = 0;

export default function App() {
  renderCount++;
  // console.log(`DEBUG: App render #${renderCount}`);
  
  return (
    <AuthProvider>
      <CallProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          <MainNavigator />
          <CallOverlay />
        </SafeAreaProvider>
      </CallProvider>
    </AuthProvider>
  );
}
