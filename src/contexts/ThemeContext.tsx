import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ThemeColors {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  inputBackground: string;
  statusBar: "light" | "dark" | "auto" | "inverted";
}

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => Promise<void>;
  colors: ThemeColors;
}

const lightTheme: ThemeColors = {
  background: "#F4F5F7",
  card: "#FFFFFF",
  text: "#1F2937",
  textSecondary: "#6B7280",
  border: "#E5E7EB",
  primary: "#0068FF",
  inputBackground: "#F0F0F0",
  statusBar: "dark",
};

const darkTheme: ThemeColors = {
  background: "#111827",
  card: "#1F2937",
  text: "#F9FAFB",
  textSecondary: "#9CA3AF",
  border: "#374151",
  primary: "#3B82F6",
  inputBackground: "#374151",
  statusBar: "light",
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedDark = await AsyncStorage.getItem("settings:darkMode");
        if (storedDark !== null) {
          setIsDarkMode(storedDark === "true");
        }
      } catch (error) {
        console.error("Lỗi tải cài đặt Theme:", error);
      }
    };
    loadTheme();
  }, []);

  const toggleDarkMode = async () => {
    try {
      const nextMode = !isDarkMode;
      setIsDarkMode(nextMode);
      await AsyncStorage.setItem("settings:darkMode", String(nextMode));
    } catch (error) {
      console.error("Lỗi lưu cài đặt Theme:", error);
    }
  };

  const colors = isDarkMode ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
