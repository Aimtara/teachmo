import { format, parseISO, isValid, differenceInYears, startOfDay, endOfDay, addDays, subDays, isToday, isYesterday, isTomorrow, formatDistanceToNow } from 'date-fns';

// Calculate age from birth date
export const calculateAge = (birthDate) => {
  const birth = parseISO(birthDate);
  if (!isValid(birth)) {
    throw new Error('Invalid birth date');
  }
  return differenceInYears(new Date(), birth);
};

// Format date for display
export const formatDate = (date, formatString = 'PPP') => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  if (!isValid(dateObj)) {
    return 'Invalid date';
  }
  return format(dateObj, formatString);
};

// Format date for API (ISO string)
export const formatDateForApi = (date) => {
  return date.toISOString();
};

// Get user-friendly date description
export const getDateDescription = (date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Invalid date';
  }
  
  if (isToday(dateObj)) {
    return 'Today';
  } else if (isYesterday(dateObj)) {
    return 'Yesterday';
  } else if (isTomorrow(dateObj)) {
    return 'Tomorrow';
  } else {
    return formatDistanceToNow(dateObj, { addSuffix: true });
  }
};

// Get day boundaries
export const getDayBoundaries = (date = new Date()) => {
  return {
    start: startOfDay(date),
    end: endOfDay(date)
  };
};

// Get week date range
export const getWeekRange = (date = new Date()) => {
  const start = startOfDay(subDays(date, date.getDay()));
  const end = endOfDay(addDays(start, 6));
  return { start, end };
};

// Check if date is within range
export const isDateInRange = (date, startDate, endDate) => {
  return date >= startDate && date <= endDate;
};

// Parse flexible date input
export const parseFlexibleDate = (input) => {
  // Try different formats
  const formats = [
    () => parseISO(input),
    () => new Date(input),
    () => parseISO(`${input}T00:00:00.000Z`), // Add time if missing
  ];
  
  for (const formatFn of formats) {
    try {
      const date = formatFn();
      if (isValid(date)) {
        return date;
      }
    } catch {
      // Continue to next format
    }
  }
  
  return null;
};

// Get age-appropriate date format
export const getChildFriendlyDate = (date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Invalid date';
  }
  
  if (isToday(dateObj)) {
    return 'Today';
  } else if (isTomorrow(dateObj)) {
    return 'Tomorrow';
  } else {
    return format(dateObj, 'EEEE, MMMM do'); // "Monday, January 1st"
  }
};

// Calculate days until date
export const getDaysUntil = (date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = startOfDay(new Date());
  const targetDate = startOfDay(dateObj);
  
  return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

// Validate date string
export const isValidDateString = (dateString) => {
  const date = parseISO(dateString);
  return isValid(date);
};

// Get time ago string
export const getTimeAgo = (date) => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  
  if (!isValid(dateObj)) {
    return 'Unknown time';
  }
  
  return formatDistanceToNow(dateObj, { addSuffix: true });
};

// Sort dates (newest first)
export const sortDatesByNewest = (items) => {
  return [...items].sort((a, b) => {
    const dateA = parseISO(a.created_date);
    const dateB = parseISO(b.created_date);
    return dateB.getTime() - dateA.getTime();
  });
};

// Group items by date
export const groupByDate = (items, formatFn = (date) => format(date, 'yyyy-MM-dd')) => {
  return items.reduce((groups, item) => {
    const date = parseISO(item.created_date);
    const key = formatFn(date);
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    
    return groups;
  }, {});
};