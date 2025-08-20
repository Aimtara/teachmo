
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ListChecks, Clock, ChevronRight, Plus, Target } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const categoryColors = {
  creative: "bg-purple-100 text-purple-800",
  educational: "bg-blue-100 text-blue-800",
  physical: "bg-green-100 text-green-800",
  social: "bg-pink-100 text-pink-800",
  emotional: "bg-indigo-100 text-indigo-800",
  problem_solving: "bg-orange-100 text-orange-800",
  science: "bg-cyan-100 text-cyan-800",
  art: "bg-red-100 text-red-800",
  music: "bg-yellow-100 text-yellow-800",
  outdoor: "bg-emerald-100 text-emerald-800"
};

export default function TodayActivities({ activities, children }) {
  // Filter for planned activities only
  const plannedActivities = activities.filter(activity =>
    activity.status === 'planned'
  );

  // Group planned activities by child
  const activitiesByChild = {};
  plannedActivities.forEach(activity => {
    const child = children.find(c => c.id === activity.child_id);
    const childKey = child ? child.id : 'general';
    const childName = child ? child.name : 'General Activities';

    if (!activitiesByChild[childKey]) {
      activitiesByChild[childKey] = {
        child: child,
        childName: childName,
        activities: []
      };
    }
    activitiesByChild[childKey].activities.push(activity);
  });

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState(null);

  const handleActivityClick = (activity) => {
    setSelectedActivity(activity);
    setShowDetailModal(true);
  };

  return (
    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ListChecks className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
            Today's Planned Activities
          </CardTitle>
          <Link to={createPageUrl("Activities")}>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Plan More
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(activitiesByChild).length > 0 ? (
          <div className="space-y-6">
            {Object.values(activitiesByChild).map((group, groupIndex) => (
              <div key={group.childName} className="space-y-3">
                <div className="flex items-center gap-2">
                  {group.child && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{backgroundColor: group.child.color || 'var(--teachmo-coral)'}}
                    >
                      {group.child.avatar || group.child.name[0].toUpperCase()}
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900">{group.childName}</h3>
                  <Badge variant="outline" className="text-xs">
                    {group.activities.length} {group.activities.length === 1 ? 'activity' : 'activities'}
                  </Badge>
                </div>

                <div className="space-y-2 ml-8">
                  {group.activities.slice(0, 2).map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (groupIndex * 0.1) + (index * 0.05) }}
                      className="p-3 rounded-lg border border-gray-100 hover:shadow-md transition-all duration-300 cursor-pointer group"
                      style={{backgroundColor: 'var(--teachmo-warm-white)'}}
                      onClick={() => handleActivityClick(activity)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 group-hover:text-sage-700 transition-colors text-sm">
                            {activity.title}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              className={`text-xs ${categoryColors[activity.category] || "bg-gray-100 text-gray-800"}`}
                            >
                              {activity.category?.replace(/_/g, ' ')}
                            </Badge>
                            {activity.duration && (
                              <Badge variant="outline" className="text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                {activity.duration}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-sage-600 transition-colors" />
                      </div>
                    </motion.div>
                  ))}

                  {group.activities.length > 2 && (
                    <p className="text-xs text-gray-500 ml-3">
                      +{group.activities.length - 2} more planned activities
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No activities planned for today</h3>
            <p className="text-gray-600 mb-4">
              Start by planning some activities to make the most of your day!
            </p>
            <Link to={createPageUrl("Activities")}>
              <Button style={{backgroundColor: 'var(--teachmo-sage)'}}>
                <Plus className="w-4 h-4 mr-2" />
                Choose Activities
              </Button>
            </Link>
          </div>
        )}
      </CardContent>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{selectedActivity.title}</DialogTitle>
              <DialogDescription>
                Details for this planned activity.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-3">
              <p className="text-sm text-gray-700">{selectedActivity.description}</p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  className={`text-sm ${categoryColors[selectedActivity.category] || "bg-gray-100 text-gray-800"}`}
                >
                  {selectedActivity.category?.replace(/_/g, ' ')}
                </Badge>
                {selectedActivity.duration && (
                  <Badge variant="outline" className="text-sm">
                    <Clock className="w-4 h-4 mr-1" />
                    {selectedActivity.duration}
                  </Badge>
                )}
                {selectedActivity.child_id && children.find(c => c.id === selectedActivity.child_id) && (
                  <Badge variant="outline" className="text-sm">
                    For: {children.find(c => c.id === selectedActivity.child_id).name}
                  </Badge>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
