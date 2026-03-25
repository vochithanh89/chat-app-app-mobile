import { useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

export const useTabBarVisibility = (hide: boolean = true) => {
  const navigation = useNavigation();

  const hideTabBar = useCallback(() => {
    const parent = navigation.getParent() as any;
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: 'none' }
      });
    }
  }, [navigation]);

  const showTabBar = useCallback(() => {
    const parent = navigation.getParent() as any;
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: 'flex' }
      });
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (hide) {
        hideTabBar();
      }

      return () => {
        if (hide) {
          showTabBar();
        }
      };
    }, [hide, hideTabBar, showTabBar])
  );

  return { hideTabBar, showTabBar };
};
