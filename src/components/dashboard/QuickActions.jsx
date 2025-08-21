import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Sparkles, Compass, BookHeart, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';

const actions = (hasChildren, hasCompletedActivity) => [
  ...(!hasChildren ? [{
    title: "Add Child Profile",
    description: "Get started",
    icon: UserPlus,
    url: createPageUrl("Settings"),
    color: "var(--teachmo-blue)"
  }] : []),
  {
    title: "New Activity",
    description: "Start a fun task",
    icon: Sparkles,
    url: createPageUrl("Activities"),
    color: "var(--teachmo-sage)"
  },
  {
    title: "Explore Events",
    description: "Find local fun",
    icon: Compass,
    url: createPageUrl("Discover"),
    color: "var(--teachmo-coral)"
  },
  {
    title: "Write in Journal",
    description: "Reflect on today",
    icon: BookHeart,
    url: createPageUrl("Journal"),
    color: "#6B7280"
  },
];


export default function QuickActions({ user, children, hasCompletedActivity }) {
    const availableActions = actions(children.length > 0, hasCompletedActivity).slice(0, 4);
    
    return (
        <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                    {availableActions.map((action, index) => (
                        <Link to={action.url} key={index}>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                <div className="flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-xl h-full" style={{ backgroundColor: action.color, color: 'white' }}>
                                    <action.icon className="w-6 h-6 sm:w-8 sm:h-8 mb-2" />
                                    <h4 className="font-bold text-sm sm:text-base leading-tight">{action.title}</h4>
                                    <p className="text-xs opacity-90 mt-1 hidden sm:block">{action.description}</p>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}