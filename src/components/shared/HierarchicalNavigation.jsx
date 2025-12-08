import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useStore } from '@/components/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Command } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { getNavigationForRole } from '@/config/navigation';

/**
 * @typedef {Object} NavigationItem
 * @property {string} name
 * @property {string} [page]
 * @property {React.ElementType} icon
 * @property {string} [badge]
 * @property {NavigationItem[]} [children]
 * @property {string[]} [roles]
 */

const CommandPalette = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const { user } = useStore();

  const userRole = user?.user_type || 'parent';

  const getAllNavigationItems = (items) => {
    let allItems = [];

    items.forEach(item => {
      if (item.roles && !item.roles.includes(userRole)) return;

      if (item.page) {
        allItems.push(item);
      }

      if (item.children) {
        allItems = allItems.concat(getAllNavigationItems(item.children));
      }
    });
    
    return allItems;
  };

  const allItems = getAllNavigationItems(getNavigationForRole(userRole));
  const filteredItems = allItems.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Command className="w-5 h-5" />
            Quick Navigation
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Search for pages and features..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
            autoFocus
          />
          
          <div className="max-h-96 overflow-y-auto space-y-1">
            {filteredItems.map((item, index) => (
              <Link
                key={`${item.name}-${index}`}
                to={createPageUrl(item.page || '')}
                onClick={onClose}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <item.icon className="w-5 h-5 text-gray-500" />
                <span className="font-medium">{item.name}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
            
            {filteredItems.length === 0 && search && (
              <div className="p-8 text-center text-gray-500">
                No results found for "{search}"
              </div>
            )}
          </div>
          
          <div className="text-xs text-gray-500 border-t pt-3">
            Use <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">↑↓</kbd> to navigate,{' '}
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Enter</kbd> to select,{' '}
            <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Esc</kbd> to close
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function HierarchicalNavigation({ className }) {
  const [expandedSections, setExpandedSections] = useState(new Set(['Learning', 'Community']));
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { user } = useStore();
  const location = useLocation();
  const userRole = user?.user_type || 'parent';

  const navigationStructure = useMemo(() => getNavigationForRole(userRole), [userRole]);

  const toggleSection = (sectionName) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  const isCurrentPath = (page) => {
    const targetPath = createPageUrl(page || '');
    return location.pathname === targetPath;
  };

  const hasRoleAccess = (roles) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(userRole);
  };

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <nav className={`space-y-2 ${className}`}>
        {/* Command Palette Trigger */}
        <Button
          variant="outline"
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full justify-start text-gray-500 border-dashed"
        >
          <Command className="w-4 h-4 mr-2" />
          Quick search...
          <div className="ml-auto flex gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">⌘</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">K</kbd>
          </div>
        </Button>

        {navigationStructure.map((section) => {
          if (!hasRoleAccess(section.roles)) return null;

          const hasChildren = section.children && section.children.length > 0;
          const isExpanded = expandedSections.has(section.name);
          const isCurrent = section.page ? isCurrentPath(section.page) : false;

          return (
            <div key={section.name}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  onClick={() => toggleSection(section.name)}
                  className={`w-full justify-start ${isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-gray-900'}`}
                >
                  <section.icon className="w-5 h-5 mr-3" />
                  {section.name}
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 ml-auto" />
                  ) : (
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  )}
                </Button>
              ) : (
                <Link to={createPageUrl(section.page || '')}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-gray-900'}`}
                  >
                    <section.icon className="w-5 h-5 mr-3" />
                    {section.name}
                    {section.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {section.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              )}

              <AnimatePresence>
                {hasChildren && isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-6 mt-1 space-y-1 overflow-hidden"
                  >
                    {section.children?.map((child) => {
                      if (!hasRoleAccess(child.roles)) return null;
                      
                      const isChildCurrent = child.page ? isCurrentPath(child.page) : false;

                      return (
                        <Link key={child.name} to={createPageUrl(child.page || '')}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`w-full justify-start ${isChildCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}
                          >
                            <child.icon className="w-4 h-4 mr-3" />
                            {child.name}
                            {child.badge && (
                              <Badge variant="secondary" className="ml-auto text-xs">
                                {child.badge}
                              </Badge>
                            )}
                          </Button>
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}