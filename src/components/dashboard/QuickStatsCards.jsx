
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Lightbulb, TrendingUp, Heart, Target } from "lucide-react"; // Added Target icon
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const StatCard = ({ title, value, icon: Icon, bgColor, delay = 0, linkTo }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
  >
    <Link to={linkTo}>
      <Card className="border-0 shadow-md bg-white/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 cursor-pointer group">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <p className="text-2xl font-bold text-gray-900 group-hover:text-sage-700 transition-colors">{value}</p>
            </div>
            <div className={`p-3 rounded-xl ${bgColor} bg-opacity-20 group-hover:bg-opacity-30 transition-all`}>
              <Icon className={`w-6 h-6 ${bgColor.replace('bg-', 'text-')} group-hover:scale-110 transition-transform`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  </motion.div>
);

export default function QuickStatsCards({ childrenCount, activitiesCount, weeklyStats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Children" // Changed title
        value={childrenCount}
        icon={Users}
        bgColor="bg-blue-500"
        delay={0.1}
        linkTo={createPageUrl("Settings")}
      />
      <StatCard
        title="Today's Activities" // Changed title
        value={activitiesCount}
        icon={Lightbulb}
        bgColor="bg-orange-500"
        delay={0.2}
        linkTo={createPageUrl("Activities")}
      />
      <StatCard
        title="Weekly Goals"
        value={`${Math.round((weeklyStats.activitiesCompleted / 5) * 100)}%`} // New stat, calculated value
        icon={Target} // New icon
        bgColor="bg-green-500"
        delay={0.3}
        linkTo={createPageUrl("Progress")} // Changed link
      />
      <StatCard
        title="Login Streak" // New stat
        value={`${weeklyStats.streak} days`} // New value from props
        icon={Heart} // Reused icon
        bgColor="bg-pink-500"
        delay={0.4}
        linkTo={createPageUrl("Achievements")} // New link
      />
    </div>
  );
}
