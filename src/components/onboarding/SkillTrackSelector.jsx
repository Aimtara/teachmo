
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  CheckCircle2,
  Star,
  Loader2
} from 'lucide-react';
import { SkillTrack, ChildSkillTrack } from '@/api/entities';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_TRACKS = [
  {
    name: "Cognitive Skills",
    description: "Problem-solving, critical thinking, and memory development",
    icon: Brain,
    color: "#6366f1",
    age_recommendations: { min_age: 2, max_age: 12 },
    related_categories: ["problem_solving", "educational"],
    sample_activities: ["Puzzles", "Memory games", "Logic challenges"]
  },
  {
    name: "Digital Fluency",
    description: "Safe and productive technology use, coding basics",
    icon: Laptop,
    color: "#3b82f6",
    age_recommendations: { min_age: 4, max_age: 16 },
    related_categories: ["educational", "problem_solving"],
    sample_activities: ["Coding games", "Digital art", "Online safety"]
  },
  {
    name: "Interpersonal Skills",
    description: "Communication, teamwork, and relationship building",
    icon: Users,
    color: "#ec4899",
    age_recommendations: { min_age: 3, max_age: 18 },
    related_categories: ["social", "emotional"],
    sample_activities: ["Group projects", "Role-playing", "Conversation practice"]
  },
  {
    name: "Self-Leadership",
    description: "Independence, decision-making, and personal responsibility",
    icon: Target,
    color: "#f59e0b",
    age_recommendations: { min_age: 4, max_age: 18 },
    related_categories: ["emotional", "social"],
    sample_activities: ["Goal setting", "Time management", "Decision trees"]
  },
  {
    name: "Academic Enrichment",
    description: "Core subjects beyond school curriculum",
    icon: GraduationCap,
    color: "#10b981",
    age_recommendations: { min_age: 5, max_age: 18 },
    related_categories: ["educational", "science"],
    sample_activities: ["Advanced math", "Science experiments", "Research projects"]
  },
  {
    name: "Global Awareness & Culture",
    description: "Understanding diverse perspectives and world cultures",
    icon: Globe,
    color: "#8b5cf6",
    age_recommendations: { min_age: 6, max_age: 18 },
    related_categories: ["educational", "social"],
    sample_activities: ["Cultural exploration", "Language learning", "Geography games"]
  },
  {
    name: "Creativity & Innovation",
    description: "Artistic expression and creative problem-solving",
    icon: Palette,
    color: "#ef4444",
    age_recommendations: { min_age: 2, max_age: 18 },
    related_categories: ["creative", "art"],
    sample_activities: ["Art projects", "Creative writing", "Invention challenges"]
  },
  {
    name: "Future Readiness",
    description: "21st-century skills and adaptability",
    icon: Rocket,
    color: "#06b6d4",
    age_recommendations: { min_age: 8, max_age: 18 },
    related_categories: ["educational", "problem_solving"],
    sample_activities: ["Innovation projects", "Future planning", "Adaptability games"]
  },
  {
    name: "Financial Literacy",
    description: "Money management and economic understanding",
    icon: DollarSign,
    color: "#84cc16",
    age_recommendations: { min_age: 6, max_age: 18 },
    related_categories: ["educational", "problem_solving"],
    sample_activities: ["Budgeting games", "Saving challenges", "Business basics"]
  },
  {
    name: "Social-Emotional Learning",
    description: "Emotional intelligence and social awareness",
    icon: Heart,
    color: "#f97316",
    age_recommendations: { min_age: 2, max_age: 18 },
    related_categories: ["emotional", "social"],
    sample_activities: ["Emotion recognition", "Empathy building", "Mindfulness"]
  }
];

export default function SkillTrackSelector({ child, onSave, onCancel, existingTracks = [] }) {
  const [availableTracks, setAvailableTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    initializeTracks();
  }, [child, existingTracks]);

  const initializeTracks = async () => {
    try {
      // Try to get tracks from database, fallback to defaults
      let tracks = await SkillTrack.list();
      if (tracks.length === 0) {
        // Create default tracks
        tracks = await Promise.all(
          DEFAULT_TRACKS.map(track => SkillTrack.create(track))
        );
      }
      
      // Filter tracks appropriate for child's age
      const ageAppropriate = tracks.filter(track => {
        if (!track.age_recommendations) return true;
        return child.age >= track.age_recommendations.min_age && 
               child.age <= track.age_recommendations.max_age;
      });
      
      setAvailableTracks(ageAppropriate);
      
      // Initialize selected tracks
      const initialSelection = {};
      existingTracks.forEach(childTrack => {
        initialSelection[childTrack.skill_track_name] = {
          selected: true,
          priority: childTrack.priority_level || 'medium',
          weeklyTarget: childTrack.target_weekly_activities || 2
        };
      });
      
      setSelectedTracks(initialSelection);
    } catch (error) {
      console.error('Error initializing tracks:', error);
      // Fallback to default tracks
      setAvailableTracks(DEFAULT_TRACKS);
    }
  };

  const handleTrackToggle = (trackName) => {
    setSelectedTracks(prev => ({
      ...prev,
      [trackName]: prev[trackName]?.selected 
        ? { ...prev[trackName], selected: false }
        : { selected: true, priority: 'medium', weeklyTarget: 2 }
    }));
  };

  const handlePriorityChange = (trackName, priority) => {
    setSelectedTracks(prev => ({
      ...prev,
      [trackName]: { ...prev[trackName], priority }
    }));
  };

  const handleWeeklyTargetChange = (trackName, target) => {
    setSelectedTracks(prev => ({
      ...prev,
      [trackName]: { ...prev[trackName], weeklyTarget: parseInt(target) }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete existing tracks for this child
      const existing = await ChildSkillTrack.filter({ child_id: child.id });
      await Promise.all(existing.map(track => ChildSkillTrack.delete(track.id)));
      
      // Create new tracks
      const tracksToCreate = Object.entries(selectedTracks)
        .filter(([_, config]) => config.selected)
        .map(([trackName, config]) => ({
          child_id: child.id,
          skill_track_name: trackName,
          priority_level: config.priority,
          target_weekly_activities: config.weeklyTarget
        }));
      
      await Promise.all(tracksToCreate.map(track => ChildSkillTrack.create(track)));
      
      onSave();
    } catch (error) {
      console.error('Error saving skill tracks:', error);
      alert('Failed to save skill tracks. Please try again.');
    }
    setIsSaving(false);
  };

  const selectedCount = Object.values(selectedTracks).filter(config => config.selected).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Development Focus Areas for {child.name}
        </h2>
        <p className="text-gray-600">
          Select 3-5 skill tracks to personalize {child.name}'s activities and recommendations
        </p>
        <Badge variant="outline" className="mt-2">
          {selectedCount} selected
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {availableTracks.map((track) => {
            const Icon = track.icon || Brain;
            const isSelected = selectedTracks[track.name]?.selected;
            const config = selectedTracks[track.name] || {};
            
            return (
              <motion.div
                key={track.name}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleTrackToggle(track.name)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center">
                    <Checkbox 
                      checked={isSelected}
                      onChange={() => handleTrackToggle(track.name)}
                    />
                  </div>
                  <div 
                    className="p-2 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: track.color + '20' }}
                  >
                    <Icon 
                      className="w-6 h-6" 
                      style={{ color: track.color }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{track.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">{track.description}</p>
                    
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3 mt-3 pt-3 border-t border-gray-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">
                            Priority Level
                          </label>
                          <Select 
                            value={config.priority || 'medium'} 
                            onValueChange={(value) => handlePriorityChange(track.name, value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low Priority</SelectItem>
                              <SelectItem value="medium">Medium Priority</SelectItem>
                              <SelectItem value="high">High Priority</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-gray-700 block mb-1">
                            Weekly Activity Target
                          </label>
                          <Select 
                            value={String(config.weeklyTarget || 2)} 
                            onValueChange={(value) => handleWeeklyTargetChange(track.name, value)}
                          >
                            <SelectTrigger className="h-8 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1 activity per week</SelectItem>
                              <SelectItem value="2">2 activities per week</SelectItem>
                              <SelectItem value="3">3 activities per week</SelectItem>
                              <SelectItem value="4">4+ activities per week</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </motion.div>
                    )}
                    
                    {track.sample_activities && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Examples:</p>
                        <div className="flex flex-wrap gap-1">
                          {track.sample_activities.slice(0, 2).map((activity, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {activity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex justify-between items-center pt-6 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={selectedCount === 0 || isSaving}
            style={{ backgroundColor: 'var(--teachmo-sage)' }}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Skill Tracks ({selectedCount})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
