import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Users, Building, School, FileText, Activity, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User, Activity as ActivityEntity, LibraryResource, LocalEvent } from '@/api/entities';
import { useDebounce } from '@/components/hooks/useDebounce';
import { createLogger } from '@/utils/logger';

const logger = createLogger('global-search');

const SearchResultItem = ({ result, onClick, type }) => {
  const getIcon = () => {
    switch (type) {
      case 'user': return <Users className="w-4 h-4" />;
      case 'school': return <School className="w-4 h-4" />;
      case 'district': return <Building className="w-4 h-4" />;
      case 'activity': return <Activity className="w-4 h-4" />;
      case 'resource': return <FileText className="w-4 h-4" />;
      case 'event': return <FileText className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  return (
    <div
      className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
      onClick={onClick}
    >
      <div className="text-gray-400 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm text-gray-900 truncate">{result.title || result.name || result.full_name}</h4>
        {result.description && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{result.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full capitalize">
            {type}
          </span>
          {result.category && (
            <span className="text-xs text-gray-500">{result.category}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function GlobalSearch({ user, placeholder = "Search everything...", className = "" }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchScope, setSearchScope] = useState('all');
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  const isAdmin = user?.user_type && ['school_admin', 'district_admin', 'system_admin'].includes(user.user_type);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const searchPromises = [];
        const searchResults = [];

        // Content search (always available)
        if (searchScope === 'all' || searchScope === 'content') {
          searchPromises.push(
            ActivityEntity.filter({ title: { $ilike: `%${debouncedQuery}%` } }, '-created_date', 5)
              .then(activities => activities.map(a => ({ ...a, type: 'activity' }))),
            LibraryResource.filter({ title: { $ilike: `%${debouncedQuery}%` } }, '-created_date', 5)
              .then(resources => resources.map(r => ({ ...r, type: 'resource' }))),
            LocalEvent.filter({ title: { $ilike: `%${debouncedQuery}%` } }, '-start_time', 5)
              .then(events => events.map(e => ({ ...e, type: 'event' })))
          );
        }

        // Admin-specific searches
        if (isAdmin && (searchScope === 'all' || searchScope === 'admin')) {
          searchPromises.push(
            User.filter({ 
              $or: [
                { full_name: { $ilike: `%${debouncedQuery}%` } },
                { email: { $ilike: `%${debouncedQuery}%` } }
              ]
            }, '-created_date', 5).then(users => users.map(u => ({ ...u, type: 'user' })))
          );

          // Add school/district searches based on admin level
          if (user.user_type === 'system_admin') {
            // System admin can search all schools and districts
            // Note: These would need to be implemented when School/District entities are available
          }
        }

        const allResults = await Promise.all(searchPromises);
        const flatResults = allResults.flat().slice(0, 15); // Limit total results

        setResults(flatResults);
      } catch (error) {
        logger.error('Search error', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, searchScope, isAdmin, user]);

  const handleResultClick = (result) => {
    setIsOpen(false);
    setQuery('');

    // Navigate based on result type
    switch (result.type) {
      case 'activity':
        // Could open activity detail modal or navigate to activities page with filter
        navigate(createPageUrl('UnifiedDiscover', { tab: 'activities', id: result.id }));
        break;
      case 'resource':
        navigate(createPageUrl('UnifiedDiscover', { tab: 'library', id: result.id }));
        break;
      case 'event':
        navigate(createPageUrl('UnifiedDiscover', { tab: 'events', id: result.id }));
        break;
      case 'user':
        if (isAdmin) {
          navigate(createPageUrl('AdminUserEdit', { userId: result.id }));
        }
        break;
      default:
        break;
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-20"
        />
        
        {/* Search scope selector for admins */}
        {isAdmin && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <select
              value={searchScope}
              onChange={(e) => setSearchScope(e.target.value)}
              className="text-xs border-0 bg-transparent focus:ring-0 p-1"
            >
              <option value="all">All</option>
              <option value="content">Content</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        )}
        
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <AnimatePresence>
        {isOpen && (query.length >= 2 || results.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto"
          >
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-5 h-5 animate-pulse mx-auto mb-2" />
                Searching...
              </div>
            ) : results.length > 0 ? (
              <div>
                <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-medium text-gray-600">
                    Found {results.length} result{results.length !== 1 ? 's' : ''}
                    {searchScope !== 'all' && (
                      <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        {searchScope}
                      </span>
                    )}
                  </p>
                </div>
                {results.map((result) => (
                  <SearchResultItem
                    key={`${result.type}-${result.id}`}
                    result={result}
                    type={result.type}
                    onClick={() => handleResultClick(result)}
                  />
                ))}
              </div>
            ) : query.length >= 2 ? (
              <div className="p-4 text-center text-gray-500">
                <Search className="w-5 h-5 mx-auto mb-2 text-gray-300" />
                No results found for "{query}"
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
