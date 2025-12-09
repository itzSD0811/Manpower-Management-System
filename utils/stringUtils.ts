
export const formatShortName = (fullName: string): string => {
  if (!fullName) return '';
  
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return parts[0];
  }
  
  // Last part is the surname (full)
  const surname = parts.pop();
  
  // Previous parts become initials
  const initials = parts.map(p => p.charAt(0).toUpperCase());
  
  return `${initials.join(' ')} ${surname}`;
};
