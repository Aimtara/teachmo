import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar,
  Clock, 
  Users,
  Zap,
  Target,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';

// Optimization roadmap based on external audit findings
const OPTIMIZATION_ROADMAP = {
  immediate: {
    title: "Critical Fixes (0-2 weeks)",
    description: "High-impact, low-effort improvements that address immediate usability issues",
    timeline: "Sprint 1",
    items: [
      {
        id: 'skeleton-loaders',
        title: 'Implement Universal Skeleton Loading',
        description: 'Add skeleton loaders to all data-loading components',
        impact: 'High',
        effort: 'Medium',
        components: ['Dashboard', 'Messages', 'Library', 'Progress'],
        acceptance: 'All loading states show skeleton instead of blank screens',
        status: 'in-progress'
      },
      {
        id: 'error-messages',
        title: 'Contextual Error Messaging',
        description: 'Replace generic errors with actionable, contextual messages',
        impact: 'High', 
        effort: 'Medium',
        components: ['API calls', 'Forms', 'Authentication'],
        acceptance: 'Users see specific error messages with retry options',
        status: 'in-progress'
      },
      {
        id: 'contrast-fixes',
        title: 'Color Contrast Compliance',
        description: 'Fix all color contrast issues to meet WCAG AA standards',
        impact: 'High',
        effort: 'Low',
        components: ['All UI elements'],
        acceptance: 'All text meets 4.5:1 contrast ratio minimum',
        status: 'not-started'
      },
      {
        id: 'confirmation-modals',
        title: 'Critical Action Confirmations',
        description: 'Add confirmation dialogs for destructive actions',
        impact: 'High',
        effort: 'Low',
        components: ['Delete actions', 'Emergency features'],
        acceptance: 'Users must confirm before destructive actions',
        status: 'not-started'
      }
    ]
  },
  short_term: {
    title: "High Priority (2-6 weeks)", 
    description: "Significant improvements to navigation, onboarding, and mobile experience",
    timeline: "Sprint 2-3",
    items: [
      {
        id: 'role-navigation',
        title: 'Enhanced Role-Based Navigation',
        description: 'Improve navigation clarity with better role separation',
        impact: 'High',
        effort: 'High', 
        components: ['Layout', 'Navigation', 'Dashboard'],
        acceptance: 'Users only see relevant navigation items for their role',
        status: 'completed'
      },
      {
        id: 'guided-tours',
        title: 'Interactive Guided Tours',
        description: 'Create role-specific onboarding tours for new users',
        impact: 'High',
        effort: 'High',
        components: ['Onboarding', 'Tutorial system'],
        acceptance: 'New users complete guided tour on first login',
        status: 'in-progress'
      },
      {
        id: 'global-search',
        title: 'Enhanced Global Search',
        description: 'Improve search functionality across all content types',
        impact: 'Medium-High',
        effort: 'Medium',
        components: ['Search', 'Navigation'],
        acceptance: 'Users can quickly find any content via global search',
        status: 'in-progress'
      },
      {
        id: 'mobile-optimization',
        title: 'Mobile-First Responsive Design',
        description: 'Optimize all key flows for mobile devices',
        impact: 'High',
        effort: 'High',
        components: ['Calendar', 'Forms', 'Modals', 'Navigation'],
        acceptance: 'All features work smoothly on mobile devices',
        status: 'in-progress'
      }
    ]
  },
  medium_term: {
    title: "Design System & Polish (6-12 weeks)",
    description: "Comprehensive design system implementation and content improvements",
    timeline: "Sprint 4-6",
    items: [
      {
        id: 'design-system',
        title: 'Unified Design System',
        description: 'Create and enforce comprehensive design system',
        impact: 'Medium-High',
        effort: 'High',
        components: ['All components'],
        acceptance: 'All components follow consistent design patterns',
        status: 'in-progress'
      },
      {
        id: 'content-strategy',
        title: 'Content & Microcopy Standardization', 
        description: 'Create unified glossary and improve all content',
        impact: 'Medium',
        effort: 'Medium',
        components: ['All text content'],
        acceptance: 'Consistent terminology and helpful microcopy throughout',
        status: 'not-started'
      },
      {
        id: 'notification-templates',
        title: 'Rich Notification System',
        description: 'Implement contextual, template-based notifications',
        impact: 'Medium',
        effort: 'Medium',
        components: ['Notifications', 'Messages'],
        acceptance: 'Notifications include relevant context and actions',
        status: 'not-started'
      },
      {
        id: 'help-system',
        title: 'Contextual Help & Support',
        description: 'Add inline help, tooltips, and support chat',
        impact: 'Medium',
        effort: 'High',
        components: ['All pages'],
        acceptance: 'Users can get help contextually without leaving their task',
        status: 'not-started'
      }
    ]
  },
  long_term: {
    title: "Advanced Features (3-6 months)",
    description: "Comprehensive accessibility, testing, and advanced UX features",
    timeline: "Future Sprints",
    items: [
      {
        id: 'accessibility-automation',
        title: 'Automated Accessibility Testing',
        description: 'Integrate accessibility testing into CI/CD pipeline',
        impact: 'High',
        effort: 'High',
        components: ['Development workflow'],
        acceptance: 'All code changes are automatically tested for accessibility',
        status: 'not-started'
      },
      {
        id: 'user-research',
        title: 'User Research & Testing Program',
        description: 'Establish ongoing user research and A/B testing',
        impact: 'High',
        effort: 'High', 
        components: ['Research infrastructure'],
        acceptance: 'Regular user feedback informs product decisions',
        status: 'not-started'
      },
      {
        id: 'advanced-interactions',
        title: 'Advanced UI Interactions',
        description: 'Implement advanced features like drag-and-drop, gestures',
        impact: 'Medium',
        effort: 'High',
        components: ['Interactive features'],
        acceptance: 'Rich interactive features enhance user productivity',
        status: 'not-started'
      }
    ]
  }
};

const RoadmapCard = ({ phase, items }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEffortIcon = (effort) => {
    switch (effort) {
      case 'High': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'Medium': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <Zap className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">{phase.title}</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{phase.description}</p>
          </div>
          <Badge variant="outline">{phase.timeline}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {getEffortIcon(item.effort)}
                <Badge className={getStatusColor(item.status)}>
                  {item.status.replace('-', ' ')}
                </Badge>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mt-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">COMPONENTS</p>
                <div className="flex flex-wrap gap-1">
                  {item.components.slice(0, 3).map((component) => (
                    <Badge key={component} variant="secondary" className="text-xs">
                      {component}
                    </Badge>
                  ))}
                  {item.components.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{item.components.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Badge variant="outline" className="text-xs">
                  Impact: {item.impact}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Effort: {item.effort}
                </Badge>
              </div>
            </div>
            
            <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
              <strong>Success criteria:</strong> {item.acceptance}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default function UXOptimizationPlan() {
  const [activePhase, setActivePhase] = useState('immediate');
  
  const getAllItems = () => {
    return Object.values(OPTIMIZATION_ROADMAP).flatMap(phase => phase.items);
  };
  
  const getStatusCounts = () => {
    const allItems = getAllItems();
    return {
      completed: allItems.filter(item => item.status === 'completed').length,
      inProgress: allItems.filter(item => item.status === 'in-progress').length,
      notStarted: allItems.filter(item => item.status === 'not-started').length,
      total: allItems.length
    };
  };

  const statusCounts = getStatusCounts();
  const overallProgress = Math.round((statusCounts.completed + statusCounts.inProgress * 0.5) / statusCounts.total * 100);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">UX Optimization Roadmap</h1>
          <p className="text-gray-600 mt-1">
            Strategic plan to address UX audit findings and improve user experience
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{overallProgress}%</div>
          <div className="text-sm text-gray-600">Overall Progress</div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.inProgress}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-2xl font-bold text-gray-600">{statusCounts.notStarted}</p>
                <p className="text-sm text-gray-600">Planned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.total}</p>
                <p className="text-sm text-gray-600">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phase Tabs */}
      <Tabs value={activePhase} onValueChange={setActivePhase}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="immediate">Critical</TabsTrigger>
          <TabsTrigger value="short_term">High Priority</TabsTrigger>
          <TabsTrigger value="medium_term">Design System</TabsTrigger>
          <TabsTrigger value="long_term">Advanced</TabsTrigger>
        </TabsList>
        
        {Object.entries(OPTIMIZATION_ROADMAP).map(([key, phase]) => (
          <TabsContent key={key} value={key}>
            <RoadmapCard phase={phase} items={phase.items} />
          </TabsContent>
        ))}
      </Tabs>

      {/* Implementation Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Implementation Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Success Metrics</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• User task completion rate greater than 90%</li>
                <li>• Page load time less than 3 seconds</li>
                <li>• Mobile usability score greater than 95</li>
                <li>• WCAG 2.1 AA compliance: 100%</li>
                <li>• User satisfaction score greater than 4.5/5</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Quality Assurance</h4>
              <ul className="text-sm space-y-1 text-gray-700">
                <li>• Automated accessibility testing</li>
                <li>• Cross-browser compatibility testing</li>
                <li>• Mobile device testing on real devices</li>
                <li>• User acceptance testing for each feature</li>
                <li>• Performance monitoring and optimization</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}