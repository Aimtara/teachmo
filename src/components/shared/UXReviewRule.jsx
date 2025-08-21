import React from 'react';

// UX Review Rules - These are codified principles that should be applied consistently
export const UX_REVIEW_RULES = {
  MICRO_INTERACTIONS: {
    name: "Micro-interactions & Delight",
    description: "Continuously look for small animations, haptic feedback, and subtle visual cues that make interactions more intuitive and enjoyable.",
    checkpoints: [
      "All buttons should have hover and active states",
      "Loading states should be visually engaging",
      "Success actions should have celebratory feedback",
      "Form interactions should feel responsive",
      "Navigation should provide clear visual feedback"
    ]
  },
  
  MODAL_OPTIMIZATION: {
    name: "Modal Optimization",
    description: "Regularly review if modals are the best pattern. For multi-step processes or heavy data entry, consider full-page forms.",
    checkpoints: [
      "Modals should be used for quick actions only",
      "Complex workflows should use dedicated pages",
      "Modal stacking should be avoided",
      "Mobile modal experience should be optimized",
      "Exit paths from modals should be clear"
    ]
  },
  
  FEEDBACK_CLARITY: {
    name: "Toast & Feedback Clarity", 
    description: "All toast messages, alerts, and notifications should be concise, actionable, and appear at the right time.",
    checkpoints: [
      "Success messages should be encouraging",
      "Error messages should be helpful, not blame-focused",
      "Timing should not interrupt user flow",
      "Actions should be clearly suggested",
      "Messages should be scannable and brief"
    ]
  },
  
  VISUAL_CONSISTENCY: {
    name: "Visual Consistency & Active States",
    description: "Maintain vigilance on visual consistency, especially as new components are introduced.",
    checkpoints: [
      "Active navigation items are clearly distinguished", 
      "Selected filters have consistent styling",
      "Focus states are always visible and clear",
      "Color usage follows established patterns",
      "Typography hierarchy is consistent"
    ]
  },
  
  FORM_VALIDATION: {
    name: "Form Validation & Error Handling",
    description: "All forms should have real-time, clear, and user-friendly validation messages.",
    checkpoints: [
      "Validation happens in real-time where appropriate",
      "Error messages are specific and actionable",
      "Success states are clearly communicated",
      "Required fields are clearly marked",
      "Field constraints are explained upfront"
    ]
  }
};

// Component for displaying UX review rules in admin interfaces
export default function UXReviewRule({ rule, violations = [] }) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{rule.name}</h3>
        <div className={`px-2 py-1 rounded text-xs font-medium ${
          violations.length === 0 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {violations.length === 0 ? 'Passing' : `${violations.length} Issues`}
        </div>
      </div>
      
      <p className="text-sm text-gray-600">{rule.description}</p>
      
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Checkpoints:</h4>
        <ul className="space-y-1">
          {rule.checkpoints.map((checkpoint, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <div className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 ${
                violations.includes(index)
                  ? 'bg-red-100 border-2 border-red-500'
                  : 'bg-green-100 border-2 border-green-500'
              }`} />
              <span className={violations.includes(index) ? 'text-red-700' : 'text-gray-600'}>
                {checkpoint}
              </span>
            </li>
          ))}
        </ul>
      </div>
      
      {violations.length > 0 && (
        <div className="mt-3 p-3 bg-red-50 rounded border border-red-200">
          <h5 className="text-sm font-medium text-red-800 mb-2">Issues Found:</h5>
          <ul className="text-sm text-red-700 space-y-1">
            {violations.map((violationIndex, idx) => (
              <li key={idx}>• {rule.checkpoints[violationIndex]}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}