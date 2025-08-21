
import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Book, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';
import { isToday, parseISO, isAfter, isBefore, startOfDay } from 'date-fns'; // Added parseISO, isAfter, isBefore, startOfDay
import { Activity, Assignment } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';
import SwipeableActivityCard from '../activities/SwipeableActivityCard';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const getIconForType = (type) => {
  switch (type) {
    case 'activity': return <Lightbulb className="w-5 h-5 text-yellow-500" />;
    case 'assignment': return <Book className="w-5 h-5 text-blue-500" />;
    case 'message': return <MessageSquare className="w-5 h-5 text-green-500" />;
    default: return <Lightbulb className="w-5 h-5 text-gray-500" />;
  }
};

export default function TodaysFocus({ user, activities = [], schoolAssignments = [], messages = [], onUpdate }) {
  const [selectedActivity, setSelectedActivity] = useState(null);
  const { toast } = useToast();

  // New state variables
  const [currentFocus, setCurrentFocus] = useState('today');
  const [isLoading, setIsLoading] = useState(false);

  // Safely filter activities with null checks
  // Note: These filters are for activities only and use 'due_date' as primary date for 'planned' activities.
  const todayActivitiesFiltered = useMemo(() => {
    return activities.filter(activity => {
      if (!activity || !activity.status) return false;
      return activity.status === 'planned' && 
             activity.due_date && 
             isToday(parseISO(activity.due_date));
    }).map(a => ({ ...a, type: 'activity' })); // Add type for consistent rendering in todaysItems
  }, [activities]);

  const upcomingActivities = useMemo(() => {
    return activities.filter(activity => {
      if (!activity || !activity.status) return false;
      return activity.status === 'planned' && 
             activity.due_date && 
             isAfter(parseISO(activity.due_date), new Date()) && 
             !isToday(parseISO(activity.due_date));
    }).slice(0, 3);
  }, [activities]);

  const overdueActivities = useMemo(() => {
    return activities.filter(activity => {
      if (!activity || !activity.status) return false;
      return activity.status === 'planned' && 
             activity.due_date && 
             isBefore(parseISO(activity.due_date), startOfDay(new Date()));
    });
  }, [activities]);

  const handleActivityComplete = async (activity) => {
    try {
      await Activity.update(activity.id, { 
        status: 'completed', 
        completion_date: new Date().toISOString() 
      });
      toast({
        title: "Activity Completed! 🎉",
        description: `Great job on completing "${activity.title}".`,
      });
      onUpdate(); // Refresh dashboard data
    } catch (error) {
      console.error("Failed to complete activity:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not mark the activity as completed. Please try again.",
      });
    }
  };

  const todaysItems = useMemo(() => {
    // Original filtering for assignments remains the same
    const todaysAssignments = (schoolAssignments || [])
      .filter(a => a.due_date && isToday(new Date(a.due_date)))
      .map(a => ({ ...a, type: 'assignment' }));

    // Combine the newly filtered todayActivities with existing todaysAssignments
    // The sorting key now primarily uses 'due_date' as 'todayActivitiesFiltered' are based on it
    return [...todayActivitiesFiltered, ...todaysAssignments].sort((a, b) => {
      const dateA = new Date(a.due_date || a.completion_date); // fallback to completion_date if due_date is null
      const dateB = new Date(b.due_date || b.completion_date); // fallback to completion_date if due_date is null
      return dateA.getTime() - dateB.getTime(); // Use getTime() for reliable date comparison
    });
  }, [todayActivitiesFiltered, schoolAssignments]);


  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-800">Today's Focus</CardTitle>
      </CardHeader>
      <CardContent>
        {todaysItems.length > 0 ? (
          <div className="space-y-4">
            {todaysItems.map((item, index) => {
              if (item.type === 'activity') {
                return (
                  <SwipeableActivityCard
                    key={`activity-${item.id}-${index}`}
                    activity={item}
                    onComplete={handleActivityComplete}
                    onClick={() => console.log('Open activity detail modal')}
                  />
                );
              }
              if (item.type === 'assignment') {
                return (
                  <div key={`assignment-${item.id}`} className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-lg">
                    <div className="flex-shrink-0">{getIconForType(item.type)}</div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{item.title}</p>
                      <p className="text-sm text-gray-600">{item.description}</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <ArrowRight className="w-5 h-5 text-gray-500" />
                    </Button>
                  </div>
                );
              }
              return null;
            })}
          </div>
        ) : (
          <div className="text-center py-8 px-4">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Clear for Today!</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              You have no planned activities for today. Why not discover something new to do?
            </p>
            <Link to={createPageUrl("UnifiedDiscover")}>
                <Button size="lg" style={{backgroundColor: 'var(--teachmo-sage)'}} className="text-white">
                    Discover New Activities
                </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
