import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useStore } from '@/components/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Home, Search, Users, Calendar, MessageCircle, Settings, BookOpen, Target, Award, Bot,
  School, GraduationCap, Shield, BarChart3, Bell, FileText, Building2, UserCheck,
  ChevronDown, ChevronRight, Command
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * @typedef {Object} NavigationItem
 * @property {string} name
 * @property {string} [href]
 * @property {React.ElementType} icon
 * @property {string} [badge]
 * @property {NavigationItem[]} [children]
 * @property {string[]} [roles]
 */

const navigationStructure = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin']
  },
  {
    name: 'Learning',
    icon: BookOpen,
    roles: ['parent', 'teacher'],
    children: [
      { name: 'Discover', href: '/discover', icon: Search },
      { name: 'Progress', href: '/progress', icon: Target },
      { name: 'Achievements', href: '/achievements', icon: Award },
      { name: 'Journal', href: '/journal', icon: FileText }
    ]
  },
  {
    name: 'Community',
    icon: Users,
    roles: ['parent', 'teacher'],
    children: [
      { name: 'Community Feed', href: '/community', icon: Users },
      { name: 'Messages', href: '/messages', icon: MessageCircle, badge: '3' },
      { name: 'Calendar', href: '/calendar', icon: Calendar }
    ]
  },
  {
    name: 'Teaching',
    icon: GraduationCap,
    roles: ['teacher'],
    children: [
      { name: 'My Classes', href: '/teacher/classes', icon: School },
      { name: 'Assignments', href: '/teacher/assignments', icon: FileText },
      { name: 'Teacher Messages', href: '/teacher/messages', icon: MessageCircle }
    ]
  },
  {
    name: 'Administration',
    icon: Shield,
    roles: ['school_admin', 'district_admin', 'system_admin'],
    children: [
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
      { name: 'User Management', href: '/admin/system-users', icon: UserCheck, roles: ['system_admin'] },
      { name: 'School Users', href: '/admin/school-users', icon: UserCheck, roles: ['school_admin'] },
      { name: 'District Users', href: '/admin/district-users', icon: UserCheck, roles: ['district_admin'] },
      { name: 'Districts', href: '/admin/districts', icon: Building2, roles: ['system_admin'] },
      { name: 'Schools', href: '/admin/schools', icon: School, roles: ['system_admin', 'district_admin'] },
      { name: 'Licenses', href: '/admin/licenses', icon: FileText },
      { name: 'Moderation', href: '/admin/moderation', icon: Shield },
    ]
  },
  {
    name: 'Tools',
    icon: Bot,
    roles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin'],
    children: [
      { name: 'AI Assistant', href: '/ai-assistant', icon: Bot },
      { name: 'School Directory', href: '/school-directory', icon: School },
      { name: 'Notifications', href: '/notifications', icon: Bell }
    ]
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['parent', 'teacher', 'school_admin', 'district_admin', 'system_admin']
  }
];

const CommandPalette = ({ isOpen, onClose }) => {
  const [search, setSearch] = useState('');
  const { user } = useStore();

  const getAllNavigationItems = (items) => {
    let allItems = [];
    
    items.forEach(item => {
      if (item.roles && !item.roles.includes(user?.user_type || 'parent')) return;
      
      if (item.href) {
        allItems.push(item);
      }
      
      if (item.children) {
        allItems = allItems.concat(getAllNavigationItems(item.children));
      }
    });
    
    return allItems;
  };

  const allItems = getAllNavigationItems(navigationStructure);
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
                to={createPageUrl(item.href?.replace('/', '') || '')}
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

  const toggleSection = (sectionName) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  const isCurrentPath = (href) => {
    return location.pathname === href || location.pathname === createPageUrl(href.replace('/', ''));
  };

  const hasRoleAccess = (roles) => {
    if (!roles || roles.length === 0) return true;
    return roles.includes(user?.user_type || 'parent');
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
          const isCurrent = section.href ? isCurrentPath(section.href) : false;

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
                <Link to={createPageUrl(section.href?.replace('/', '') || '')}>
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
                      
                      const isChildCurrent = child.href ? isCurrentPath(child.href) : false;
                      
                      return (
                        <Link key={child.name} to={createPageUrl(child.href?.replace('/', '') || '')}>
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