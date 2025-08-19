import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Lightbulb, Star, Calendar, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const categoryColors = {
  creative: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  educational: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  physical: "bg-green-100 text-green-800 hover:bg-green-200",
  social: "bg-pink-100 text-pink-800 hover:bg-pink-200",
  emotional: "bg-indigo-100 text-indigo-800 hover:bg-indigo-200",
  problem_solving: "bg-orange-100 text-orange-800 hover:bg-orange-200",
  science: "bg-cyan-100 text-cyan-800 hover:bg-cyan-200",
  art: "bg-red-100 text-red-800 hover:bg-red-200",
  music: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  outdoor: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
};

export default function ActivityProgress({ child, activities, onActivityClick }) {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [showRecentDetails, setShowRecentDetails] = useState(false);
  
  const completedActivities = activities.filter(a => a.status === 'completed');
  const categoryStats = activities.reduce((acc, activity) => {
    const category = activity.category;
    if (!acc[category]) {
      acc[category] = { total: 0, completed: 0, activities: [] };
    }
    acc[category].total++;
    acc[category].activities.push(activity);
    if (activity.status === 'completed') {
      acc[category].completed++;
    }
    return acc;
  }, {});

  const handleCategoryClick = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  return (
    <Card className="border-0 shadow-sm bg-white/90 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
          Activity Progress {child && `- ${child.name}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(categoryStats).length > 0 ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Progress by Category</h3>
                <Badge variant="outline" className="text-xs">
                  {Object.keys(categoryStats).length} categories
                </Badge>
              </div>
              {Object.entries(categoryStats)
                .sort(([,a], [,b]) => b.completed - a.completed)
                .map(([category, stats]) => (
                <div key={category} className="space-y-2">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors"
                    onClick={() => handleCategoryClick(category)}
                  >
                    <Badge className={`${categoryColors[category] || "bg-gray-100 text-gray-800"} transition-colors cursor-pointer`}>
                      {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {stats.completed}/{stats.total}
                      </span>
                      {expandedCategory === category ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                  <Progress 
                    value={(stats.completed / stats.total) * 100} 
                    className="h-2"
                  />
                  
                  <AnimatePresence>
                    {expandedCategory === category && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 space-y-1 border-l-2 border-gray-200">
                          {stats.activities.slice(0, 3).map((activity) => (
                            <div 
                              key={activity.id}
                              className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                              onClick={() => onActivityClick?.(activity)}
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-gray-900 truncate flex-1 mr-2">{activity.title}</p>
                                <Badge 
                                  variant={activity.status === 'completed' ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {activity.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          {stats.activities.length > 3 && (
                            <p className="text-xs text-gray-500 pl-2">
                              +{stats.activities.length - 3} more activities
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {completedActivities.length > 0 && (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 text-sm">Recent Completions</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRecentDetails(!showRecentDetails)}
                    className="text-xs h-7"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    {showRecentDetails ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
                <div className="space-y-2">
                  {completedActivities.slice(0, showRecentDetails ? 6 : 3).map((activity) => (
                    <div 
                      key={activity.id} 
                      className="p-2 rounded-lg cursor-pointer hover:shadow-sm transition-all duration-200" 
                      style={{backgroundColor: 'var(--teachmo-cream)'}}
                      onClick={() => onActivityClick?.(activity)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">{activity.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge 
                              variant="outline" 
                              className={`${categoryColors[activity.category] || "bg-gray-100 text-gray-800"} text-xs`}
                            >
                              {activity.category?.replace(/_/g, ' ')}
                            </Badge>
                            {activity.completion_date && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(activity.completion_date), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                        {activity.rating && (
                          <div className="flex items-center gap-1 ml-2">
                            <Star className="w-3 h-3 text-yellow-400 fill-current" />
                            <span className="text-xs font-medium">{activity.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {completedActivities.length > 3 && !showRecentDetails && (
                    <p className="text-xs text-gray-500 text-center">
                      +{completedActivities.length - 3} more completed activities
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <Lightbulb className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600">No activities yet. Generate some activities to start tracking progress!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}