import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award, Target, Star, Users } from "lucide-react";
import { motion } from "framer-motion";

const ProgressCard = ({ title, value, icon: Icon, bgColor, subtitle, delay = 0, onClick, isClickable = false }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.3 }}
    onClick={onClick}
    className={isClickable ? 'cursor-pointer' : ''}
  >
    <Card className={`border-0 shadow-sm bg-white/90 backdrop-blur-sm transition-all duration-300 ${isClickable ? 'hover:shadow-md hover:scale-105' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${bgColor} bg-opacity-20`}>
            <Icon className={`w-6 h-6 ${bgColor.replace('bg-', 'text-')}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export default function ProgressOverview({ children, selectedChild, onChildSelect, getChildProgress, onStatClick }) {
  const progress = selectedChild ? getChildProgress(selectedChild) : null;

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-white/90 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
              Progress Overview
            </CardTitle>
            <Select 
              value={selectedChild?.id || ""} 
              onValueChange={(value) => onChildSelect(children.find(c => c.id === value))}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select a child..." />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.id} value={child.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{backgroundColor: child.color || 'var(--teachmo-coral)'}}
                      />
                      {child.name} ({child.age} years old)
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {progress && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ProgressCard
            title="Total Activities"
            value={progress.totalActivities}
            icon={Target}
            bgColor="bg-blue-500"
            subtitle="Available activities"
            delay={0.1}
            onClick={() => onStatClick?.('total')}
            isClickable={!!onStatClick}
          />
          <ProgressCard
            title="Completed"
            value={progress.completedActivities}
            icon={Award}
            bgColor="bg-green-500"
            subtitle={`${progress.completionRate.toFixed(0)}% completion rate`}
            delay={0.2}
            onClick={() => onStatClick?.('completed')}
            isClickable={!!onStatClick}
          />
          <ProgressCard
            title="This Week"
            value={progress.weeklyCompleted}
            icon={TrendingUp}
            bgColor="bg-purple-500"
            subtitle="Activities completed"
            delay={0.3}
            onClick={() => onStatClick?.('weekly')}
            isClickable={!!onStatClick}
          />
          <ProgressCard
            title="Avg Rating"
            value={progress.averageRating.toFixed(1)}
            icon={Star}
            bgColor="bg-yellow-500"
            subtitle="Activity enjoyment"
            delay={0.4}
            onClick={() => onStatClick?.('rating')}
            isClickable={!!onStatClick}
          />
        </div>
      )}
    </div>
  );
}