// String formatting utilities

// Capitalize first letter
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Title case
export const toTitleCase = (str) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
};

// Format name (capitalize each word)
export const formatName = (name) => {
  if (!name) return '';
  return name.split(' ').map(capitalize).join(' ');
};

// Truncate text with ellipsis
export const truncate = (text, maxLength) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// Format phone number
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone; // Return original if not standard format
};

// Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format number with commas
export const formatNumber = (num) => {
  return num.toLocaleString();
};

// Format percentage
export const formatPercentage = (value, decimals = 1) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

// Format duration (minutes to human readable)
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  
  return `${hours} hr ${remainingMinutes} min`;
};

// Format grade level
export const formatGradeLevel = (grade) => {
  const gradeMap = {
    'K': 'Kindergarten',
    '1': '1st Grade',
    '2': '2nd Grade', 
    '3': '3rd Grade',
    '4': '4th Grade',
    '5': '5th Grade',
    '6': '6th Grade',
    '7': '7th Grade',
    '8': '8th Grade',
    '9': '9th Grade',
    '10': '10th Grade', 
    '11': '11th Grade',
    '12': '12th Grade'
  };
  
  return gradeMap[grade] || grade;
};

// Format role for display
export const formatRole = (role) => {
  const roleMap = {
    'parent': 'Parent',
    'teacher': 'Teacher',
    'school_admin': 'School Administrator',
    'district_admin': 'District Administrator', 
    'system_admin': 'System Administrator',
    'admin': 'Administrator'
  };
  
  return roleMap[role] || toTitleCase(role.replace('_', ' '));
};

// Format subscription tier
export const formatSubscriptionTier = (tier) => {
  const tierMap = {
    'free': 'Free',
    'premium': 'Premium',
    'enterprise': 'Enterprise'
  };
  
  return tierMap[tier] || capitalize(tier);
};

// Format activity category
export const formatActivityCategory = (category) => {
  const categoryMap = {
    'creative': 'Creative Arts',
    'educational': 'Educational',
    'physical': 'Physical Activity',
    'social': 'Social Skills',
    'emotional': 'Emotional Development',
    'problem_solving': 'Problem Solving',
    'science': 'Science & Nature',
    'art': 'Arts & Crafts',
    'music': 'Music & Movement',
    'outdoor': 'Outdoor Adventure'
  };
  
  return categoryMap[category] || toTitleCase(category.replace('_', ' '));
};

// Format learning style
export const formatLearningStyle = (style) => {
  const styleMap = {
    'visual': 'Visual Learner',
    'auditory': 'Auditory Learner', 
    'kinesthetic': 'Hands-on Learner',
    'not_sure': 'Still Exploring'
  };
  
  return styleMap[style] || capitalize(style);
};

// Format array as readable list
export const formatList = (items, conjunction = 'and') => {
  if (!items || items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  
  const lastItem = items[items.length - 1];
  const otherItems = items.slice(0, -1);
  
  return `${otherItems.join(', ')}, ${conjunction} ${lastItem}`;
};

// Format school type
export const formatSchoolType = (type) => {
  const typeMap = {
    'elementary': 'Elementary School',
    'middle': 'Middle School',
    'high': 'High School',
    'k12': 'K-12 School',
    'other': 'Other'
  };
  
  return typeMap[type] || capitalize(type);
};

// Format URL for display (remove protocol, www)
export const formatDisplayUrl = (url) => {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

// Pluralize word based on count
export const pluralize = (count, singular, plural) => {
  if (count === 1) return singular;
  return plural || `${singular}s`;
};

// Format count with pluralization
export const formatCount = (count, singular, plural) => {
  return `${formatNumber(count)} ${pluralize(count, singular, plural)}`;
};