import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, X, Clock, User, FileText, Calendar, MessageSquare, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useApi } from '@/components/hooks/useApi';
import { User as UserEntity, Activity, ParentingTip, CalendarEvent, UserMessage } from '@/api/entities';
import { useDebounce } from './useDebounce';

// Search result categories with icons and colors
const SEARCH_CATEGORIES = {
  activities: {
    icon: FileText,
    label: 'Activities',
    color: 'bg-green-100 text-green-800',
    path: 'UnifiedDiscover'
  },
  tips: {
    icon: FileText,
    label: 'Tips',
    color: 'bg-blue-100 text-blue-800',
    path: 'Library'
  },
  events: {
    icon: Calendar,
    label: 'Events',
    color: 'bg-purple-100 text-purple-800',
    path: 'Calendar'
  },
  messages: {
    icon: MessageSquare,
    label: 'Messages',
    color: 'bg-orange-100 text-orange-800',
    path: 'Messages'
  },
  users: {
    icon: User,
    label: 'People',
    color: 'bg-gray-100 text-gray-800',
    path: 'UnifiedCommunity'
  },
  pages: {
    icon: ArrowRight,
    label: 'Pages',
    color: 'bg-indigo-100 text-indigo-800',
    path: null
  }
};

// Quick navigation shortcuts
const QUICK_SHORTCUTS = [
  { label: 'Messages', path: 'Messages', shortcut: 'M' },
  { label: 'Calendar', path: 'Calendar', shortcut: 'C' },
  { label: 'Activities', path: 'UnifiedDiscover', shortcut: 'A' },
  { label: 'AI Coach', path: 'AIAssistant', shortcut: 'I' },
  { label: 'Settings', path: 'Settings', shortcut: 'S' }
];

// Recent searches storage
const RECENT_SEARCHES_KEY = 'teachmo_recent_searches';
const MAX_RECENT_SEARCHES = 5;

function SearchResult({ result, onSelect, searchTerm }) {
  const category = SEARCH_CATEGORIES[result.type];
  const Icon = category?.icon || FileText;

  const highlightText = (text, term) => {
    if (!term || !text) return text;
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <mark key={i} className="bg-yellow-200">{part}</mark> : part
    );
  };

  return (
    <button
      onClick={() => onSelect(result)}
      className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:bg-blue-50 focus:outline-none group"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-1">
          <Icon className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900 truncate">
              {highlightText(result.title, searchTerm)}
            </h4>
            <Badge className={`text-xs ${category?.color || 'bg-gray-100 text-gray-800'}`}>
              {category?.label || result.type}
            </Badge>
          </div>
          {result.description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {highlightText(result.description, searchTerm)}
            </p>
          )}
          {result.metadata && (
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              {result.metadata.date && (
                <span>{new Date(result.metadata.date).toLocaleDateString()}</span>
              )}
              {result.metadata.author && (
                <span>by {result.metadata.author}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

function QuickShortcuts({ onNavigate }) {
  return (
    <div className="p-3 border-b border-gray-100">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
        Quick Navigation
      </h3>
      <div className="flex flex-wrap gap-2">
        {QUICK_SHORTCUTS.map(shortcut => (
          <button
            key={shortcut.path}
            onClick={() => onNavigate(shortcut.path)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            <span>{shortcut.label}</span>
            <kbd className="text-xs text-gray-500 bg-white px-1 rounded">
              {shortcut.shortcut}
            </kbd>
          </button>
        ))}
      </div>
    </div>
  );
}

function RecentSearches({ searches, onSelectRecent, onClearRecent }) {
  if (searches.length === 0) return null;

  return (
    <div className="p-3 border-b border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Recent Searches
        </h3>
        <button
          onClick={onClearRecent}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Clear
        </button>
      </div>
      <div className="space-y-1">
        {searches.map((search, index) => (
          <button
            key={index}
            onClick={() => onSelectRecent(search)}
            className="flex items-center gap-2 w-full p-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded"
          >
            <Clock className="w-3 h-3" />
            <span>{search}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SmartSearch({ className = '', placeholder = 'Search everything...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef(null);
  const resultsRef = useRef(null);
  const navigate = useNavigate();
  const api = useApi({ silent: true });
  
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches on mount
  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch (e) {
        console.warn('Failed to parse recent searches');
      }
    }
  }, []);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && results[selectedIndex]) {
            handleSelectResult(results[selectedIndex]);
          } else if (query.trim()) {
            // Global search if no specific result selected
            navigate(createPageUrl('UnifiedDiscover') + `?search=${encodeURIComponent(query)}`);
            handleClose();
          }
          break;
        case 'Escape':
          handleClose();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedIndex, results, query, navigate]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const performSearch = async (searchQuery) => {
    try {
      // Search across multiple entity types
      const [activities, tips, events, messages] = await Promise.all([
        api.execute(
          () => Activity.filter({ 
            $or: [
              { title: { $regex: searchQuery, $options: 'i' } },
              { description: { $regex: searchQuery, $options: 'i' } }
            ]
          }, '-created_date', 5),
          { key: 'search_activities', skipErrorHandling: true }
        ).catch(() => []),
        
        api.execute(
          () => ParentingTip.filter({ 
            $or: [
              { title: { $regex: searchQuery, $options: 'i' } },
              { summary: { $regex: searchQuery, $options: 'i' } }
            ]
          }, '-created_date', 5),
          { key: 'search_tips', skipErrorHandling: true }
        ).catch(() => []),
        
        api.execute(
          () => CalendarEvent.filter({ 
            title: { $regex: searchQuery, $options: 'i' }
          }, '-start_time', 5),
          { key: 'search_events', skipErrorHandling: true }
        ).catch(() => []),
        
        api.execute(
          () => UserMessage.filter({ 
            content: { $regex: searchQuery, $options: 'i' }
          }, '-created_date', 3),
          { key: 'search_messages', skipErrorHandling: true }
        ).catch(() => [])
      ]);

      // Transform results into unified format
      const searchResults = [
        ...activities.map(a => ({
          id: a.id,
          type: 'activities',
          title: a.title,
          description: a.description,
          path: `UnifiedDiscover?activity=${a.id}`,
          metadata: { date: a.created_date }
        })),
        ...tips.map(t => ({
          id: t.id,
          type: 'tips',
          title: t.title,
          description: t.summary,
          path: `Library?tip=${t.id}`,
          metadata: { date: t.created_date }
        })),
        ...events.map(e => ({
          id: e.id,
          type: 'events',
          title: e.title,
          description: e.description,
          path: `Calendar?event=${e.id}`,
          metadata: { date: e.start_time }
        })),
        ...messages.map(m => ({
          id: m.id,
          type: 'messages',
          title: 'Message',
          description: m.content,
          path: `Messages?thread=${m.thread_id}`,
          metadata: { date: m.created_date }
        }))
      ];

      // Add page navigation results
      const pageResults = QUICK_SHORTCUTS
        .filter(shortcut => 
          shortcut.label.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(shortcut => ({
          id: shortcut.path,
          type: 'pages',
          title: shortcut.label,
          description: `Navigate to ${shortcut.label}`,
          path: shortcut.path,
          metadata: {}
        }));

      setResults([...searchResults, ...pageResults]);
      setSelectedIndex(-1);

    } catch (error) {
      console.warn('Search failed:', error);
      setResults([]);
    }
  };

  const handleSelectResult = (result) => {
    // Add to recent searches
    addToRecentSearches(query);
    
    // Navigate to result
    navigate(createPageUrl(result.path));
    handleClose();
  };

  const handleSelectRecent = (recentQuery) => {
    setQuery(recentQuery);
    performSearch(recentQuery);
  };

  const addToRecentSearches = (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    const updated = [
      searchQuery,
      ...recentSearches.filter(s => s !== searchQuery)
    ].slice(0, MAX_RECENT_SEARCHES);
    
    setRecentSearches(updated);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const isLoading = api.isLoading('search_activities') || 
                   api.isLoading('search_tips') || 
                   api.isLoading('search_events') || 
                   api.isLoading('search_messages');

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-10 pr-10"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 shadow-lg border-0 max-h-96 overflow-hidden">
          <CardContent className="p-0">
            {query.length < 2 ? (
              <div>
                <QuickShortcuts onNavigate={(path) => {
                  navigate(createPageUrl(path));
                  handleClose();
                }} />
                <RecentSearches 
                  searches={recentSearches}
                  onSelectRecent={handleSelectRecent}
                  onClearRecent={clearRecentSearches}
                />
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto" ref={resultsRef}>
                {results.length > 0 ? (
                  results.map((result, index) => (
                    <div 
                      key={`${result.type}-${result.id}`}
                      className={selectedIndex === index ? 'bg-blue-50' : ''}
                    >
                      <SearchResult
                        result={result}
                        onSelect={handleSelectResult}
                        searchTerm={query}
                      />
                    </div>
                  ))
                ) : !isLoading ? (
                  <div className="p-4 text-center text-gray-500">
                    <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No results found for "{query}"</p>
                    <p className="text-sm mt-1">Try different keywords or check spelling</p>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}