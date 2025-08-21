import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Eye, 
  Smartphone,
  Palette,
  Navigation,
  Users,
  FileText,
  Target,
  ArrowRight,
  TrendingUp,
  Zap
} from 'lucide-react';

// UX Audit findings mapped to current implementation
const UX_AUDIT_FINDINGS = {
  critical: [
    {
      id: 'loading-states',
      category: 'Interaction Design',
      issue: 'Loading States are often blank screens',
      current: 'Some components lack skeleton loaders',
      impact: 'High - Users see blank screens during data loading',
      effort: 'Medium',
      components: ['Dashboard', 'Messages', 'Activities'],
      solution: 'Implement consistent skeleton loaders across all data-loading components'
    },
    {
      id: 'error-handling', 
      category: 'Interaction Design',
      issue: 'Generic error messages without context',
      current: 'Some API errors show generic "Something went wrong"',
      impact: 'High - Users can\'t understand or fix issues',
      effort: 'Medium',
      components: ['API calls', 'Forms', 'Data fetching'],
      solution: 'Implement contextual error messages with actionable guidance'
    },
    {
      id: 'contrast-issues',
      category: 'Accessibility',
      issue: 'Color contrast below WCAG AA standards',
      current: 'Some disabled states and placeholders have poor contrast',
      impact: 'High - Accessibility compliance issues',
      effort: 'Low',
      components: ['Forms', 'Buttons', 'Text elements'],
      solution: 'Audit and fix color contrast across all components'
    }
  ],
  high: [
    {
      id: 'role-navigation',
      category: 'Information Architecture',
      issue: 'Navigation combines multiple roles causing cognitive overload',
      current: 'Layout.js has role-based navigation but could be clearer',
      impact: 'Medium-High - Users see irrelevant navigation items',
      effort: 'High',
      components: ['Layout', 'Navigation'],
      solution: 'Enhance role-based home screens and progressive disclosure'
    },
    {
      id: 'mobile-layouts',
      category: 'Mobile Responsiveness', 
      issue: 'Key flows appear cramped on small screens',
      current: 'Some components not fully mobile-optimized',
      impact: 'Medium-High - Poor mobile experience',
      effort: 'High',
      components: ['Calendar', 'Forms', 'Modals'],
      solution: 'Redesign for mobile-first responsive layouts'
    },
    {
      id: 'onboarding',
      category: 'Onboarding',
      issue: 'New users see empty dashboard with no guidance',
      current: 'Basic onboarding exists but lacks guided tours',
      impact: 'Medium-High - Poor first-time user experience',
      effort: 'High',
      components: ['Welcome', 'Dashboard', 'Tours'],
      solution: 'Implement role-specific guided tours and contextual help'
    }
  ],
  medium: [
    {
      id: 'design-consistency',
      category: 'Visual Design',
      issue: 'Button styles vary without clear hierarchy',
      current: 'Multiple button variants used inconsistently',
      impact: 'Medium - Visual inconsistency affects usability',
      effort: 'Medium',
      components: ['All buttons', 'Design system'],
      solution: 'Create and enforce unified design system'
    },
    {
      id: 'search-functionality',
      category: 'Information Architecture',
      issue: 'No global search for quick navigation',
      current: 'SmartSearch component exists but limited implementation',
      impact: 'Medium - Users can\'t quickly find content',
      effort: 'Medium',
      components: ['Search', 'Navigation'],
      solution: 'Enhance and expand global search functionality'
    },
    {
      id: 'content-terminology',
      category: 'Content & Microcopy',
      issue: 'Inconsistent terminology across features',
      current: 'Mixed terminology in different components',
      impact: 'Medium - Confusing user experience',
      effort: 'Low-Medium',
      components: ['All text content'],
      solution: 'Create unified glossary and content style guide'
    }
  ]
};

const IMPLEMENTATION_STATUS = {
  'loading-states': {
    status: 'in-progress',
    progress: 60,
    notes: 'DashboardSkeleton and other skeletons implemented, need expansion'
  },
  'error-handling': {
    status: 'in-progress', 
    progress: 40,
    notes: 'Basic error handling in useApi hook, needs contextual messages'
  },
  'contrast-issues': {
    status: 'not-started',
    progress: 0,
    notes: 'Accessibility audit component created but contrast fixes needed'
  },
  'role-navigation': {
    status: 'completed',
    progress: 90,
    notes: 'Role-based navigation implemented in Layout.js'
  },
  'mobile-layouts': {
    status: 'in-progress',
    progress: 70,
    notes: 'Mobile navigation and responsive design partially implemented'
  },
  'onboarding': {
    status: 'in-progress',
    progress: 50,
    notes: 'Basic onboarding flow exists, guided tours need enhancement'
  },
  'design-consistency': {
    status: 'in-progress',
    progress: 30,
    notes: 'shadcn/ui provides consistency, but enforcement needed'
  },
  'search-functionality': {
    status: 'in-progress',
    progress: 40,
    notes: 'SmartSearch component exists, needs expansion'
  },
  'content-terminology': {
    status: 'not-started',
    progress: 10,
    notes: 'Some consistency but no formal style guide'
  }
};

const UXAuditCard = ({ finding, status }) => {
  const getStatusColor = (status) => {
    switch (status.status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  const getPriorityColor = (category) => {
    switch (category) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={`w-1 h-16 rounded ${getPriorityColor(finding.category.toLowerCase())}`} />
            <div>
              <CardTitle className="text-lg">{finding.issue}</CardTitle>
              <p className="text-sm text-gray-600 mt-1">{finding.category}</p>
            </div>
          </div>
          <Badge className={getStatusColor(status)}>
            {status.status.replace('-', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-2">Current State</h4>
            <p className="text-sm text-gray-700">{finding.current}</p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-2">Proposed Solution</h4>
            <p className="text-sm text-gray-700">{finding.solution}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-gray-600">{status.progress}%</span>
          </div>
          <Progress value={status.progress} className="h-2" />
          <p className="text-xs text-gray-600">{status.notes}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            Impact: {finding.impact.split(' - ')[0]}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Effort: {finding.effort}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1 mt-2">
          {finding.components.map((component) => (
            <Badge key={component} variant="secondary" className="text-xs">
              {component}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function UXAuditDashboard() {
  const [selectedPriority, setSelectedPriority] = useState('all');
  
  const allFindings = [
    ...UX_AUDIT_FINDINGS.critical.map(f => ({ ...f, priority: 'critical' })),
    ...UX_AUDIT_FINDINGS.high.map(f => ({ ...f, priority: 'high' })),
    ...UX_AUDIT_FINDINGS.medium.map(f => ({ ...f, priority: 'medium' }))
  ];

  const filteredFindings = selectedPriority === 'all' 
    ? allFindings 
    : allFindings.filter(f => f.priority === selectedPriority);

  const overallProgress = Math.round(
    Object.values(IMPLEMENTATION_STATUS).reduce((sum, status) => sum + status.progress, 0) / 
    Object.values(IMPLEMENTATION_STATUS).length
  );

  const completedCount = Object.values(IMPLEMENTATION_STATUS).filter(s => s.status === 'completed').length;
  const inProgressCount = Object.values(IMPLEMENTATION_STATUS).filter(s => s.status === 'in-progress').length;
  const notStartedCount = Object.values(IMPLEMENTATION_STATUS).filter(s => s.status === 'not-started').length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">UX Audit Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Based on external UX audit findings - tracking implementation progress
          </p>
        </div>
        <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">
          {overallProgress}% Complete
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
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
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{notStartedCount}</p>
                <p className="text-sm text-gray-600">Not Started</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{overallProgress}%</p>
                <p className="text-sm text-gray-600">Overall Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Filter */}
      <div className="flex gap-2">
        <Button 
          variant={selectedPriority === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedPriority('all')}
          size="sm"
        >
          All Issues
        </Button>
        <Button 
          variant={selectedPriority === 'critical' ? 'default' : 'outline'}
          onClick={() => setSelectedPriority('critical')}
          size="sm"
        >
          Critical
        </Button>
        <Button 
          variant={selectedPriority === 'high' ? 'default' : 'outline'}
          onClick={() => setSelectedPriority('high')}
          size="sm"
        >
          High Priority
        </Button>
        <Button 
          variant={selectedPriority === 'medium' ? 'default' : 'outline'}
          onClick={() => setSelectedPriority('medium')}
          size="sm"
        >
          Medium Priority
        </Button>
      </div>

      {/* Findings List */}
      <div className="space-y-4">
        {filteredFindings.map((finding) => (
          <UXAuditCard 
            key={finding.id} 
            finding={finding} 
            status={IMPLEMENTATION_STATUS[finding.id]}
          />
        ))}
      </div>
    </div>
  );
}