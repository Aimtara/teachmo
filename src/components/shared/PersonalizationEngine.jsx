import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { useChildrenList } from '@/domain/learners';
import { invokeLLM } from '@/api/integrations';

const PersonalizationContext = createContext();

export const PersonalizationProvider = ({ children }) => {
  const { children: learnerProfiles, isLoading: loadingChildren } = useChildrenList();
  const [personalizationProfile, setPersonalizationProfile] = useState({
    preferences: {},
    behaviorPatterns: {},
    contentAffinities: {},
    optimalTiming: {},
    learningStyle: 'adaptive'
  });

  const [isLearning, setIsLearning] = useState(false);

  // Track user behavior patterns
  const trackBehavior = useCallback(async (action, context = {}) => {
    try {
      const timestamp = new Date().toISOString();
      const behaviorData = {
        action,
        context,
        timestamp,
        sessionId: sessionStorage.getItem('session_id') || 'unknown'
      };

      // Store in local state for immediate use
      setPersonalizationProfile(prev => ({
        ...prev,
        behaviorPatterns: {
          ...prev.behaviorPatterns,
          [action]: {
            count: (prev.behaviorPatterns[action]?.count || 0) + 1,
            lastSeen: timestamp,
            contexts: [...(prev.behaviorPatterns[action]?.contexts || []), context]
          }
        }
      }));

      // Could also send to backend for persistent learning
      // await trackUserBehavior(behaviorData);
      
    } catch (error) {
      console.error('Error tracking behavior:', error);
    }
  }, []);

  // Generate personalized recommendations
  const generateRecommendations = useCallback(async (type = 'general', limit = 5) => {
    if (loadingChildren) {
      return [];
    }

    setIsLearning(true);
    try {
      const user = await User.me();
      const children = learnerProfiles || [];

      const prompt = `Based on this user's profile and behavior, generate ${limit} personalized ${type} recommendations:

User Profile:
- Parenting style: ${user.parenting_style || 'Unknown'}
- Current mood: ${user.current_mood || 'Unknown'}
- Children ages: ${children.map(c => c.age).join(', ')}
- Behavior patterns: ${JSON.stringify(personalizationProfile.behaviorPatterns)}
- Content preferences: ${JSON.stringify(personalizationProfile.contentAffinities)}

Generate recommendations that feel personally relevant and useful right now.`;

      const response = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  relevanceScore: { type: "number" },
                  personalizedReason: { type: "string" }
                }
              }
            }
          }
        }
      });

      return response.recommendations || [];
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [];
    } finally {
      setIsLearning(false);
    }
  }, [learnerProfiles, loadingChildren, personalizationProfile]);

  // Adapt content based on user preferences
  const adaptContent = useCallback((baseContent, adaptationType = 'tone') => {
    const profile = personalizationProfile;
    
    switch (adaptationType) {
      case 'tone':
        // Adapt tone based on parenting style
        if (profile.preferences.parentingStyle === 'gentle') {
          return baseContent.replace(/must|should/g, 'might consider').replace(/Don't/g, 'Try not to');
        }
        if (profile.preferences.parentingStyle === 'authoritative') {
          return baseContent; // Keep direct tone
        }
        break;
        
      case 'complexity':
        // Adapt complexity based on user behavior
        const avgEngagementTime = profile.behaviorPatterns.readArticle?.avgTime || 60;
        if (avgEngagementTime < 30) {
          // User prefers concise content
          return baseContent.split('.').slice(0, 2).join('.') + '.';
        }
        break;
        
      case 'timing':
        // Suggest optimal timing based on patterns
        const preferredTimes = profile.optimalTiming;
        if (preferredTimes?.morning) {
          return baseContent + '\n\nBest time to try: Morning hours work well for you!';
        }
        break;
    }
    
    return baseContent;
  }, [personalizationProfile]);

  // Learn from user feedback
  const processUserFeedback = useCallback(async (contentId, feedbackType, rating) => {
    try {
      setPersonalizationProfile(prev => ({
        ...prev,
        contentAffinities: {
          ...prev.contentAffinities,
          [contentId]: {
            feedbackType,
            rating,
            timestamp: new Date().toISOString()
          }
        }
      }));

      // Use feedback to improve future recommendations
      if (rating >= 4) {
        // User liked this content, learn from it
        trackBehavior('positive_feedback', { contentId, rating });
      } else if (rating <= 2) {
        // User disliked this content, avoid similar
        trackBehavior('negative_feedback', { contentId, rating });
      }
    } catch (error) {
      console.error('Error processing feedback:', error);
    }
  }, [trackBehavior]);

  // Smart scheduling based on user patterns
  const suggestOptimalTiming = useCallback((activityType) => {
    const patterns = personalizationProfile.behaviorPatterns;
    const mostActive = patterns[activityType]?.contexts || [];
    
    if (mostActive.length > 0) {
      // Analyze most common time patterns
      const timeAnalysis = mostActive.reduce((acc, context) => {
        const hour = new Date(context.timestamp).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      const optimalHour = Object.keys(timeAnalysis).reduce((a, b) => 
        timeAnalysis[a] > timeAnalysis[b] ? a : b
      );

      return {
        suggestedTime: `${optimalHour}:00`,
        confidence: timeAnalysis[optimalHour] / mostActive.length,
        reason: `Based on your activity patterns, ${optimalHour}:00 seems to work best for ${activityType}.`
      };
    }

    return null;
  }, [personalizationProfile]);

  const contextValue = {
    personalizationProfile,
    trackBehavior,
    generateRecommendations,
    adaptContent,
    processUserFeedback,
    suggestOptimalTiming,
    isLearning
  };

  return (
    <PersonalizationContext.Provider value={contextValue}>
      {children}
    </PersonalizationContext.Provider>
  );
};

export const usePersonalization = () => {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used within PersonalizationProvider');
  }
  return context;
};

// Hook for personalized content
export const usePersonalizedContent = (contentType, baseContent) => {
  const { adaptContent, trackBehavior } = usePersonalization();
  const [personalizedContent, setPersonalizedContent] = useState(baseContent);

  useEffect(() => {
    const adapted = adaptContent(baseContent, contentType);
    setPersonalizedContent(adapted);
    trackBehavior('view_personalized_content', { contentType });
  }, [baseContent, contentType, adaptContent, trackBehavior]);

  return personalizedContent;
};

// Hook for smart recommendations
export const useSmartRecommendations = (type = 'general', autoUpdate = true) => {
  const { generateRecommendations, isLearning } = usePersonalization();
  const [recommendations, setRecommendations] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (autoUpdate && (!lastUpdate || Date.now() - lastUpdate > 300000)) { // 5 minutes
      generateRecommendations(type).then(recs => {
        setRecommendations(recs);
        setLastUpdate(Date.now());
      });
    }
  }, [type, autoUpdate, generateRecommendations, lastUpdate]);

  const refreshRecommendations = useCallback(() => {
    generateRecommendations(type).then(recs => {
      setRecommendations(recs);
      setLastUpdate(Date.now());
    });
  }, [generateRecommendations, type]);

  return {
    recommendations,
    isLoading: isLearning,
    refresh: refreshRecommendations
  };
};