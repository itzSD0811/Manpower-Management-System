/**
 * Get user display name
 * Returns display name if set, otherwise returns email
 */
export const getUserDisplayName = (email: string | null | undefined): string => {
  if (!email) return 'User';
  
  const displayName = localStorage.getItem(`user_display_name_${email}`);
  return displayName || email;
};

/**
 * Set user display name
 */
export const setUserDisplayName = (email: string, displayName: string): void => {
  if (displayName.trim()) {
    localStorage.setItem(`user_display_name_${email}`, displayName.trim());
  } else {
    localStorage.removeItem(`user_display_name_${email}`);
  }
};

/**
 * Get user display name (returns null if not set)
 */
export const getUserDisplayNameOnly = (email: string | null | undefined): string | null => {
  if (!email) return null;
  return localStorage.getItem(`user_display_name_${email}`);
};








