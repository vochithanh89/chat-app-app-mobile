import React from "react";
import {
  TextInput,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  editable?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  className?: string;
}

const InputComponent: React.FC<InputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  multiline = false,
  editable = true,
  icon,
  error,
  keyboardType = "default",
  className = "",
}) => {
  return (
    <View className={`mb-3 ${className}`}>
      {label && (
        <Text className="text-gray-500 mb-1 text-sm">{label}</Text>
      )}
      
      <View className="relative">
        {icon && (
          <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            <Ionicons 
              name={icon} 
              size={20} 
              color="#9CA3AF" 
            />
          </View>
        )}
        
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          editable={editable}
          keyboardType={keyboardType}
          className={`
            border border-gray-200 rounded-lg p-3
            ${icon ? "pl-10" : ""}
            ${error ? "border-red-500" : ""}
            ${multiline ? "min-h-[100px] text-top" : ""}
            ${!editable ? "bg-gray-100" : "bg-white"}
          `}
          placeholderTextColor="#9CA3AF"
        />
      </View>
      
      {error && (
        <Text className="text-red-500 text-xs mt-1">{error}</Text>
      )}
    </View>
  );
};

export default InputComponent;
