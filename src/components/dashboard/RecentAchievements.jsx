import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Trophy, Award, Star, Sparkles, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInDays } from "date-fns";

const iconComponents = {
  Baby: Award,
  Rocket: Award,
  GraduationCap: Award,
  MessageSquareHeart: Award,
  CalendarCheck: Award,
  Flag: Award,
  PartyPopper: Award,
  Star: Star,
  ClipboardCheck: Award,
  Crown: Trophy,
  Flame: Award,
  Target: Award,
  Users: Award
};

export default function RecentAchievements({ achievements }) {
  const getAchievementIcon = (iconName) => {
    const IconComponent = iconComponents[iconName] || Award;
    return <IconComponent className="w-5 h-5" />;
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Trophy className="w-6 h-6 text-amber-600" />
            Recent Achievements
            <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white animate-pulse ml-2">
              <Sparkles className="w-3 h-3 mr-1" />
              New!
            </Badge>
          </CardTitle>
          <Link to={createPageUrl("Achievements")}>
            <Button variant="outline" size="sm" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-100">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <p className="text-amber-800 text-sm">
          🎉 Celebrate your parenting wins! You've earned {achievements.length} new badge{achievements.length !== 1 ? 's' : ''} recently.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {achievements.map((achievement, index) => {
            const daysAgo = differenceInDays(new Date(), new Date(achievement.date_earned));
            const isNew = daysAgo <= 1;
            
            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 p-4 bg-white/80 rounded-xl shadow-sm border border-amber-200"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
                  {getAchievementIcon(achievement.icon)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-amber-900">{achievement.name}</h4>
                    {isNew && (
                      <Badge className="bg-red-500 text-white text-xs animate-pulse">
                        NEW!
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-amber-800 mb-2">{achievement.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                        <Star className="w-3 h-3 mr-1" />
                        +{achievement.points_reward} Points
                      </Badge>
                      <span className="text-xs text-amber-600">
                        {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        
        <div className="mt-6 text-center">
          <Link to={createPageUrl("Achievements")}>
            <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg">
              <Trophy className="w-4 h-4 mr-2" />
              View All Achievements
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}