import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Check, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SwipeableActivityCard({ activity, onComplete, onClick }) {
  const x = useMotionValue(0);

  // Swipe right to complete: background changes from cream to green
  const background = useTransform(x, [0, 150], ["#FEFCFA", "#dcfce7"]); 
  
  // Icon and text appear as you swipe
  const iconOpacity = useTransform(x, [20, 80], [0, 1]);
  const iconX = useTransform(x, [0, 80], [-20, 20]);

  const handleDragEnd = (event, info) => {
    // If dragged more than 150px, trigger completion
    if (info.offset.x > 150) {
      onComplete(activity);
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl">
      {/* Background layer for swipe feedback */}
      <motion.div
        style={{ background }}
        className="absolute inset-0 flex items-center justify-start p-4"
      >
        <motion.div
          style={{ opacity: iconOpacity, x: iconX }}
          className="flex items-center gap-2 text-green-700 font-bold"
        >
          <Check className="w-6 h-6" />
          <span>Complete!</span>
        </motion.div>
      </motion.div>

      {/* Draggable foreground card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 200 }} // Allow dragging right up to 200px
        style={{ x }}
        onDragEnd={handleDragEnd}
        onClick={onClick}
        className="relative bg-white p-4 border rounded-xl shadow-sm cursor-grab active:cursor-grabbing flex items-center gap-4"
      >
        <div className="flex-shrink-0 bg-yellow-100 p-2 rounded-full">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate">{activity.title}</p>
          <div className="flex items-center gap-2 mt-1">
             <Badge variant="outline" className="capitalize text-xs">{activity.category}</Badge>
             <Badge variant="outline" className="text-xs">{activity.duration}</Badge>
          </div>
        </div>
      </motion.div>
    </div>
  );
}