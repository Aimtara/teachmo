import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Calendar, Heart, Target, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { format, differenceInYears, differenceInMonths } from "date-fns";

export default function ChildCard({ child, onEdit, onDelete }) {
  const getAgeDisplay = () => {
    if (!child.birth_date) {
      // Fallback to age field if birth_date is not available
      return child.age ? `${child.age} years old` : "Age not specified";
    }
    
    const birthDate = new Date(child.birth_date);
    const years = differenceInYears(new Date(), birthDate);
    const months = differenceInMonths(new Date(), birthDate) % 12;
    
    if (years === 0) {
      return `${months} months old`;
    } else if (months === 0) {
      return `${years} years old`;
    } else {
      return `${years} years, ${months} months old`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-2xl border-2 border-white shadow-md"
                style={{backgroundColor: child.color || 'var(--teachmo-coral)'}}
              >
                {child.avatar || child.name[0].toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900">{child.name}</h3>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {getAgeDisplay()}
                </p>
                {child.grade_level && (
                  <p className="text-xs text-gray-500">{child.grade_level}</p>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                className="text-gray-500 hover:text-blue-600"
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="text-gray-500 hover:text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {child.interests && child.interests.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Heart className="w-3 h-3" />
                Interests
              </p>
              <div className="flex flex-wrap gap-1">
                {child.interests.slice(0, 4).map((interest, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                  >
                    {interest}
                  </Badge>
                ))}
                {child.interests.length > 4 && (
                  <Badge variant="outline" className="text-xs bg-gray-50">
                    +{child.interests.length - 4} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          {child.personality_traits && child.personality_traits.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Personality
              </p>
              <div className="flex flex-wrap gap-1">
                {child.personality_traits.slice(0, 3).map((trait, index) => (
                  <Badge 
                    key={index}
                    className="text-xs"
                    style={{backgroundColor: 'var(--teachmo-sage)', color: 'white'}}
                  >
                    {trait}
                  </Badge>
                ))}
                {child.personality_traits.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{child.personality_traits.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {child.development_goals && child.development_goals.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Target className="w-3 h-3" />
                Development Goals
              </p>
              <div className="space-y-1">
                {child.development_goals.slice(0, 2).map((goal, index) => (
                  <p key={index} className="text-xs text-gray-600 bg-green-50 px-2 py-1 rounded">
                    {goal}
                  </p>
                ))}
                {child.development_goals.length > 2 && (
                  <p className="text-xs text-gray-500">
                    +{child.development_goals.length - 2} more goals
                  </p>
                )}
              </div>
            </div>
          )}

          {child.challenges && child.challenges.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Current Focus Areas</p>
              <div className="space-y-1">
                {child.challenges.slice(0, 1).map((challenge, index) => (
                  <p key={index} className="text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded">
                    {challenge}
                  </p>
                ))}
                {child.challenges.length > 1 && (
                  <p className="text-xs text-gray-500">
                    +{child.challenges.length - 1} more areas
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}