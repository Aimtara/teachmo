import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award, Target, Lightbulb } from "lucide-react";
import { startOfWeek, endOfWeek, isWithinInterval, format } from "date-fns";

export default function WeeklyInsights({ child, activities, tips }) {
  const thisWeek = {
    start: startOfWeek(new Date()),
    end: endOfWeek(new Date())
  };

  const weeklyActivities = activities.filter(activity => {
    if (!activity.completion_date) return false;
    const completionDate = new Date(activity.completion_date);
    return isWithinInterval(completionDate, thisWeek);
  });

  const weeklyTips = tips.filter(tip => {
    if (!tip.created_date) return false;
    const createdDate = new Date(tip.created_date);
    return isWithinInterval(createdDate, thisWeek);
  });

  const implementedTips = weeklyTips.filter(tip => tip.is_read);

  const getTopCategory = () => {
    const categoryCount = weeklyActivities.reduce((acc, activity) => {
      acc[activity.category] = (acc[activity.category] || 0) + 1;
      return acc;
    }, {});
    
    return Object.entries(categoryCount).sort(([,a], [,b]) => b - a)[0];
  };

  const topCategory = getTopCategory();
  const averageRating = weeklyActivities.length > 0 
    ? weeklyActivities.reduce((sum, a) => sum + (a.rating || 0), 0) / weeklyActivities.length 
    : 0;

  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
          Weekly Insights {child && `- ${child.name}`}
          <Badge variant="outline" className="ml-2">
            {format(thisWeek.start, 'MMM d')} - {format(thisWeek.end, 'MMM d')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center p-4 rounded-xl" style={{backgroundColor: 'var(--teachmo-cream)'}}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-100 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{weeklyActivities.length}</p>
            <p className="text-sm text-gray-600">Activities Completed</p>
          </div>

          <div className="text-center p-4 rounded-xl" style={{backgroundColor: 'var(--teachmo-cream)'}}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
              <Lightbulb className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{implementedTips.length}</p>
            <p className="text-sm text-gray-600">Tips Implemented</p>
          </div>

          <div className="text-center p-4 rounded-xl" style={{backgroundColor: 'var(--teachmo-cream)'}}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-100 flex items-center justify-center">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {averageRating > 0 ? averageRating.toFixed(1) : '—'}
            </p>
            <p className="text-sm text-gray-600">Average Rating</p>
          </div>

          <div className="text-center p-4 rounded-xl" style={{backgroundColor: 'var(--teachmo-cream)'}}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-orange-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {topCategory ? topCategory[0].replace(/_/g, ' ') : 'None'}
            </p>
            <p className="text-sm text-gray-600">Top Focus Area</p>
          </div>
        </div>

        {weeklyActivities.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">This Week's Highlights</h3>
            <div className="space-y-3">
              {weeklyActivities.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50">
                  <div>
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">
                      Completed on {format(new Date(activity.completion_date), 'MMM d')}
                    </p>
                  </div>
                  {activity.rating && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      ⭐ {activity.rating}/5
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {weeklyActivities.length === 0 && implementedTips.length === 0 && (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No activities completed this week yet.</p>
            <p className="text-sm text-gray-500">Complete some activities to see your progress!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
