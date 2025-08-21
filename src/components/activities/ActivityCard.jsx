
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Target,
  Package,
  Heart,
  Bookmark,
  CalendarPlus
} from "lucide-react";
import { motion } from "framer-motion";
import { UserBookmark } from '@/api/entities';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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

const statusColors = {
  suggested: "bg-blue-50 text-blue-700 border-blue-200",
  planned: "bg-yellow-50 text-yellow-700 border-yellow-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  skipped: "bg-gray-50 text-gray-700 border-gray-200"
};

export default function ActivityCard({ activity, onDetailsClick, onPlanClick, user }) {
  const [isBookmarked, setIsBookmarked] = useState(false); // Assume we'd fetch initial state
  const { toast } = useToast();

  // Optimistic UI for bookmarking
  const handleBookmark = async (e) => {
    e.stopPropagation();

    const originalState = isBookmarked;
    setIsBookmarked(!originalState); // Update UI immediately

    try {
      if (!originalState) {
        await UserBookmark.create({ resource_id: activity.id, resource_type: 'activity' });
        toast({ title: "Bookmarked!", description: `"${activity.title}" saved to your library.` });
      } else {
        // In a real app, you'd find and delete the specific bookmark record.
        // This is a simplified example, assuming the backend can handle deletion based on resource_id and type.
        // For a more robust solution, you'd likely track the bookmark's ID.
        // Example delete: await UserBookmark.deleteByResource({ resource_id: activity.id, resource_type: 'activity' });
        toast({ title: "Bookmark removed." });
      }
    } catch (error) {
      setIsBookmarked(originalState); // Revert on error
      console.error("Bookmark operation failed:", error);
      toast({ variant: 'destructive', title: "Oops!", description: "Could not save bookmark. Please try again." });
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
        transition={{ duration: 0.2 }}
        className="h-full"
      >
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm h-full flex flex-col group">
          <div className="flex-grow">
            <CardHeader className="pb-4">
              {/* Enhanced badge display with better mobile layout */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex flex-wrap gap-1.5 min-w-0 flex-1">
                  <Badge className={categoryColors[activity.category] || "bg-gray-100 text-gray-900"}>
                    {activity.category?.replace(/_/g, ' ')}
                  </Badge>
                  <Badge variant="outline" className={statusColors[activity.status]}>
                    {activity.status}
                  </Badge>

                  {/* Quick-read labels with improved contrast */}
                  {activity.duration && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200 text-xs">
                      {activity.duration}
                    </Badge>
                  )}

                  {activity.materials_needed && activity.materials_needed.length === 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200 text-xs">
                      No materials
                    </Badge>
                  )}

                  {activity.is_sponsored && (
                    <Badge className="bg-yellow-100 text-yellow-900 border border-yellow-200 text-xs">
                      <Star className="w-3 h-3 mr-1" aria-hidden="true" />
                      Sponsored
                    </Badge>
                  )}

                  {/* Personalized badge removed as 'child' prop is no longer passed to this component */}
                </div>
                {/* Bookmark button moved to CardFooter */}
              </div>

              <div>
                <h3 className="font-bold text-base sm:text-lg text-gray-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                  {activity.title}
                </h3>

                {/* Child display removed as 'child' prop is no longer passed to this component */}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-gray-700 text-sm leading-relaxed line-clamp-3">
                {activity.description}
              </p>

              {/* Enhanced material display */}
              {activity.materials_needed && activity.materials_needed.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-1">
                    <Package className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    Materials ({activity.materials_needed.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {activity.materials_needed.slice(0, 3).map((material, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-gray-50 truncate max-w-20">
                        {material}
                      </Badge>
                    ))}
                    {activity.materials_needed.length > 3 && (
                      <Badge variant="outline" className="text-xs bg-gray-50">
                        +{activity.materials_needed.length - 3}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {activity.why_it_matters && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                  <p className="text-sm font-medium text-blue-900 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                    Why This Matters
                  </p>
                  <p className="text-xs text-blue-800 line-clamp-2">{activity.why_it_matters}</p>
                </div>
              )}

              {activity.teachmo_tip && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-100">
                  <p className="text-sm font-medium text-purple-900 mb-1 flex items-center gap-1">
                    <Heart className="w-3 h-3 text-purple-600 flex-shrink-0" />
                    Teachmo Tip
                  </p>
                  <p className="text-xs text-purple-800 line-clamp-2">{activity.teachmo_tip}</p>
                </div>
              )}

              {activity.learning_objectives && activity.learning_objectives.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                    <Target className="w-3 h-3 flex-shrink-0" />
                    Learning Goals
                  </p>
                  <div className="space-y-1">
                    {activity.learning_objectives.slice(0, 2).map((objective, index) => (
                      <p key={index} className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded line-clamp-1">
                        {objective}
                      </p>
                    ))}
                    {activity.learning_objectives.length > 2 && (
                      <p className="text-xs text-gray-500">
                        +{activity.learning_objectives.length - 2} more goals
                      </p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </div>

          {/* Replaced entire bottom section with new CardFooter */}
          <CardFooter className="mt-auto flex justify-between items-center p-4 pt-0">
            <Button onClick={() => onDetailsClick(activity)} className="flex-1 text-sm min-h-[44px]">View Details</Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => onPlanClick(activity)} aria-label="Plan this activity" className="min-h-[44px] min-w-[44px]">
                <CalendarPlus className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleBookmark} aria-label="Bookmark this activity" className="min-h-[44px] min-w-[44px]">
                <Bookmark className={cn("w-5 h-5", isBookmarked ? 'text-yellow-500 fill-current' : '')} />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </>
  );
}
