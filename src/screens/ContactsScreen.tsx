import React from "react";
import {
  FlatList,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  SectionList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

const ContactsScreen = () => {
  const contacts = [
    { id: "1", name: "Bạn A", phone: "0912345678", avatar: "https://vienmoitruong5014.org.vn/wp-content/uploads/2023/03/anh-cho-con-de-thuong_022907461.jpg", online: true },
    { id: "2", name: "Bạn B", phone: "0923456789", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face", online: false },
    { id: "3", name: "Bạn C", phone: "0934567890", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face", online: true },
    { id: "4", name: "Bạn D", phone: "0945678901", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face", online: false },
    { id: "5", name: "Bạn E", phone: "0956789012", avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face", online: true },
    { id: "6", name: "Bạn F", phone: "0967890123", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=60&h=60&fit=crop&crop=face", online: false },
    { id: "7", name: "Bạn G", phone: "0978901234", avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=60&h=60&fit=crop&crop=face", online: true },
    { id: "8", name: "Bạn H", phone: "0989012345", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=60&h=60&fit=crop&crop=face", online: false },
  ];

  // Group contacts by first letter
  const groupedContacts = contacts.reduce((acc, contact) => {
    const firstLetter = contact.name.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(contact);
    return acc;
  }, {});

  const sections = Object.keys(groupedContacts)
    .sort()
    .map(letter => ({
      title: letter,
      data: groupedContacts[letter],
    }));

  const renderContactItem = ({ item }: { item: any }) => (
    <TouchableOpacity className="flex-row items-center p-3 bg-white border-b border-gray-50">
      <View className="relative">
        <Image
          source={{ uri: item.avatar }}
          className="w-12 h-12 rounded-full"
        />
        {item.online && (
          <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </View>
      <View className="flex-1 ml-3">
        <Text className="font-semibold text-base text-gray-900">{item.name}</Text>
        <Text className="text-sm text-gray-500">{item.phone}</Text>
      </View>
      <View className="flex-row">
        <TouchableOpacity className="p-2">
          <Ionicons name="call-outline" size={20} color="#0068FF" />
        </TouchableOpacity>
        <TouchableOpacity className="p-2">
          <Ionicons name="videocam-outline" size={20} color="#0068FF" />
        </TouchableOpacity>
        <TouchableOpacity className="p-2">
          <Ionicons name="chatbubble-outline" size={20} color="#0068FF" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View className="bg-gray-100 px-4 py-2">
      <Text className="font-semibold text-sm text-gray-700">{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">Danh bạ</Text>
          <View className="flex-row">
            <TouchableOpacity className="p-2">
              <Ionicons name="person-add-outline" size={24} color="#0068FF" />
            </TouchableOpacity>
            <TouchableOpacity className="p-2">
              <Ionicons name="people-outline" size={24} color="#0068FF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Search bar */}
        <View className="mt-3">
          <View className="bg-gray-100 rounded-full px-4 py-2 flex-row items-center">
            <Ionicons name="search" size={20} color="gray" className="mr-2" />
            <TextInput
              placeholder="Tìm kiếm bạn bè..."
              className="flex-1 text-sm text-gray-700"
              placeholderTextColor="gray"
            />
          </View>
        </View>
      </View>

      {/* Contacts List */}
      <View className="flex-1 bg-white">
        <SectionList
          sections={sections}
          renderItem={renderContactItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={true}
        />
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity className="absolute bottom-6 right-6 w-14 h-14 bg-blue-500 rounded-full justify-center items-center shadow-lg">
        <Ionicons name="person-add" size={24} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default ContactsScreen;
