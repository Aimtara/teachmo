import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Calendar, 
  MessageSquare, 
  BookOpen, 
  Users,
  Plus,
  ArrowRight,
  Heart
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const EmptyState = ({ 
  icon: Icon, 
  title, 
  description, 
  actions = [], 
  className = "",
  illustration 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`text-center py-12 px-6 ${className}`}
  >
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm max-w-md mx-auto">
      <CardContent className="p-8">
        {illustration ? (
          <div className="mb-6">{illustration}</div>
        ) : (
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <Icon className="w-8 h-8 text-gray-400" />
          </div>
        )}
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3">
          {title}
        </h3>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          {description}
        </p>
        
        <div className="space-y-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={action.onClick}
              className={`w-full gap-2 ${action.variant === 'outline' ? 'border-2' : ''}`}
              variant={action.variant || 'default'}
              style={action.variant !== 'outline' ? {backgroundColor: 'var(--teachmo-sage)'} : {}}
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
              {action.showArrow && <ArrowRight className="w-4 h-4" />}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export const EmptyDashboard = ({ onAddChild }) => (
  <EmptyState
    icon={Heart}
    title="Welcome to Teachmo!"
    description="Let's start by setting up your family profile. Once you add your children, we'll recommend personalized activities and tips."
    actions={[
      {
        label: "Add Your First Child",
        icon: Plus,
        onClick: onAddChild,
        showArrow: true
      }
    ]}
    illustration={
      <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
        <Heart className="w-12 h-12 text-white" />
      </div>
    }
  />
);

export const EmptyActivities = ({ hasChildren, onDiscover, onAddChild }) => (
  <EmptyState
    icon={Sparkles}
    title={hasChildren ? "Ready for Fun?" : "Let's Get Started!"}
    description={
      hasChildren 
        ? "No activities planned yet. Let's find the perfect ones for your family!"
        : "Add your children's profiles first, then we'll suggest amazing activities tailored just for them."
    }
    actions={hasChildren ? [
      {
        label: "Discover Activities",
        icon: Sparkles,
        onClick: onDiscover,
        showArrow: true
      },
      {
        label: "Browse Calendar",
        icon: Calendar,
        onClick: () => window.location.href = createPageUrl("Calendar"),
        variant: "outline"
      }
    ] : [
      {
        label: "Add Child Profile",
        icon: Users,
        onClick: onAddChild,
        showArrow: true
      }
    ]}
  />
);

export const EmptyCalendar = ({ onPlanActivity }) => (
  <EmptyState
    icon={Calendar}
    title="Your Calendar is Empty"
    description="Start building a routine by planning your first activity. Consistency is the key to meaningful family time."
    actions={[
      {
        label: "Plan Your First Activity",
        icon: Plus,
        onClick: onPlanActivity,
        showArrow: true
      },
      {
        label: "Browse Activity Ideas",
        icon: Sparkles,
        onClick: () => window.location.href = createPageUrl("UnifiedDiscover"),
        variant: "outline"
      }
    ]}
  />
);

export const EmptyMessages = ({ userRole }) => (
  <EmptyState
    icon={MessageSquare}
    title="No Messages Yet"
    description={
      userRole === 'parent' 
        ? "Connect with your child's teachers to stay informed about their progress and school activities."
        : "Start conversations with parents to build stronger school-home partnerships."
    }
    actions={[
      {
        label: userRole === 'parent' ? "Find Teachers" : "Browse Classes",
        icon: Users,
        onClick: () => window.location.href = createPageUrl(userRole === 'parent' ? "Messages" : "TeacherClasses"),
        showArrow: true
      }
    ]}
  />
);

export const EmptyLibrary = ({ onExplore }) => (
  <EmptyState
    icon={BookOpen}
    title="Build Your Resource Library"
    description="Bookmark helpful articles, guides, and tips as you discover them. Create your personal parenting resource collection."
    actions={[
      {
        label: "Explore Resources",
        icon: BookOpen,
        onClick: onExplore,
        showArrow: true
      }
    ]}
  />
);

export const EmptySearchResults = ({ query, onClearSearch, onTryAgain }) => (
  <EmptyState
    icon={Sparkles}
    title="No Results Found"
    description={`We couldn't find anything matching "${query}". Try different keywords or browse our categories.`}
    actions={[
      {
        label: "Clear Search",
        icon: Plus,
        onClick: onClearSearch,
        variant: "outline"
      },
      {
        label: "Browse All Activities",
        icon: Sparkles,
        onClick: onTryAgain,
        showArrow: true
      }
    ]}
    className="py-8"
  />
);

export default EmptyState;