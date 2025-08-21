import PropTypes from 'prop-types';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minimize2, Maximize2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function WidgetContainer({ 
  title, 
  icon: Icon, 
  children, 
  defaultMinimized = false,
  showSettings = false,
  onSettings,
  className = "",
  size = "default" // "compact", "default", "large"
}) {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);

  const sizeClasses = {
    compact: "w-72 max-h-80",
    default: "w-80 max-h-96",
    large: "w-96 max-h-[500px]"
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      className={`fixed z-50 ${isMinimized ? 'w-48 h-10' : sizeClasses[size]} ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden h-full">
        {/* Widget Header */}
        <div 
          className={`bg-gradient-to-r from-blue-500 to-indigo-500 text-white cursor-move select-none ${isMinimized ? 'p-2' : 'p-3'}`}
          style={{background: 'linear-gradient(135deg, var(--teachmo-sage), var(--teachmo-sage-light))'}}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {Icon && <Icon className={`${isMinimized ? 'w-4 h-4' : 'w-5 h-5'}`} />}
              <h3 className={`font-semibold ${isMinimized ? 'text-xs' : 'text-sm'}`}>
                {isMinimized ? 'Teachmo' : title}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              {showSettings && !isMinimized && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSettings}
                  className="h-6 w-6 text-white hover:bg-white/20"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className={`text-white hover:bg-white/20 ${isMinimized ? 'h-5 w-5' : 'h-6 w-6'}`}
              >
                {isMinimized ? 
                  <Maximize2 className="w-3 h-3" /> : 
                  <Minimize2 className="w-4 h-4" />
                }
              </Button>
            </div>
          </div>
        </div>

        {/* Widget Content */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden flex-1"
            >
              <div className="p-3 overflow-y-auto" style={{ maxHeight: 'calc(100% - 60px)' }}>
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

WidgetContainer.propTypes = {
  title: PropTypes.string,
  icon: PropTypes.elementType,
  children: PropTypes.node,
  defaultMinimized: PropTypes.bool,
  showSettings: PropTypes.bool,
  onSettings: PropTypes.func,
  className: PropTypes.string,
  size: PropTypes.oneOf(['compact', 'default', 'large']),
};
