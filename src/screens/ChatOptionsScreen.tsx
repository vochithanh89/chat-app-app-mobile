import React, { useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";

interface FileItem {
  id: string;
  name: string;
  size: string;
  url: string;
}

interface LinkItem {
  id: string;
  title: string;
  url: string;
}

const ChatOptionsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = route.params as { user: any };

  // Ẩn tab bar khi vào ChatOptionsScreen
  useFocusEffect(
    useCallback(() => {
      const tabNavigator = navigation.getParent() as any;
      if (tabNavigator) {
        tabNavigator.setOptions({
          tabBarStyle: { display: 'none' }
        });
      }
      
      return () => {
        // Hiện lại tab bar khi rời khỏi ChatOptionsScreen
        if (tabNavigator) {
          tabNavigator.setOptions({
            tabBarStyle: { display: 'flex' }
          });
        }
      };
    }, [navigation])
  );

  // Thêm useEffect để đảm bảo tab bar được ẩn
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const tabNavigator = navigation.getParent() as any;
      if (tabNavigator) {
        tabNavigator.setOptions({
          tabBarStyle: { display: 'none' }
        });
      }
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      const tabNavigator = navigation.getParent() as any;
      if (tabNavigator) {
        tabNavigator.setOptions({
          tabBarStyle: { display: 'flex' }
        });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  // Mock data - 7 items mỗi loại
  const mockSharedMedia = {
    images: [
      'https://picsum.photos/200/200?random=1',
      'https://picsum.photos/200/200?random=2',
      'https://picsum.photos/200/200?random=3',
      'https://picsum.photos/200/200?random=4',
      'https://picsum.photos/200/200?random=5',
      'https://picsum.photos/200/200?random=6',
      'https://picsum.photos/200/200?random=7',
    ],
    files: [
      { id: '1', name: 'Hợp đồng.pdf', size: '2.5 MB', url: '#' },
      { id: '2', name: 'Báo cáo.xlsx', size: '1.8 MB', url: '#' },
      { id: '3', name: 'Presentation.pptx', size: '5.2 MB', url: '#' },
      { id: '4', name: 'Document.docx', size: '890 KB', url: '#' },
      { id: '5', name: 'Hình ảnh.zip', size: '12.3 MB', url: '#' },
      { id: '6', name: 'Video.mp4', size: '45.6 MB', url: '#' },
      { id: '7', name: 'Audio.mp3', size: '4.2 MB', url: '#' },
    ] as FileItem[],
    links: [
      { id: '1', title: 'React Native Documentation', url: 'https://reactnative.dev' },
      { id: '2', title: 'Tailwind CSS Guide', url: 'https://tailwindcss.com' },
      { id: '3', title: 'Expo Documentation', url: 'https://docs.expo.dev' },
      { id: '4', title: 'TypeScript Handbook', url: 'https://typescriptlang.org' },
      { id: '5', title: 'GitHub Repository', url: 'https://github.com' },
      { id: '6', title: 'Stack Overflow', url: 'https://stackoverflow.com' },
      { id: '7', title: 'YouTube Tutorial', url: 'https://youtube.com' },
    ] as LinkItem[],
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.includes('.pdf')) return 'document-text';
    if (fileName.includes('.xlsx') || fileName.includes('.xls')) return 'grid';
    if (fileName.includes('.pptx') || fileName.includes('.ppt')) return 'easel';
    if (fileName.includes('.docx') || fileName.includes('.doc')) return 'document';
    if (fileName.includes('.zip') || fileName.includes('.rar')) return 'archive';
    if (fileName.includes('.mp4') || fileName.includes('.avi')) return 'videocam';
    if (fileName.includes('.mp3') || fileName.includes('.wav')) return 'musical-notes';
    return 'document';
  };

  const renderImages = () => {
    const displayImages = mockSharedMedia.images.slice(0, 4);
    const hasMore = mockSharedMedia.images.length > 4;

    return (
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="images" size={18} color="#666" className="mr-2" />
            <Text className="font-semibold text-gray-800">Đã gửi ({mockSharedMedia.images.length})</Text>
          </View>
          {hasMore && (
            <TouchableOpacity className="px-3 py-1 bg-blue-50 rounded-full">
              <Text className="text-blue-600 text-sm font-medium">Xem tất cả</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View className="flex-row flex-wrap">
          {displayImages.map((image, index) => (
            <Image
              key={index}
              source={{ uri: image }}
              className="w-20 h-20 rounded-lg mr-2 mb-2"
              style={{ width: 80, height: 80 }}
            />
          ))}
          {hasMore && (
            <View className="w-20 h-20 rounded-lg mr-2 mb-2 bg-gray-100 items-center justify-center">
              <Text className="text-gray-600 font-semibold">+{mockSharedMedia.images.length - 4}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderFiles = () => {
    const displayFiles = mockSharedMedia.files.slice(0, 4);
    const hasMore = mockSharedMedia.files.length > 4;

    return (
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="folder" size={18} color="#666" className="mr-2" />
            <Text className="font-semibold text-gray-800">File ({mockSharedMedia.files.length})</Text>
          </View>
          {hasMore && (
            <TouchableOpacity className="px-3 py-1 bg-blue-50 rounded-full">
              <Text className="text-blue-600 text-sm font-medium">Xem tất cả</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View className="space-y-2">
          {displayFiles.map((file) => (
            <TouchableOpacity key={file.id} className="flex-row items-center p-2 bg-gray-50 rounded-lg">
              <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name={getFileIcon(file.name) as any} size={20} color="#0068FF" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>{file.name}</Text>
                <Text className="text-xs text-gray-500">{file.size}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {hasMore && (
            <TouchableOpacity className="flex-row items-center p-2 bg-gray-50 rounded-lg">
              <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-800">+{mockSharedMedia.files.length - 4} file khác</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderLinks = () => {
    const displayLinks = mockSharedMedia.links.slice(0, 4);
    const hasMore = mockSharedMedia.links.length > 4;

    return (
      <View className="mb-6">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="link" size={18} color="#666" className="mr-2" />
            <Text className="font-semibold text-gray-800">Link ({mockSharedMedia.links.length})</Text>
          </View>
          {hasMore && (
            <TouchableOpacity className="px-3 py-1 bg-blue-50 rounded-full">
              <Text className="text-blue-600 text-sm font-medium">Xem tất cả</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View className="space-y-2">
          {displayLinks.map((link) => (
            <TouchableOpacity key={link.id} className="flex-row items-center p-2 bg-gray-50 rounded-lg">
              <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name="globe" size={20} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>{link.title}</Text>
                <Text className="text-xs text-blue-600" numberOfLines={1}>{link.url}</Text>
              </View>
            </TouchableOpacity>
          ))}
          {hasMore && (
            <TouchableOpacity className="flex-row items-center p-2 bg-gray-50 rounded-lg">
              <View className="w-10 h-10 bg-gray-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-800">+{mockSharedMedia.links.length - 4} link khác</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#d7d7d7" />
      
      {/* Header */}
      <View className="bg-blue-500 px-4 pt-12 pb-4 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.goBack()} 
            className="p-2 rounded-full mr-3"
          >
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white">Tùy chọn</Text>
        </View>
      </View>

      {/* Content - ScrollView for mobile */}
      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        style={{ flex: 1 }}
        nestedScrollEnabled={true}
      >
        {/* User Info Section */}
        <View className="bg-white px-4 py-4 mb-2">
          <View className="items-center">
            <Image
              source={{ uri: user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=face" }}
              className="w-20 h-20 rounded-full mb-3"
              style={{ width: 80, height: 80 }}
            />
            <Text className="text-lg font-semibold text-gray-800">{user?.name || "Người dùng"}</Text>
          </View>

          {/* Action Buttons */}
          <View className="flex-row mt-6 space-x-8">
            <TouchableOpacity className="flex-1 flex-row items-center justify-center py-3 bg-blue-50 rounded-lg">
              <Ionicons name="search" size={18} color="#0068FF" className="mr-2" />
              <Text className="text-blue-600 font-medium">Tìm tin nhắn</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 flex-row items-center justify-center py-3 bg-blue-50 rounded-lg">
              <Ionicons name="person" size={18} color="#0068FF" className="mr-2" />
              <Text className="text-blue-600 font-medium">Trang cá nhân</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Shared Media Section */}
        <View className="px-4 py-4">
          {renderImages()}
          {renderFiles()}
          {renderLinks()}
        </View>

        {/* Gray Separator */}
        <View className="h-4 bg-gray-200" />

        {/* Actions Section */}
        <View className="bg-white px-4 py-4">
          <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
            <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
              <Ionicons name="people" size={20} color="#0068FF" />
            </View>
            <Text className="flex-1 text-gray-800 font-medium">Tạo nhóm với người này</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
            <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center mr-3">
              <Ionicons name="person-add" size={20} color="#10B981" />
            </View>
            <Text className="flex-1 text-gray-800 font-medium">Thêm vào nhóm</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-3">
            <View className="w-10 h-10 bg-red-100 rounded-lg items-center justify-center mr-3">
              <Ionicons name="trash" size={20} color="#EF4444" />
            </View>
            <Text className="flex-1 text-red-500 font-medium">Xóa lịch sử trò chuyện</Text>
            <Ionicons name="chevron-forward" size={16} color="#666" />
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ChatOptionsScreen;
