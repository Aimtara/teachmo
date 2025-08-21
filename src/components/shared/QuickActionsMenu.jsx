import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Calendar, 
  Lightbulb, 
  Bot, 
  Users, 
  BookOpen, 
  Camera,
  MessageCircle,
  Target,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useNotifications } from "./SmartNotifications";

export default function QuickActionsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { addNotification } = useNotifications();

  const quickActions = [
    {
      icon: Lightbulb,
      label: "Find Activity",
      color: "bg-purple-500",
      link: createPageUrl("UnifiedDiscover"),
      description: "Discover new activities for your children"
    },
    {
      icon: Calendar,
      label: "Schedule",
      color: "bg-blue-500", 
      link: createPageUrl("Calendar"),
      description: "Plan family time"
    },
    {
      icon: Bot,
      label: "AI Coach",
      color: "bg-green-500",
      link: createPageUrl("AIAssistant"),
      description: "Get parenting guidance"
    },
    {
      icon: Camera,
      label: "Capture Moment",
      color: "bg-pink-500",
      action: () => captureMemory(),
      description: "Save a special family moment"
    },
    {
      icon: Target,
      label: "Quick Goal",
      color: "bg-orange-500",
      action: () => setQuickGoal(),
      description: "Set a daily family goal"
    },
    {
      icon: MessageCircle,
      label: "Community",
      color: "bg-indigo-500",
      link: createPageUrl("UnifiedCommunity"),
      description: "Connect with other parents"
    },
    {
      icon: BookOpen,
      label: "Resources",
      color: "bg-teal-500",
      link: createPageUrl("Library"),
      description: "Browse parenting tips"
    },
    {
      icon: Settings,
      label: "Settings",
      color: "bg-gray-500",
      link: createPageUrl("Settings"),
      description: "Manage your preferences"
    }
  ];

  const captureMemory = () => {
    addNotification({
      title: "Memory Captured!",
      message: "Your special moment has been saved to your family journal.",
      type: "success"
    });
    setIsOpen(false);
  };

  const setQuickGoal = () => {
    addNotification({
      title: "Daily Goal Set!",
      message: "Spend 30 minutes of screen-free time together today.",
      type: "success",
      actions: [
        {
          label: "Plan Now",
          onClick: () => window.location.href = createPageUrl("Calendar")
        }
      ]
    });
    setIsOpen(false);
  };

  // Position the menu based on screen size and position
  useEffect(() => {
    const updatePosition = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      setPosition({
        x: screenWidth > 768 ? screenWidth - 80 : screenWidth - 70,
        y: screenHeight > 600 ? screenHeight - 80 : screenHeight - 70
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  return (
    <>
      {/* Main FAB */}
      <motion.div
        className="fixed z-50"
        style={{ right: '20px', bottom: '20px' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl transition-all duration-300"
          style={{
            background: isOpen 
              ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
              : 'linear-gradient(135deg, #8b5cf6, #ec4899)'
          }}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <Plus className="w-6 h-6" />
          </motion.div>
        </Button>
      </motion.div>

      {/* Action Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          >
            <div className="absolute" style={{ right: '90px', bottom: '20px' }}>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative"
              >
                <Card className="p-4 shadow-xl border-0 bg-white/95 backdrop-blur-md">
                  <div className="grid grid-cols-2 gap-3 w-80">
                    {quickActions.map((action, index) => (
                      <motion.div
                        key={action.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        {action.link ? (
                          <Link to={action.link} onClick={() => setIsOpen(false)}>
                            <ActionButton action={action} />
                          </Link>
                        ) : (
                          <button onClick={action.action} className="w-full">
                            <ActionButton action={action} />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const ActionButton = ({ action }) => (
  <div className="group flex flex-col items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 cursor-pointer">
    <div className={`w-10 h-10 rounded-full ${action.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-200`}>
      <action.icon className="w-5 h-5 text-white" />
    </div>
    <span className="text-sm font-medium text-gray-900 text-center">{action.label}</span>
    <span className="text-xs text-gray-500 text-center mt-1 leading-tight">{action.description}</span>
  </div>
);