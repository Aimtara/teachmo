import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Search, Menu, X, Calendar, Bot, MessageSquare, Bell, BookOpen, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { getMobileNavigation, PUBLIC_PAGES } from '@/config/navigation';

// Floating Action Button for quick actions
function FloatingActionButton({ userRole, unreadCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const quickActions = {
    parent: [
      { icon: Plus, label: 'Add Activity', path: 'UnifiedDiscover' },
      { icon: Calendar, label: 'Schedule Event', path: 'Calendar' },
      { icon: Bot, label: 'Ask AI Coach', path: 'AIAssistant' }
    ],
    teacher: [
      { icon: MessageSquare, label: 'Message Parents', path: 'TeacherMessages' },
      { icon: Bell, label: 'Send Announcement', path: 'Announcements' },
      { icon: BookOpen, label: 'View Classes', path: 'TeacherClasses' }
    ]
  };

  const actions = quickActions[userRole] || quickActions.parent;

  return (
    <div className="fixed bottom-20 right-4 z-40" aria-live="polite">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-16 right-0 space-y-2"
            role="menu"
            aria-label="Quick actions"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.path}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={createPageUrl(action.path)}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 bg-white rounded-full shadow-lg px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                  role="menuitem"
                >
                  <action.icon className="w-5 h-5" />
                  <span className="text-sm font-medium whitespace-nowrap">{action.label}</span>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-lg relative bg-[var(--teachmo-sage)] text-white hover:bg-[var(--teachmo-sage)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700"
        aria-label={isOpen ? 'Hide quick actions' : 'Show quick actions'}
        aria-expanded={isOpen}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs bg-red-500">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}

// Bottom navigation bar
function BottomNavigation({ userRole, currentPath }) {
  const navItems = getMobileNavigation(userRole);
  const primaryItems = navItems.filter(item => item.isPrimary).slice(0, 4);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-30 safe-area-pb">
      <nav className="grid grid-cols-4 h-16">
        {primaryItems.map((item) => {
          const isActive = currentPath === createPageUrl(item.page);

          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
                isActive
                  ? 'text-white bg-[var(--teachmo-sage)]'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <motion.div
                whileTap={{ scale: 0.95 }}
                className="flex flex-col items-center gap-1"
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium truncate max-w-[60px]">
                  {item.label || item.name}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

// Slide-out menu for secondary navigation
function SlideOutMenu({ userRole, isOpen, onClose }) {
  const navItems = getMobileNavigation(userRole);
  const secondaryItems = navItems.filter(item => !item.isPrimary);
  const location = useLocation();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0">
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">More Options</h2>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {secondaryItems.map((item) => {
                const isActive = location.pathname === createPageUrl(item.page);

                return (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    onClick={onClose}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 ${
                      isActive
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label || item.name}</span>
                  </Link>
                );
              })}
              
              <div className="border-t border-gray-200 pt-4 mt-6">
                <Link
                  to={createPageUrl('Settings')}
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
                >
                  <Settings className="w-5 h-5" />
                  <span className="font-medium">Settings</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Mobile header with hamburger menu
function MobileHeader({ userRole, onMenuOpen, currentPageTitle, isMenuOpen = false }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-gray-100 z-50 h-14">
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMenuOpen}
            className="p-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">T</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">Teachmo</h1>
              {currentPageTitle && (
                <p className="text-xs text-gray-500 truncate max-w-[120px]">
                  {currentPageTitle}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
            aria-label="Search"
            aria-pressed={isSearchOpen}
            aria-expanded={isSearchOpen}
          >
            <Search className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="p-2 relative focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full p-0 text-xs bg-red-500">
              3
            </Badge>
          </Button>
        </div>
      </div>
      
      {/* Expandable search bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-100 px-4 py-3 bg-white"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search everything..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// Main mobile navigation component
export default function MobileNavigation({
  userRole,
  currentPageTitle,
  unreadMessageCount = 0,
  currentPath
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const activePath = currentPath || location.pathname;

  // Hide navigation on certain pages
  const publicRoutes = PUBLIC_PAGES.map((page) => createPageUrl(page).toLowerCase());
  const normalizedPath = location.pathname.toLowerCase();
  const hideNavigation = [...publicRoutes, '/welcome', '/login'].includes(normalizedPath);

  if (hideNavigation) return null;

  return (
    <div className="md:hidden">
      <MobileHeader
        userRole={userRole}
        currentPageTitle={currentPageTitle}
        onMenuOpen={() => setIsMenuOpen((open) => !open)}
        isMenuOpen={isMenuOpen}
      />
      
      <BottomNavigation
        userRole={userRole}
        currentPath={activePath}
      />
      
      <FloatingActionButton
        userRole={userRole}
        unreadCount={unreadMessageCount}
      />
      
      <SlideOutMenu
        userRole={userRole}
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />
    </div>
  );
}

// Hook for mobile navigation state
export function useMobileNavigation() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  return { isVisible };
}
