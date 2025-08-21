import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  MessageCircle, 
  Activity, 
  BookOpen, 
  Award, 
  Plus,
  Search,
  FileText,
  Bell,
  Target,
  Sparkles,
  X,
  School
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const getEmptyStateConfig = (context, userType) => {
  const configs = {
    // Dashboard contexts
    'no-children': {
      icon: Users,
      title: "Welcome to Teachmo!",
      description: "Get started by adding your first child profile to receive personalized activities and parenting guidance.",
      primaryAction: {
        label: "Add Your First Child",
        href: createPageUrl('ChildSetup'),
        icon: Plus
      },
      secondaryAction: {
        label: "Explore Activities",
        href: createPageUrl('UnifiedDiscover')
      }
    },
    
    'no-planned-activities': {
      icon: Calendar,
      title: "No activities planned yet",
      description: "Discover engaging activities for your children and add them to your calendar.",
      primaryAction: {
        label: "Discover Activities",
        href: createPageUrl('UnifiedDiscover', { tab: 'activities' }),
        icon: Search
      },
      secondaryAction: {
        label: "View Calendar",
        href: createPageUrl('Calendar')
      }
    },

    'no-completed-activities': {
      icon: Activity,
      title: "Ready to start your journey?",
      description: "Complete your first activity to begin tracking progress and earning achievements.",
      primaryAction: {
        label: "Find Activities",
        href: createPageUrl('UnifiedDiscover', { tab: 'activities' }),
        icon: Search
      }
    },

    // Messages contexts
    'no-conversations': {
      icon: MessageCircle,
      title: "No conversations yet",
      description: userType === 'teacher' 
        ? "Start conversations with parents to support student learning at home."
        : "Connect with your children's teachers or other parents in your community.",
      primaryAction: {
        label: userType === 'teacher' ? "Browse Students" : "Discover Community",
        href: userType === 'teacher' 
          ? createPageUrl('TeacherClasses') 
          : createPageUrl('UnifiedCommunity'),
        icon: Users
      }
    },

    'no-messages-in-conversation': {
      icon: MessageCircle,
      title: "Start the conversation",
      description: "Send your first message to begin this conversation.",
      primaryAction: {
        label: "Send Message",
        action: 'focusInput',
        icon: MessageCircle
      }
    },

    // Progress contexts
    'no-achievements': {
      icon: Award,
      title: "Your achievements await!",
      description: "Complete activities, maintain streaks, and engage with the community to earn your first badges.",
      primaryAction: {
        label: "Start an Activity",
        href: createPageUrl('UnifiedDiscover', { tab: 'activities' }),
        icon: Activity
      },
      secondaryAction: {
        label: "View All Achievements",
        href: createPageUrl('Achievements')
      }
    },

    'no-journal-entries': {
      icon: BookOpen,
      title: "Start your parenting journal",
      description: "Document your journey, reflect on milestones, and track your family's growth.",
      primaryAction: {
        label: "Write First Entry",
        action: 'createEntry',
        icon: Plus
      }
    },

    // Library/Content contexts
    'no-bookmarks': {
      icon: BookOpen,
      title: "No saved resources yet",
      description: "Bookmark helpful articles, activities, and resources for quick access later.",
      primaryAction: {
        label: "Browse Library",
        href: createPageUrl('UnifiedDiscover', { tab: 'library' }),
        icon: Search
      }
    },

    'no-search-results': {
      icon: Search,
      title: "No results found",
      description: "Try adjusting your search terms or filters to find what you're looking for.",
      primaryAction: {
        label: "Clear Filters",
        action: 'clearFilters',
        icon: X
      },
      secondaryAction: {
        label: "Browse All Content",
        href: createPageUrl('UnifiedDiscover')
      }
    },

    // Calendar contexts
    'no-calendar-events': {
      icon: Calendar,
      title: "Your calendar is empty",
      description: "Schedule activities, set reminders, and plan your family's week ahead.",
      primaryAction: {
        label: "Add Event",
        action: 'openEventModal',
        icon: Plus
      },
      secondaryAction: {
        label: "Find Activities to Schedule",
        href: createPageUrl('UnifiedDiscover', { tab: 'activities' })
      }
    },

    // Notifications contexts
    'no-notifications': {
      icon: Bell,
      title: "All caught up!",
      description: "You have no new notifications. We'll let you know when there's something new.",
      illustration: "🎉"
    },

    // Admin contexts
    'no-users': {
      icon: Users,
      title: "No users found",
      description: "Start by inviting teachers and parents to join your organization.",
      primaryAction: {
        label: "Invite Users",
        action: 'openInviteModal',
        icon: Plus
      }
    },

    'no-schools': {
      icon: School,
      title: "No schools in your district",
      description: "Add schools to your district to start managing educational content and users.",
      primaryAction: {
        label: "Add School",
        action: 'openSchoolModal',
        icon: Plus
      }
    },

    // Community contexts
    'no-posts': {
      icon: MessageCircle,
      title: "Start the conversation",
      description: "Be the first to share a post and get the community discussion going.",
      primaryAction: {
        label: "Create Post",
        action: 'openPostModal',
        icon: Plus
      }
    },

    'no-pods': {
      icon: Users,
      title: "No pods to show",
      description: "Join existing pods or create your own to connect with like-minded parents.",
      primaryAction: {
        label: "Create Pod",
        action: 'openPodModal',
        icon: Plus
      },
      secondaryAction: {
        label: "Discover Pods",
        href: createPageUrl('UnifiedCommunity', { tab: 'pods' })
      }
    },

    // Default fallback
    'default': {
      icon: Sparkles,
      title: "Nothing here yet",
      description: "This area will populate as you use Teachmo more.",
      primaryAction: {
        label: "Explore Teachmo",
        href: createPageUrl('UnifiedDiscover'),
        icon: Search
      }
    }
  };

  return configs[context] || configs['default'];
};

export default function UniversalEmptyState({ 
  context = 'default', 
  userType = 'parent',
  onAction,
  className = "",
  size = 'default' // 'compact', 'default', 'large'
}) {
  const config = getEmptyStateConfig(context, userType);
  const Icon = config.icon;

  const handlePrimaryAction = () => {
    if (config.primaryAction.action && onAction) {
      onAction(config.primaryAction.action);
    }
  };

  const handleSecondaryAction = () => {
    if (config.secondaryAction?.action && onAction) {
      onAction(config.secondaryAction.action);
    }
  };

  const sizeClasses = {
    compact: "p-6",
    default: "p-8",
    large: "p-12"
  };

  const iconSizes = {
    compact: "w-12 h-12",
    default: "w-16 h-16", 
    large: "w-20 h-20"
  };

  const titleSizes = {
    compact: "text-lg",
    default: "text-xl",
    large: "text-2xl"
  };

  return (
    <Card className={`${className}`}>
      <CardContent className={`text-center ${sizeClasses[size]}`}>
        <div className="space-y-4">
          {/* Illustration or Icon */}
          {config.illustration ? (
            <div className="text-6xl">{config.illustration}</div>
          ) : (
            <div className="mx-auto text-gray-400">
              <Icon className={`mx-auto ${iconSizes[size]}`} />
            </div>
          )}

          {/* Title and Description */}
          <div className="space-y-2">
            <h3 className={`font-semibold text-gray-900 ${titleSizes[size]}`}>
              {config.title}
            </h3>
            <p className={`text-gray-600 max-w-md mx-auto ${size === 'compact' ? 'text-sm' : ''}`}>
              {config.description}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
            {config.primaryAction && (
              config.primaryAction.href ? (
                <Link to={config.primaryAction.href}>
                  <Button className="w-full sm:w-auto">
                    {config.primaryAction.icon && (
                      <config.primaryAction.icon className="w-4 h-4 mr-2" />
                    )}
                    {config.primaryAction.label}
                  </Button>
                </Link>
              ) : (
                <Button onClick={handlePrimaryAction} className="w-full sm:w-auto">
                  {config.primaryAction.icon && (
                    <config.primaryAction.icon className="w-4 h-4 mr-2" />
                  )}
                  {config.primaryAction.label}
                </Button>
              )
            )}

            {config.secondaryAction && (
              config.secondaryAction.href ? (
                <Link to={config.secondaryAction.href}>
                  <Button variant="outline" className="w-full sm:w-auto">
                    {config.secondaryAction.label}
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" onClick={handleSecondaryAction} className="w-full sm:w-auto">
                  {config.secondaryAction.label}
                </Button>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}