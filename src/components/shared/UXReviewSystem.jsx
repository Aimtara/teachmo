import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle, Clock, Eye, Zap, Users, Accessibility } from 'lucide-react';

// UX Review Checklist based on industry standards
const UX_REVIEW_CHECKLIST = {
  'Usability & Navigation': [
    {
      id: 'clear-navigation',
      title: 'Clear Navigation',
      description: 'Navigation is intuitive and users can easily find what they need',
      critical: true
    },
    {
      id: 'consistent-patterns',
      title: 'Consistent UI Patterns',
      description: 'Similar elements behave consistently across the application',
      critical: true
    },
    {
      id: 'breadcrumbs',
      title: 'Breadcrumbs & Orientation',
      description: 'Users always know where they are in the application',
      critical: false
    },
    {
      id: 'search-functionality',
      title: 'Search & Findability',
      description: 'Users can easily search and filter content',
      critical: false
    }
  ],
  'Content & Information': [
    {
      id: 'clear-content',
      title: 'Clear Content Hierarchy',
      description: 'Information is well-organized with clear headings and structure',
      critical: true
    },
    {
      id: 'scannable-content',
      title: 'Scannable Content',
      description: 'Content is easy to scan with bullet points, short paragraphs, and visual breaks',
      critical: false
    },
    {
      id: 'empty-states',
      title: 'Helpful Empty States',
      description: 'Empty states provide clear guidance and next steps',
      critical: true
    },
    {
      id: 'error-messages',
      title: 'Clear Error Messages',
      description: 'Error messages are helpful and suggest solutions',
      critical: true
    }
  ],
  'Interaction & Feedback': [
    {
      id: 'loading-states',
      title: 'Loading States',
      description: 'Clear loading indicators for all async operations',
      critical: true
    },
    {
      id: 'success-feedback',
      title: 'Success Feedback',
      description: 'Users receive confirmation when actions complete successfully',
      critical: true
    },
    {
      id: 'micro-interactions',
      title: 'Micro-interactions',
      description: 'Small animations and transitions provide feedback and delight',
      critical: false
    },
    {
      id: 'form-validation',
      title: 'Form Validation',
      description: 'Real-time validation with clear, helpful messages',
      critical: true
    }
  ],
  'Performance & Load': [
    {
      id: 'perceived-performance',
      title: 'Perceived Performance',
      description: 'App feels fast with skeleton loaders and optimistic updates',
      critical: true
    },
    {
      id: 'cognitive-load',
      title: 'Cognitive Load',
      description: 'Interface doesn\'t overwhelm users with too many options at once',
      critical: true
    },
    {
      id: 'progressive-disclosure',
      title: 'Progressive Disclosure',
      description: 'Complex features are revealed progressively as needed',
      critical: false
    }
  ],
  'Accessibility': [
    {
      id: 'keyboard-navigation',
      title: 'Keyboard Navigation',
      description: 'All interactive elements are keyboard accessible',
      critical: true
    },
    {
      id: 'focus-indicators',
      title: 'Focus Indicators',
      description: 'Clear focus indicators for keyboard users',
      critical: true
    },
    {
      id: 'color-contrast',
      title: 'Color Contrast',
      description: 'Sufficient color contrast for readability',
      critical: true
    },
    {
      id: 'alt-text',
      title: 'Alt Text & Labels',
      description: 'Images have alt text, form fields have labels',
      critical: true
    }
  ],
  'Mobile & Responsive': [
    {
      id: 'mobile-friendly',
      title: 'Mobile-Friendly',
      description: 'Interface works well on mobile devices',
      critical: true
    },
    {
      id: 'touch-targets',
      title: 'Touch Target Size',
      description: 'Interactive elements are large enough for touch',
      critical: true
    },
    {
      id: 'responsive-layout',
      title: 'Responsive Layout',
      description: 'Layout adapts well to different screen sizes',
      critical: true
    }
  ]
};

const UXReviewCard = ({ categoryName, items, checkedItems, onItemToggle, notes, onNotesChange }) => {
  const completedCount = items.filter(item => checkedItems[item.id]).length;
  const criticalIssues = items.filter(item => item.critical && !checkedItems[item.id]).length;

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{categoryName}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={criticalIssues > 0 ? "destructive" : "secondary"}>
              {completedCount}/{items.length}
            </Badge>
            {criticalIssues > 0 && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
            <Checkbox
              id={item.id}
              checked={checkedItems[item.id] || false}
              onCheckedChange={(checked) => onItemToggle(item.id, checked)}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <label htmlFor={item.id} className="font-medium cursor-pointer">
                  {item.title}
                </label>
                {item.critical && (
                  <Badge variant="outline" className="text-xs text-red-600 border-red-200">
                    Critical
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">{item.description}</p>
            </div>
          </div>
        ))}
        
        <div className="pt-4 border-t">
          <label className="block text-sm font-medium mb-2">
            Notes for {categoryName}:
          </label>
          <Textarea
            value={notes[categoryName] || ''}
            onChange={(e) => onNotesChange(categoryName, e.target.value)}
            placeholder="Add any specific observations, issues, or recommendations..."
            rows={3}
            className="text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default function UXReviewSystem({ 
  pageName, 
  onReviewComplete, 
  existingReview = null,
  isOpen = false 
}) {
  const [checkedItems, setCheckedItems] = useState({});
  const [notes, setNotes] = useState({});
  const [overallNotes, setOverallNotes] = useState('');
  const [reviewScore, setReviewScore] = useState(0);

  // Load existing review if provided
  useEffect(() => {
    if (existingReview) {
      setCheckedItems(existingReview.checkedItems || {});
      setNotes(existingReview.notes || {});
      setOverallNotes(existingReview.overallNotes || '');
    }
  }, [existingReview]);

  // Calculate review score
  useEffect(() => {
    const allItems = Object.values(UX_REVIEW_CHECKLIST).flat();
    const completedItems = allItems.filter(item => checkedItems[item.id]).length;
    const score = Math.round((completedItems / allItems.length) * 100);
    setReviewScore(score);
  }, [checkedItems]);

  const handleItemToggle = (itemId, checked) => {
    setCheckedItems(prev => ({
      ...prev,
      [itemId]: checked
    }));
  };

  const handleNotesChange = (category, value) => {
    setNotes(prev => ({
      ...prev,
      [category]: value
    }));
  };

  const generateRecommendations = () => {
    const recommendations = [];
    const allItems = Object.values(UX_REVIEW_CHECKLIST).flat();
    
    // Find unchecked critical items
    const criticalIssues = allItems.filter(item => 
      item.critical && !checkedItems[item.id]
    );

    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Critical UX Issues',
        items: criticalIssues.map(item => item.title)
      });
    }

    // Find unchecked non-critical items
    const improvementAreas = allItems.filter(item => 
      !item.critical && !checkedItems[item.id]
    );

    if (improvementAreas.length > 0) {
      recommendations.push({
        priority: 'medium',
        title: 'Improvement Opportunities',
        items: improvementAreas.slice(0, 5).map(item => item.title) // Top 5
      });
    }

    return recommendations;
  };

  const handleCompleteReview = () => {
    const reviewData = {
      pageName,
      timestamp: new Date().toISOString(),
      score: reviewScore,
      checkedItems,
      notes,
      overallNotes,
      recommendations: generateRecommendations(),
      reviewer: 'UX System' // In a real app, this would be the current user
    };

    onReviewComplete?.(reviewData);
  };

  const getCriticalIssuesCount = () => {
    const allItems = Object.values(UX_REVIEW_CHECKLIST).flat();
    return allItems.filter(item => item.critical && !checkedItems[item.id]).length;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!isOpen) return null;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">UX Review: {pageName}</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive usability and experience audit based on industry standards
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(reviewScore)}`}>
              {reviewScore}%
            </div>
            <p className="text-sm text-gray-600">UX Score</p>
          </div>
        </div>
        
        {getCriticalIssuesCount() > 0 && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800">
              {getCriticalIssuesCount()} critical UX issue{getCriticalIssuesCount() !== 1 ? 's' : ''} found
            </span>
          </div>
        )}
      </div>

      {/* Review Categories */}
      {Object.entries(UX_REVIEW_CHECKLIST).map(([categoryName, items]) => (
        <UXReviewCard
          key={categoryName}
          categoryName={categoryName}
          items={items}
          checkedItems={checkedItems}
          onItemToggle={handleItemToggle}
          notes={notes}
          onNotesChange={handleNotesChange}
        />
      ))}

      {/* Overall Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Overall Notes & Recommendations:
              </label>
              <Textarea
                value={overallNotes}
                onChange={(e) => setOverallNotes(e.target.value)}
                placeholder="Summarize the overall UX state, key findings, and prioritized recommendations for improvement..."
                rows={6}
              />
            </div>

            {/* Auto-generated recommendations */}
            {generateRecommendations().length > 0 && (
              <div className="pt-4 border-t">
                <h3 className="font-medium mb-3">Auto-Generated Recommendations:</h3>
                <div className="space-y-3">
                  {generateRecommendations().map((rec, index) => (
                    <div key={index} className={`p-3 rounded-lg border ${
                      rec.priority === 'high' 
                        ? 'bg-red-50 border-red-200' 
                        : 'bg-yellow-50 border-yellow-200'
                    }`}>
                      <h4 className={`font-medium mb-2 ${
                        rec.priority === 'high' ? 'text-red-800' : 'text-yellow-800'
                      }`}>
                        {rec.title}
                      </h4>
                      <ul className={`list-disc list-inside text-sm space-y-1 ${
                        rec.priority === 'high' ? 'text-red-700' : 'text-yellow-700'
                      }`}>
                        {rec.items.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span>{Object.values(checkedItems).filter(Boolean).length} completed</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-yellow-500" />
            <span>{Object.values(UX_REVIEW_CHECKLIST).flat().length - Object.values(checkedItems).filter(Boolean).length} remaining</span>
          </div>
        </div>
        
        <Button onClick={handleCompleteReview} size="lg">
          Complete UX Review
        </Button>
      </div>
    </div>
  );
}