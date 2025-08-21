import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Lightbulb,
  Target
} from 'lucide-react';

// Quick wins implemented based on UX audit
const IMPLEMENTED_IMPROVEMENTS = [
  {
    id: 'role-navigation',
    title: 'Role-Based Navigation',
    status: 'completed',
    impact: 'High',
    description: 'Clear separation of navigation based on user roles',
    before: 'Mixed navigation showing all features to all users',
    after: 'Role-specific navigation in Layout.js with progressive disclosure',
    component: 'Layout.js'
  },
  {
    id: 'skeleton-loading',
    title: 'Skeleton Loading States',  
    status: 'in-progress',
    impact: 'High',
    description: 'Consistent loading states across all components',
    before: 'Blank screens during data loading',
    after: 'DashboardSkeleton and other skeleton components implemented',
    component: 'components/shared/ImprovedSkeletons.jsx'
  },
  {
    id: 'error-handling',
    title: 'Enhanced Error Handling',
    status: 'in-progress', 
    impact: 'High',
    description: 'Contextual error messages with retry options',
    before: 'Generic "Something went wrong" messages',
    after: 'useApi hook with contextual error handling and retry logic',
    component: 'components/hooks/useApi.jsx'
  },
  {
    id: 'accessibility-audit',
    title: 'Accessibility Audit System',
    status: 'completed',
    impact: 'High',
    description: 'Built-in accessibility monitoring and guidelines',
    before: 'No systematic accessibility checking',
    after: 'AccessibilityAudit component with WCAG compliance tracking',
    component: 'components/shared/AccessibilityAudit.jsx'
  },
  {
    id: 'mobile-optimization',
    title: 'Mobile Navigation',
    status: 'completed',
    impact: 'High',
    description: 'Improved mobile navigation with bottom bar',
    before: 'Desktop-only navigation experience',
    after: 'Mobile-friendly bottom navigation and responsive layout',
    component: 'Layout.js'
  },
  {
    id: 'search-enhancement',
    title: 'Global Search',
    status: 'in-progress',
    impact: 'Medium-High',
    description: 'Smart search across all content types',
    before: 'Limited search functionality',
    after: 'SmartSearch component with contextual results',
    component: 'components/shared/SmartSearch.jsx'
  }
];

const ImprovementCard = ({ improvement }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'in-progress': return <Clock className="w-5 h-5 text-yellow-600" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'High': return 'bg-red-100 text-red-800';
      case 'Medium-High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(improvement.status)}
            <div>
              <CardTitle className="text-lg">{improvement.title}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{improvement.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className={getImpactColor(improvement.impact)}>
              {improvement.impact}
            </Badge>
            <Badge className={getStatusColor(improvement.status)}>
              {improvement.status.replace('-', ' ')}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-700">Before</h4>
            <p className="text-sm text-gray-700 bg-red-50 p-2 rounded">
              {improvement.before}
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-green-700">After</h4>
            <p className="text-sm text-gray-700 bg-green-50 p-2 rounded">
              {improvement.after}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <Badge variant="outline" className="text-xs">
            {improvement.component}
          </Badge>
          {improvement.status !== 'completed' && (
            <Button size="sm" variant="outline">
              <Target className="w-3 h-3 mr-1" />
              View Progress
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default function UXImprovements() {
  const completedCount = IMPLEMENTED_IMPROVEMENTS.filter(i => i.status === 'completed').length;
  const inProgressCount = IMPLEMENTED_IMPROVEMENTS.filter(i => i.status === 'in-progress').length;
  const overallProgress = Math.round((completedCount + inProgressCount * 0.5) / IMPLEMENTED_IMPROVEMENTS.length * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">UX Improvements Implemented</h2>
          <p className="text-gray-600">
            Key improvements made based on the external UX audit findings
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{overallProgress}%</div>
          <div className="text-sm text-gray-600">Progress</div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{completedCount}</p>
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
                <p className="text-2xl font-bold text-yellow-600">{inProgressCount}</p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{IMPLEMENTED_IMPROVEMENTS.length}</p>
                <p className="text-sm text-gray-600">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {IMPLEMENTED_IMPROVEMENTS.map((improvement) => (
          <ImprovementCard key={improvement.id} improvement={improvement} />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-gray-700">
              Based on the external UX audit, the following critical improvements are next in line:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              <li>Complete color contrast fixes for WCAG AA compliance</li>
              <li>Implement confirmation modals for destructive actions</li>
              <li>Enhance contextual help system with inline tooltips</li>
              <li>Add rich notification templates with context</li>
              <li>Complete mobile optimization for all key flows</li>
            </ul>
            <div className="mt-4">
              <Button className="w-full md:w-auto">
                <ArrowRight className="w-4 h-4 mr-2" />
                View Full UX Roadmap
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}