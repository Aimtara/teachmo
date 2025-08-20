import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Calendar, Search, Bot } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function QuickActionBar({ user, children = [] }) {
  const getQuickActions = () => {
    const actions = [];

    if (user?.role === 'parent') {
      actions.push(
        {
          icon: Plus,
          label: "Add Activity",
          href: createPageUrl("UnifiedDiscover"),
          color: "bg-green-500 hover:bg-green-600",
          description: "Find something fun to do"
        },
        {
          icon: MessageSquare,
          label: "Message Teachers",
          href: createPageUrl("Messages"),
          color: "bg-blue-500 hover:bg-blue-600",
          description: "Connect with school"
        },
        {
          icon: Bot,
          label: "AI Coach",
          href: createPageUrl("AIAssistant"),
          color: "bg-purple-500 hover:bg-purple-600",
          description: "Get parenting guidance"
        },
        {
          icon: Calendar,
          label: "Schedule",
          href: createPageUrl("Calendar"),
          color: "bg-orange-500 hover:bg-orange-600",
          description: "Plan your week"
        }
      );
    } else if (user?.role === 'teacher') {
      actions.push(
        {
          icon: MessageSquare,
          label: "Message Parents",
          href: createPageUrl("TeacherMessages"),
          color: "bg-blue-500 hover:bg-blue-600",
          description: "Connect with families"
        },
        {
          icon: Plus,
          label: "Create Assignment",
          href: createPageUrl("TeacherClasses"),
          color: "bg-green-500 hover:bg-green-600",
          description: "Add new work"
        }
      );
    }

    return actions.slice(0, 4); // Max 4 actions
  };

  const actions = getQuickActions();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((action, index) => {
        const IconComponent = action.icon;
        
        return (
          <motion.div
            key={action.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link to={action.href}>
              <Button
                className={`w-full h-auto p-4 flex flex-col items-center gap-2 ${action.color} text-white hover:scale-105 transition-all duration-200 shadow-lg`}
              >
                <IconComponent className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-semibold text-sm">{action.label}</div>
                  <div className="text-xs opacity-90 hidden sm:block">
                    {action.description}
                  </div>
                </div>
              </Button>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}