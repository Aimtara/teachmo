import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Code, FileText } from 'lucide-react';

// Manual accessibility checks based on common eslint-plugin-jsx-a11y rules
const ACCESSIBILITY_RULES = {
  'alt-text': {
    name: 'Images must have alt text',
    description: 'All img elements must have an alt attribute',
    check: () => {
      const images = document.querySelectorAll('img');
      const violations = [];
      
      images.forEach((img, index) => {
        if (!img.hasAttribute('alt')) {
          violations.push({
            element: img,
            message: `Image ${index + 1} is missing alt attribute`,
            code: img.outerHTML.substring(0, 100)
          });
        }
      });
      
      return violations;
    }
  },
  'form-labels': {
    name: 'Form inputs must have labels',
    description: 'All form inputs must be properly labeled',
    check: () => {
      const inputs = document.querySelectorAll('input, select, textarea');
      const violations = [];
      
      inputs.forEach((input, index) => {
        const hasLabel = input.labels?.length > 0 || 
                        input.hasAttribute('aria-label') || 
                        input.hasAttribute('aria-labelledby');
        
        if (!hasLabel && input.type !== 'hidden') {
          violations.push({
            element: input,
            message: `Form control ${index + 1} lacks proper labeling`,
            code: input.outerHTML.substring(0, 100)
          });
        }
      });
      
      return violations;
    }
  },
  'button-text': {
    name: 'Buttons must have accessible text',
    description: 'All buttons must have text content or aria-label',
    check: () => {
      const buttons = document.querySelectorAll('button');
      const violations = [];
      
      buttons.forEach((button, index) => {
        const hasText = button.textContent?.trim() || 
                       button.hasAttribute('aria-label') || 
                       button.hasAttribute('aria-labelledby');
        
        if (!hasText) {
          violations.push({
            element: button,
            message: `Button ${index + 1} lacks accessible text`,
            code: button.outerHTML.substring(0, 100)
          });
        }
      });
      
      return violations;
    }
  },
  'heading-order': {
    name: 'Headings must be in logical order',
    description: 'Heading levels should not skip (h1, h2, h3, etc.)',
    check: () => {
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      const violations = [];
      let lastLevel = 0;
      
      headings.forEach((heading, index) => {
        const level = parseInt(heading.tagName[1]);
        
        if (level > lastLevel + 1) {
          violations.push({
            element: heading,
            message: `Heading skips from h${lastLevel} to h${level}`,
            code: heading.outerHTML.substring(0, 100)
          });
        }
        
        lastLevel = level;
      });
      
      return violations;
    }
  },
  'color-contrast': {
    name: 'Text must have sufficient color contrast',
    description: 'Text should meet WCAG AA contrast requirements',
    check: () => {
      // This is a simplified check - in practice you'd use a proper contrast calculator
      const violations = [];
      const textElements = document.querySelectorAll('p, span, div, a, button, label');
      
      textElements.forEach((element, index) => {
        const styles = window.getComputedStyle(element);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Simplified check for light gray text on white background (common issue)
        if (color.includes('rgb(153, 153, 153)') && backgroundColor.includes('rgb(255, 255, 255)')) {
          violations.push({
            element: element,
            message: `Text may have insufficient contrast ratio`,
            code: element.outerHTML.substring(0, 100)
          });
        }
      });
      
      return violations;
    }
  },
  'interactive-elements': {
    name: 'Interactive elements must be keyboard accessible',
    description: 'All interactive elements should be focusable and have proper ARIA',
    check: () => {
      const interactive = document.querySelectorAll('[onclick], [onkeydown]');
      const violations = [];
      
      interactive.forEach((element, index) => {
        const isFocusable = element.tabIndex >= 0 || 
                           ['button', 'a', 'input', 'select', 'textarea'].includes(element.tagName.toLowerCase());
        
        if (!isFocusable) {
          violations.push({
            element: element,
            message: `Interactive element ${index + 1} is not keyboard accessible`,
            code: element.outerHTML.substring(0, 100)
          });
        }
      });
      
      return violations;
    }
  },
  'landmark-elements': {
    name: 'Page should have proper landmark elements',
    description: 'Use semantic HTML and ARIA landmarks for navigation',
    check: () => {
      const violations = [];
      const hasMain = document.querySelector('main, [role="main"]');
      const hasNav = document.querySelector('nav, [role="navigation"]');
      
      if (!hasMain) {
        violations.push({
          element: document,
          message: 'Page is missing a main landmark',
          code: '<main> or role="main" not found'
        });
      }
      
      // Only require nav if there are navigation links
      const navLinks = document.querySelectorAll('a[href]');
      if (navLinks.length > 5 && !hasNav) {
        violations.push({
          element: document,
          message: 'Page with multiple links should have navigation landmark',
          code: '<nav> or role="navigation" not found'
        });
      }
      
      return violations;
    }
  }
};

export default function AccessibilityLinter() {
  const [lintResults, setLintResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runAccessibilityLint = () => {
    setIsRunning(true);
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const results = {
        violations: [],
        passedRules: [],
        totalRules: Object.keys(ACCESSIBILITY_RULES).length
      };
      
      Object.entries(ACCESSIBILITY_RULES).forEach(([ruleId, rule]) => {
        try {
          const violations = rule.check();
          
          if (violations.length > 0) {
            results.violations.push({
              ruleId,
              rule: rule.name,
              description: rule.description,
              violations
            });
          } else {
            results.passedRules.push({
              ruleId,
              rule: rule.name,
              description: rule.description
            });
          }
        } catch (error) {
          console.error(`Error running rule ${ruleId}:`, error);
        }
      });
      
      results.score = Math.round((results.passedRules.length / results.totalRules) * 100);
      
      setLintResults(results);
      setIsRunning(false);
    }, 500);
  };

  const highlightElement = (element) => {
    if (element === document) return;
    
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.style.outline = '3px solid red';
    element.style.outlineOffset = '2px';
    
    setTimeout(() => {
      element.style.outline = '';
      element.style.outlineOffset = '';
    }, 3000);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreDescription = (score) => {
    if (score >= 90) return 'Excellent accessibility!';
    if (score >= 70) return 'Good, with room for improvement';
    if (score >= 50) return 'Needs significant improvement';
    return 'Major accessibility issues found';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="w-6 h-6" />
          Accessibility Linter
        </CardTitle>
        <p className="text-gray-600">
          Real-time accessibility checking based on eslint-plugin-jsx-a11y rules
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-6">
          <div>
            {lintResults && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`text-3xl font-bold ${getScoreColor(lintResults.score)}`}>
                    {lintResults.score}%
                  </span>
                  <span className="text-gray-600">Accessibility Score</span>
                </div>
                <p className="text-sm text-gray-500">
                  {getScoreDescription(lintResults.score)}
                </p>
              </div>
            )}
          </div>
          <Button onClick={runAccessibilityLint} disabled={isRunning}>
            {isRunning ? 'Scanning...' : 'Run Accessibility Lint'}
          </Button>
        </div>

        {lintResults && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {lintResults.violations.reduce((sum, v) => sum + v.violations.length, 0)}
                </div>
                <div className="text-sm text-red-700">Issues Found</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {lintResults.passedRules.length}
                </div>
                <div className="text-sm text-green-700">Rules Passed</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {lintResults.totalRules}
                </div>
                <div className="text-sm text-blue-700">Total Rules</div>
              </div>
            </div>

            {/* Violations */}
            {lintResults.violations.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Accessibility Violations
                </h3>
                <div className="space-y-4">
                  {lintResults.violations.map((ruleViolation, index) => (
                    <div key={index} className="border rounded-lg p-4 bg-red-50 border-red-200">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-red-900">{ruleViolation.rule}</h4>
                        <Badge variant="destructive">
                          {ruleViolation.violations.length} {ruleViolation.violations.length === 1 ? 'issue' : 'issues'}
                        </Badge>
                      </div>
                      <p className="text-sm text-red-700 mb-3">{ruleViolation.description}</p>
                      
                      <div className="space-y-2">
                        {ruleViolation.violations.map((violation, vIndex) => (
                          <div key={vIndex} className="bg-white p-3 rounded border border-red-200">
                            <p className="text-sm font-medium text-red-800 mb-1">
                              {violation.message}
                            </p>
                            <code className="text-xs bg-gray-100 p-1 rounded block text-gray-700">
                              {violation.code}
                            </code>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="mt-2 text-xs"
                              onClick={() => highlightElement(violation.element)}
                            >
                              Highlight Element
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Passed Rules */}
            {lintResults.passedRules.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Passed Rules
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {lintResults.passedRules.map((rule, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-green-900">{rule.rule}</span>
                      </div>
                      <p className="text-sm text-green-700 mt-1">{rule.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}