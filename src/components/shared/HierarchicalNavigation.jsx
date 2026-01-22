import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useStore } from '@/components/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getNavigationForRole } from '@/config/navigation';
import CommandPalette from '@/components/shared/CommandPalette';

export default function HierarchicalNavigation({ className }) {
  const [expandedSections, setExpandedSections] = useState(new Set(['Learning', 'Community']));
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const { user } = useStore();
  const location = useLocation();
  const userRole = user?.user_type || 'parent';

  const navigationStructure = useMemo(() => getNavigationForRole(userRole), [userRole]);

  const toggleSection = (sectionName) => {
    const next = new Set(expandedSections);
    if (next.has(sectionName)) next.delete(sectionName);
    else next.add(sectionName);
    setExpandedSections(next);
  };

  const isCurrentPath = (page) => {
    const targetPath = createPageUrl(page || '');
    return location.pathname === targetPath;
  };

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = (event.target?.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || event.target?.isContentEditable) return;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <nav className={`space-y-2 ${className || ''}`}>
        {/* Command Palette Trigger */}
        <Button
          variant="outline"
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full justify-start text-gray-500 border-dashed"
        >
          <Command className="w-4 h-4 mr-2" />
          Quick search{'\u2026'}
          <div className="ml-auto flex gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{'\u2318'}</kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">K</kbd>
          </div>
        </Button>

        {navigationStructure.map((section) => {
          const hasChildren = section.children && section.children.length > 0;
          const isExpanded = expandedSections.has(section.name);
          const isCurrent = section.page ? isCurrentPath(section.page) : false;

          return (
            <div key={section.name}>
              {hasChildren ? (
                <Button
                  variant="ghost"
                  onClick={() => toggleSection(section.name)}
                  className={`w-full justify-start ${
                    isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-gray-900'
                  }`}
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
                    className={`w-full justify-start ${
                      isCurrent ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-gray-900'
                    }`}
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
                      const isChildCurrent = child.page ? isCurrentPath(child.page) : false;

                      return (
                        <Link key={child.name} to={createPageUrl(child.page || '')}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`w-full justify-start ${
                              isChildCurrent
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
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

      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
    </>
  );
}
