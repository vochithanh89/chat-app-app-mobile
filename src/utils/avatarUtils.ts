// Helper function to create avatar from initials
export const getAvatarFromName = (name: string, size: number = 120) => {
  if (!name) return `https://ui-avatars.com/api/?name=USER&size=${size}&background=0068FF&color=fff&bold=true`;
  
  // Get initials from name
  const initials = name
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase())
    .slice(0, 2) // Take max 2 letters
    .join('');
  
  const text = initials || 'USER';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(text)}&size=${size}&background=0068FF&color=fff&bold=true`;
};

// Predefined sizes for different components
export const AVATAR_SIZES = {
  SMALL: 32,
  MEDIUM: 60,
  LARGE: 80,
  EXTRA_LARGE: 120,
} as const;

// Helper functions for specific sizes
export const getSmallAvatar = (name: string) => getAvatarFromName(name, AVATAR_SIZES.SMALL);
export const getMediumAvatar = (name: string) => getAvatarFromName(name, AVATAR_SIZES.MEDIUM);
export const getLargeAvatar = (name: string) => getAvatarFromName(name, AVATAR_SIZES.LARGE);
export const getExtraLargeAvatar = (name: string) => getAvatarFromName(name, AVATAR_SIZES.EXTRA_LARGE);
