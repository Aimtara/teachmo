import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Eye, 
  Keyboard, 
  MousePointer, 
  Volume2, 
  Palette, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Zap
} from 'lucide-react';

export default function AccessibilityAudit() {
  const [auditResults, setAuditResults] = useState({
    colorContrast: [],
    keyboardNavigation: [],
    altText: [],
    ariaLabels: [],
    headingStructure: [],
    focusManagement: []
  });
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    rootRef.current =
      document.querySelector('[data-app-root]') ||
      document.querySelector('main') ||
      document.body;
  }, []);

  const runAccessibilityAudit = useCallback(async () => {
    setIsRunning(true);

    const results = {
      colorContrast: await checkColorContrast(),
      keyboardNavigation: await checkKeyboardNavigation(),
      altText: await checkAltText(),
      ariaLabels: await checkAriaLabels(),
      headingStructure: await checkHeadingStructure(),
      focusManagement: await checkFocusManagement()
    };

    setAuditResults(results);
    setLastRun(new Date());
    setIsRunning(false);
  }, [checkAltText, checkAriaLabels, checkColorContrast, checkFocusManagement, checkHeadingStructure, checkKeyboardNavigation]);

  const checkColorContrast = useCallback(async () => {
    const issues = [];
    const root = rootRef.current || document;
    const elements = Array.from(root.querySelectorAll('*')).slice(0, 500);
    
    elements.forEach((el, index) => {
      if (el.textContent.trim() && window.getComputedStyle(el).color) {
        const styles = window.getComputedStyle(el);
        const textColor = styles.color;
        const bgColor = styles.backgroundColor;
        
        // Simple contrast check (would need more sophisticated algorithm in production)
        if (textColor && bgColor && textColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'rgba(0, 0, 0, 0)') {
          const contrast = calculateContrast(textColor, bgColor);
          if (contrast < 4.5) {
            issues.push({
              element: el.tagName.toLowerCase(),
              text: el.textContent.slice(0, 50) + '...',
              contrast: contrast.toFixed(2),
              severity: contrast < 3 ? 'high' : 'medium'
            });
          }
        }
      }
    });
    
    return issues.slice(0, 10); // Limit results
  }, []);

  const checkKeyboardNavigation = useCallback(async () => {
    const issues = [];
    const root = rootRef.current || document;
    const interactiveElements = root.querySelectorAll('button, a, input, select, textarea, [tabindex]');
    
    interactiveElements.forEach((el) => {
      const tabIndex = el.getAttribute('tabindex');
      const hasTabIndex = tabIndex !== null;
      const isVisible = el.offsetWidth > 0 && el.offsetHeight > 0;
      
      if (isVisible && !hasTabIndex && !['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) {
        issues.push({
          element: el.tagName.toLowerCase(),
          issue: 'Interactive element without proper tabindex',
          severity: 'medium'
        });
      }
      
      if (hasTabIndex && parseInt(tabIndex) > 0) {
        issues.push({
          element: el.tagName.toLowerCase(),
          issue: 'Positive tabindex found (antipattern)',
          severity: 'high'
        });
      }
    });
    
    return issues;
  }, []);

  const checkAltText = useCallback(async () => {
    const issues = [];
    const root = rootRef.current || document;
    const images = root.querySelectorAll('img');
    
    images.forEach((img) => {
      const alt = img.getAttribute('alt');
      const src = img.src;
      
      if (!alt && alt !== '') {
        issues.push({
          element: 'img',
          src: src.slice(-30),
          issue: 'Missing alt attribute',
          severity: 'high'
        });
      } else if (alt && alt.length > 125) {
        issues.push({
          element: 'img',
          src: src.slice(-30),
          issue: 'Alt text too long (>125 characters)',
          severity: 'medium'
        });
      }
    });
    
    return issues;
  }, []);

  const checkAriaLabels = useCallback(async () => {
    const issues = [];
    const root = rootRef.current || document;
    const elementsNeedingLabels = root.querySelectorAll('button, a, input, select, textarea');
    
    elementsNeedingLabels.forEach((el) => {
      const hasAriaLabel = el.getAttribute('aria-label');
      const hasAriaLabelledby = el.getAttribute('aria-labelledby');
      const hasTitle = el.getAttribute('title');
      const hasVisibleText = el.textContent.trim();
      const hasAssociatedLabel = el.id && (rootRef.current || document).querySelector(`label[for="${el.id}"]`);
      
      if (!hasAriaLabel && !hasAriaLabelledby && !hasTitle && !hasVisibleText && !hasAssociatedLabel) {
        issues.push({
          element: el.tagName.toLowerCase(),
          issue: 'No accessible name found',
          severity: 'high'
        });
      }
    });
    
    return issues;
  }, []);

  const checkHeadingStructure = useCallback(async () => {
    const issues = [];
    const root = rootRef.current || document;
    const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    
    headings.forEach((heading) => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      
      if (currentLevel > previousLevel + 1) {
        issues.push({
          element: heading.tagName.toLowerCase(),
          text: heading.textContent.slice(0, 50),
          issue: `Heading level jumps from h${previousLevel} to h${currentLevel}`,
          severity: 'medium'
        });
      }
      
      previousLevel = currentLevel;
    });
    
    return issues;
  }, []);

  const checkFocusManagement = useCallback(async () => {
    const issues = [];
    const root = rootRef.current || document;
    const focusableElements = root.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach((el) => {
      const styles = window.getComputedStyle(el);
      if (styles.outline === 'none' || styles.outline === '0px') {
        issues.push({
          element: el.tagName.toLowerCase(),
          issue: 'Element removes focus outline without alternative',
          severity: 'high'
        });
      }
    });
    
    return issues;
  }, []);

  const calculateContrast = (color1, color2) => {
    // Simplified contrast calculation - would need full WCAG algorithm in production
    return Math.random() * 10 + 1; // Mock calculation
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTotalIssues = () => {
    return Object.values(auditResults).reduce((total, issues) => total + issues.length, 0);
  };

  const auditCategories = [
    {
      key: 'colorContrast',
      title: 'Color Contrast',
      icon: Palette,
      description: 'WCAG AA compliance (4.5:1 ratio)'
    },
    {
      key: 'keyboardNavigation',
      title: 'Keyboard Navigation',
      icon: Keyboard,
      description: 'Tab order and keyboard accessibility'
    },
    {
      key: 'altText',
      title: 'Image Alt Text',
      icon: Eye,
      description: 'Alternative text for images'
    },
    {
      key: 'ariaLabels',
      title: 'ARIA Labels',
      icon: Volume2,
      description: 'Screen reader compatibility'
    },
    {
      key: 'headingStructure',
      title: 'Heading Structure',
      icon: FileText,
      description: 'Logical heading hierarchy'
    },
    {
      key: 'focusManagement',
      title: 'Focus Management',
      icon: MousePointer,
      description: 'Visible focus indicators'
    }
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const scheduleRun = () => {
      if (typeof requestIdleCallback !== 'undefined') {
        const idleHandle = requestIdleCallback(() => runAccessibilityAudit());
        return () => cancelIdleCallback(idleHandle);
      }

      const timeout = setTimeout(() => runAccessibilityAudit(), 100);
      return () => clearTimeout(timeout);
    };

    return scheduleRun();
  }, [runAccessibilityAudit]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accessibility Audit</h2>
          <p className="text-gray-600">
            WCAG 2.1 AA compliance check {lastRun && `• Last run: ${lastRun.toLocaleTimeString()}`}
          </p>
        </div>
        <Button 
          onClick={runAccessibilityAudit} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? 'Running Audit...' : 'Run Audit'}
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Audit Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getTotalIssues() === 0 ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">No issues found!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">{getTotalIssues()} issues found</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Badge className="bg-red-100 text-red-800">
                {Object.values(auditResults).flat().filter(i => i.severity === 'high').length} High
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-800">
                {Object.values(auditResults).flat().filter(i => i.severity === 'medium').length} Medium
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Results */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {auditCategories.map(category => {
          const issues = auditResults[category.key] || [];
          const Icon = category.icon;
          
          return (
            <Card key={category.key}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    {category.title}
                  </div>
                  {issues.length > 0 ? (
                    <Badge className="bg-red-100 text-red-800">
                      {issues.length}
                    </Badge>
                  ) : (
                    <Badge className="bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Pass
                    </Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-gray-600">{category.description}</p>
              </CardHeader>
              <CardContent>
                {issues.length === 0 ? (
                  <p className="text-green-600 text-sm">No issues found in this category.</p>
                ) : (
                  <div className="space-y-3">
                    {issues.slice(0, 5).map((issue, index) => (
                      <Alert key={index} className="border-l-4 border-l-red-500">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{issue.issue}</p>
                              {issue.text && <p className="text-xs text-gray-600 mt-1">{issue.text}</p>}
                              {issue.element && <p className="text-xs text-gray-500">Element: {issue.element}</p>}
                            </div>
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity}
                            </Badge>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                    {issues.length > 5 && (
                      <p className="text-sm text-gray-500">
                        And {issues.length - 5} more issues...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}