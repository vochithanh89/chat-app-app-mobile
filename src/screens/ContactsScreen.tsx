import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  SectionList,
  SafeAreaView,
  TextInput,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ContactsScreen = () => {
  const [activeTab, setActiveTab] = useState<'friends' | 'groups'>('friends');

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

  const groups = [
    { id: "g1", name: "Nhóm Gia Đình", members: 5, avatar: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=60&h=60&fit=crop&crop=face" },
    { id: "g2", name: "Nhóm Bạn Bè", members: 8, avatar: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=60&h=60&fit=crop&crop=face" },
    { id: "g3", name: "Nhóm Công Việc", members: 12, avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face" },
  ];

  // Group contacts by first letter
  const groupedContacts = contacts.reduce((acc, contact) => {
    const firstLetter = contact.name.charAt(0).toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(contact);
    return acc;
  }, {} as Record<string, typeof contacts>);

  const sections = Object.keys(groupedContacts)
    .sort()
    .map(letter => ({
      title: letter,
      data: groupedContacts[letter]
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
    <View className="bg-gray-100 px-4 py-3">
      <Text className="font-semibold text-sm text-gray-700">{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-blue-500 mt-9 px-4 py-5">
        {/* Search bar with icons */}
        <View className="bg-white rounded-full px-4 py-3 flex-row items-center shadow-sm">
          <Ionicons name="search" size={18} color="#0068FF" className="mr-3" />
          <TextInput
            placeholder="Tìm kiếm bạn bè, danh bạ..."
            className="flex-1 text-sm text-gray-700"
            placeholderTextColor="#9CA3AF"
          />
          <TouchableOpacity className="ml-2">
            <Ionicons name="person-add-outline" size={18} color="#0068FF" />
          </TouchableOpacity>
          {/* <TouchableOpacity className="ml-2">
            <Ionicons name="people-outline" size={18} color="#0068FF" />
          </TouchableOpacity> */}
        </View>
      </View>

      {/* Tabs */}
      <View className="bg-white border-b border-gray-200">
        <View className="flex-row">
          <TouchableOpacity 
            className={`flex-1 py-3 ${activeTab === 'friends' ? 'border-b-2 border-blue-500' : ''}`}
            onPress={() => setActiveTab('friends')}
          >
            <Text className={`text-center font-medium ${activeTab === 'friends' ? 'text-blue-500' : 'text-gray-500'}`}>
              Bạn bè
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 ${activeTab === 'groups' ? 'border-b-2 border-blue-500' : ''}`}
            onPress={() => setActiveTab('groups')}
          >
            <Text className={`text-center font-medium ${activeTab === 'groups' ? 'text-blue-500' : 'text-gray-500'}`}>
              Nhóm
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content based on active tab */}
      {activeTab === 'friends' ? (
        <SectionList
          sections={sections}
          renderItem={renderContactItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={true}
          className="flex-1"
        />
      ) : (
        <View className="flex-1 bg-white">
          {groups.map((group) => (
            <TouchableOpacity key={group.id} className="flex-row items-center p-3 bg-white border-b border-gray-50">
              <Image
                source={{ uri: group.avatar }}
                className="w-12 h-12 rounded-full"
              />
              <View className="flex-1 ml-3">
                <Text className="font-medium text-gray-800">{group.name}</Text>
                <Text className="text-sm text-gray-500">{group.members} thành viên</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      )}

    </SafeAreaView>
  );
};

export default ContactsScreen;
