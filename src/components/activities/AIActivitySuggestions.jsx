import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Clock, Users, RefreshCw, Zap, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiActivitySuggestions } from '@/api/functions';
import { Activity } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';

export default function AIActivitySuggestions({ children, onActivityAdd }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    }
  }, [children]);

  useEffect(() => {
    if (selectedChild) {
      generateSuggestions();
    }
  }, [selectedChild]);

  const generateSuggestions = async () => {
    if (!selectedChild || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await aiActivitySuggestions({
        child: selectedChild,
        count: 4
      });
      
      if (response.success) {
        setSuggestions(response.data || []);
      } else {
        throw new Error(response.error || 'Failed to generate suggestions');
      }
    } catch (err) {
      console.error('Error generating AI suggestions:', err);
      setError('Unable to generate suggestions right now. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddActivity = async (suggestion) => {
    try {
      const activityData = {
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.category,
        age_range: suggestion.age_range,
        duration: suggestion.duration,
        learning_objectives: suggestion.learning_objectives || [],
        child_id: selectedChild.id,
        status: 'planned',
        is_personalized: suggestion.is_personalized !== false
      };

      const newActivity = await Activity.create(activityData);
      
      toast({
        title: "Activity Added!",
        description: `"${suggestion.title}" has been added to your planned activities.`,
      });
      
      onActivityAdd?.(newActivity);
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add activity. Please try again.",
      });
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      creative: 'bg-pink-100 text-pink-800',
      educational: 'bg-blue-100 text-blue-800',
      physical: 'bg-green-100 text-green-800',
      social: 'bg-purple-100 text-purple-800',
      science: 'bg-cyan-100 text-cyan-800',
      art: 'bg-orange-100 text-orange-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (children.length === 0) return null;

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-blue-600" />
            AI Activity Suggestions
          </CardTitle>
          <div className="flex items-center gap-2">
            {children.length > 1 && (
              <div className="flex gap-1">
                {children.map((child) => (
                  <Button
                    key={child.id}
                    variant={selectedChild?.id === child.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedChild(child)}
                    className="text-xs px-2 py-1 h-7"
                  >
                    {child.name}
                  </Button>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={generateSuggestions}
              disabled={isLoading}
              className="text-blue-600"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        {selectedChild && (
          <p className="text-sm text-gray-600">
            Personalized for {selectedChild.name} ({selectedChild.age} years old)
          </p>
        )}
      </CardHeader>
      
      <CardContent>
        {error ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-red-600 text-sm mb-3">{error}</p>
            <Button onClick={generateSuggestions} size="sm">
              Try Again
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 bg-white rounded-lg">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-2/3 mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : suggestions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-white rounded-lg border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                      {suggestion.title}
                    </h4>
                    {suggestion.is_personalized && (
                      <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 ml-2" />
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                    {suggestion.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    <Badge className={getCategoryColor(suggestion.category)} size="sm">
                      {suggestion.category}
                    </Badge>
                    {suggestion.duration && (
                      <Badge variant="outline" size="sm" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {suggestion.duration}
                      </Badge>
                    )}
                    {suggestion.age_range && (
                      <Badge variant="outline" size="sm" className="text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {suggestion.age_range.min_age}-{suggestion.age_range.max_age}y
                      </Badge>
                    )}
                  </div>
                  
                  <Button
                    onClick={() => handleAddActivity(suggestion)}
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add to Activities
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-6">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-3">
              Ready to discover amazing activities for {selectedChild?.name}?
            </p>
            <Button onClick={generateSuggestions}>
              Generate Suggestions
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}