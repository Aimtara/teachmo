import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Brain, 
  Laptop, 
  Users, 
  Target, 
  GraduationCap, 
  Globe, 
  Palette, 
  Rocket, 
  DollarSign, 
  Heart,
  TrendingUp,
  Calendar,
  Settings,
  Plus
} from 'lucide-react';
import { ChildSkillTrack } from '@/api/entities';
import { Activity } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';
import SkillTrackSelector from '../onboarding/SkillTrackSelector';

const TRACK_ICONS = {
  "Cognitive Skills": Brain,
  "Digital Fluency": Laptop,
  "Interpersonal Skills": Users,
  "Self-Leadership": Target,
  "Academic Enrichment": GraduationCap,
  "Global Awareness & Culture": Globe,
  "Creativity & Innovation": Palette,
  "Future Readiness": Rocket,
  "Financial Literacy": DollarSign,
  "Social-Emotional Learning": Heart
};

const TRACK_COLORS = {
  "Cognitive Skills": "#6366f1",
  "Digital Fluency": "#3b82f6",
  "Interpersonal Skills": "#ec4899",
  "Self-Leadership": "#f59e0b",
  "Academic Enrichment": "#10b981",
  "Global Awareness & Culture": "#8b5cf6",
  "Creativity & Innovation": "#ef4444",
  "Future Readiness": "#06b6d4",
  "Financial Literacy": "#84cc16",
  "Social-Emotional Learning": "#f97316"
};

export default function SkillTrackProgress({ child, activities }) {
  const [skillTracks, setSkillTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSelector, setShowSelector] = useState(false);

  useEffect(() => {
    loadSkillTracks();
  }, [child]);

  const loadSkillTracks = async () => {
    if (!child) return;
    
    setIsLoading(true);
    try {
      const tracks = await ChildSkillTrack.filter({ child_id: child.id });
      
      // Calculate progress for each track
      const tracksWithProgress = tracks.map(track => {
        const trackActivities = activities.filter(activity => {
          // Map activity categories to skill tracks
          const categoryMapping = {
            "Cognitive Skills": ["problem_solving", "educational"],
            "Digital Fluency": ["educational", "problem_solving"],
            "Interpersonal Skills": ["social", "emotional"],
            "Self-Leadership": ["emotional", "social"],
            "Academic Enrichment": ["educational", "science"],
            "Global Awareness & Culture": ["educational", "social"],
            "Creativity & Innovation": ["creative", "art"],
            "Future Readiness": ["educational", "problem_solving"],
            "Financial Literacy": ["educational", "problem_solving"],
            "Social-Emotional Learning": ["emotional", "social"]
          };
          
          const relatedCategories = categoryMapping[track.skill_track_name] || [];
          return relatedCategories.includes(activity.category);
        });
        
        const completedActivities = trackActivities.filter(a => a.status === 'completed');
        const progressScore = trackActivities.length > 0 
          ? Math.round((completedActivities.length / trackActivities.length) * 100)
          : 0;
        
        return {
          ...track,
          totalActivities: trackActivities.length,
          completedActivities: completedActivities.length,
          progressScore,
          weeklyTarget: track.target_weekly_activities || 2
        };
      });
      
      setSkillTracks(tracksWithProgress);
    } catch (error) {
      console.error('Error loading skill tracks:', error);
    }
    setIsLoading(false);
  };

  const handleSkillTracksUpdated = () => {
    setShowSelector(false);
    loadSkillTracks();
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm bg-white/90 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{borderColor: 'var(--teachmo-sage)'}}></div>
        </CardContent>
      </Card>
    );
  }

  if (showSelector) {
    return (
      <Card className="border-0 shadow-sm bg-white/90 backdrop-blur-sm">
        <CardContent className="p-6">
          <SkillTrackSelector
            child={child}
            existingTracks={skillTracks}
            onSave={handleSkillTracksUpdated}
            onCancel={() => setShowSelector(false)}
          />
        </CardContent>
      </Card>
    );
  }

  if (skillTracks.length === 0) {
    return (
      <Card className="border-0 shadow-sm bg-white/90 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
            Skill Development Tracks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No skill tracks selected yet</h3>
            <p className="text-gray-600 mb-4">
              Choose development focus areas for {child?.name} to get more targeted activity recommendations.
            </p>
            <Button 
              onClick={() => setShowSelector(true)}
              style={{backgroundColor: 'var(--teachmo-sage)'}}
            >
              <Plus className="w-4 h-4 mr-2" />
              Choose Skill Tracks
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-white/90 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" style={{color: 'var(--teachmo-sage)'}} />
            Skill Development Tracks
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSelector(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Progress across {child?.name}'s focus areas
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence>
          {skillTracks.map((track, index) => {
            const Icon = TRACK_ICONS[track.skill_track_name] || Brain;
            const color = TRACK_COLORS[track.skill_track_name] || '#6366f1';
            
            return (
              <motion.div
                key={track.skill_track_name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg border border-gray-100"
                style={{backgroundColor: 'var(--teachmo-warm-white)'}}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: color + '20' }}
                    >
                      <Icon 
                        className="w-5 h-5" 
                        style={{ color }}
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{track.skill_track_name}</h4>
                      <p className="text-xs text-gray-600">
                        {track.completedActivities} of {track.totalActivities} activities completed
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={track.priority_level === 'high' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {track.priority_level} priority
                  </Badge>
                </div>
                
                <Progress 
                  value={track.progressScore} 
                  className="h-2 mb-2"
                />
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{track.progressScore}% complete</span>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Target: {track.weeklyTarget}/week</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}