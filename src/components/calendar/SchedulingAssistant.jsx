import React, { useState, useEffect } from 'react';
import { CalendarEvent, Activity } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb, CalendarPlus } from 'lucide-react';
import { format, startOfWeek, endOfWeek, addDays, eachDayOfInterval, isSameDay } from 'date-fns';

export default function SchedulingAssistant({ user, children, onSchedule }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      generateSuggestions();
    }
  }, [user]);

  const generateSuggestions = async () => {
    setIsLoading(true);
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const scheduledEvents = await CalendarEvent.filter({
      user_id: user.id,
      start_time: { $gte: weekStart.toISOString() },
      end_time: { $lte: weekEnd.toISOString() },
    });
    
    const unscheduledActivities = await Activity.filter({ status: 'suggested' });

    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const potentialSlots = [];

    weekDays.forEach(day => {
      // Check for an empty weekday afternoon
      if (day.getDay() > 0 && day.getDay() < 6 && day >= now) {
        const afternoonSlot = {
          start: new Date(day.setHours(15, 0, 0, 0)),
          end: new Date(day.setHours(17, 0, 0, 0))
        };
        const hasConflict = scheduledEvents.some(e => new Date(e.start_time) < afternoonSlot.end && new Date(e.end_time) > afternoonSlot.start);
        if (!hasConflict) {
          potentialSlots.push({ time: 'Weekday Afternoon', date: day, timeLabel: `this ${format(day, 'cccc')}` });
        }
      }
      // Check for an empty weekend morning
      if ((day.getDay() === 6 || day.getDay() === 0) && day >= now) {
         const morningSlot = {
          start: new Date(day.setHours(10, 0, 0, 0)),
          end: new Date(day.setHours(12, 0, 0, 0))
        };
        const hasConflict = scheduledEvents.some(e => new Date(e.start_time) < morningSlot.end && new Date(e.end_time) > morningSlot.start);
        if (!hasConflict) {
            potentialSlots.push({ time: 'Weekend Morning', date: day, timeLabel: `this ${format(day, 'cccc')}` });
        }
      }
    });

    const finalSuggestions = potentialSlots.slice(0, 3).map(slot => {
      const activity = unscheduledActivities.find(a => !suggestions.some(s => s.activity.id === a.id));
      return activity ? { slot, activity } : null;
    }).filter(Boolean);

    setSuggestions(finalSuggestions);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-500" />Smart Suggestions</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          <p className="ml-2 text-gray-600">Finding opportunities...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (suggestions.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            Smart Suggestions
        </CardTitle>
        <p className="text-sm text-blue-800">Here are some ideas to fill your week!</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map(({ slot, activity }) => (
          <div key={activity.id} className="p-3 bg-white/70 rounded-lg flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-sm text-gray-800">{activity.title}</p>
              <p className="text-xs text-gray-600">For {slot.timeLabel}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => onSchedule(activity, slot.date)}>
                <CalendarPlus className="w-3 h-3 mr-1.5" />
                Schedule
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}