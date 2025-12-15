import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock, Package, Target, Star, CheckCircle, Play, RotateCcw, Share2, Bookmark, BookmarkCheck, CalendarPlus, Heart, Sparkles, Edit, ShoppingCart, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import EventModal from "../calendar/EventModal";
import { User } from "@/api/entities";
import { Activity } from "@/api/entities";
import { invokeLLM } from "@/api/integrations";

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

// Material search function to find purchase links
const searchMaterialLinks = async (material) => {
  const searchQueries = [
    `${material} buy online kids children`,
    `${material} amazon purchase`,
    `${material} educational supplies`
  ];
  
  // Mock implementation - in real app, this would use shopping APIs
  const mockLinks = {
    'construction paper': 'https://www.amazon.com/s?k=construction+paper+kids',
    'crayons': 'https://www.amazon.com/s?k=crayons+kids',
    'markers': 'https://www.amazon.com/s?k=washable+markers+kids',
    'glue stick': 'https://www.amazon.com/s?k=glue+stick+kids',
    'scissors': 'https://www.amazon.com/s?k=safety+scissors+kids',
    'paint': 'https://www.amazon.com/s?k=washable+paint+kids',
    'cardboard': 'https://www.amazon.com/s?k=cardboard+sheets+crafts',
    'tape': 'https://www.amazon.com/s?k=tape+kids+crafts',
    'playdough': 'https://www.amazon.com/s?k=playdough+kids',
    'blocks': 'https://www.amazon.com/s?k=building+blocks+kids'
  };
  
  const lowerMaterial = material.toLowerCase();
  for (const [key, link] of Object.entries(mockLinks)) {
    if (lowerMaterial.includes(key)) {
      return link;
    }
  }
  
  return `https://www.amazon.com/s?k=${encodeURIComponent(material)}+kids`;
};

// Customization Modal Component
const CustomizationModal = ({ activity, child, onSave, onClose }) => {
  const [customization, setCustomization] = useState('');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customizedActivity, setCustomizedActivity] = useState(null);

  const handleCustomize = async () => {
    if (!customization.trim()) return;
    
    setIsCustomizing(true);
    try {
      const response = await invokeLLM({
        prompt: `As Teachmo, an expert child development coach, please customize this activity based on the parent's request.

Original Activity:
Title: ${activity.title}
Description: ${activity.description}
Instructions: ${activity.instructions?.join('\n') || 'No instructions provided'}
Materials: ${activity.materials_needed?.join(', ') || 'No materials listed'}

Child Information:
Name: ${child?.name || 'Child'}
Age: ${child?.age || 'Not specified'}
Interests: ${child?.interests?.join(', ') || 'Not specified'}

Parent's Customization Request:
${customization}

Please provide a customized version that:
1. Maintains the educational value and core learning objectives
2. Incorporates the parent's specific requests
3. Remains age-appropriate for the child
4. Includes updated step-by-step instructions
5. Lists any new materials needed
6. Explains why these changes benefit the child

Provide a complete, modified activity that's ready to use.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            instructions: { type: "array", items: { type: "string" } },
            materials_needed: { type: "array", items: { type: "string" } },
            learning_objectives: { type: "array", items: { type: "string" } },
            teachmo_tip: { type: "string" },
            customization_explanation: { type: "string" }
          }
        }
      });

      if (response) {
        setCustomizedActivity(response);
      }
    } catch (error) {
      console.error("Error customizing activity:", error);
    } finally {
      setIsCustomizing(false);
    }
  };

  const handleSaveCustomization = () => {
    if (customizedActivity) {
      onSave({ ...activity, ...customizedActivity, is_customized: true });
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Customize Activity</h3>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {!customizedActivity ? (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Tell me how you'd like to customize this activity</h4>
                <p className="text-sm text-blue-800 mb-3">
                  I can help you adapt "{activity.title}" to better fit your child's needs, interests, or available materials.
                </p>
                <p className="text-xs text-blue-700">
                  Examples: "Make it easier for a 3-year-old", "Use materials I have at home", "Add more science concepts", "Make it more hands-on"
                </p>
              </div>

              <div>
                <Label htmlFor="customization">What would you like to change?</Label>
                <Textarea
                  id="customization"
                  placeholder="Describe how you'd like to modify this activity..."
                  value={customization}
                  onChange={(e) => setCustomization(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCustomize}
                  disabled={!customization.trim() || isCustomizing}
                >
                  {isCustomizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {isCustomizing ? 'Customizing...' : 'Customize Activity'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  <strong>Customization Complete!</strong> {customizedActivity.customization_explanation}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div>
                  <Label className="font-semibold">Updated Title</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded">{customizedActivity.title}</p>
                </div>
                
                <div>
                  <Label className="font-semibold">Updated Description</Label>
                  <p className="text-sm bg-gray-50 p-2 rounded">{customizedActivity.description}</p>
                </div>

                {customizedActivity.instructions && (
                  <div>
                    <Label className="font-semibold">Updated Instructions</Label>
                    <div className="space-y-1">
                      {customizedActivity.instructions.map((instruction, index) => (
                        <p key={index} className="text-sm bg-gray-50 p-2 rounded flex items-start gap-2">
                          <span className="font-medium text-blue-600">{index + 1}.</span>
                          {instruction}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {customizedActivity.materials_needed && (
                  <div>
                    <Label className="font-semibold">Updated Materials</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {customizedActivity.materials_needed.map((material, index) => (
                        <Badge key={index} variant="outline" className="bg-green-50">
                          {material}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setCustomizedActivity(null)}>
                  Start Over
                </Button>
                <Button onClick={handleSaveCustomization}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Customized Activity
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function ActivityDetailModal({ activity, child, onClose, onStatusChange, onRating, onBookmark, isBookmarked }) {
  const [showCopiedMessage, setShowCopiedMessage] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [materialLinks, setMaterialLinks] = useState({});

  React.useEffect(() => {
    User.me().then(setCurrentUser).catch(() => {});
    
    // Load shopping links for materials
    if (activity.materials_needed) {
      loadMaterialLinks();
    }
  }, [activity.materials_needed]);

  const loadMaterialLinks = async () => {
    const links = {};
    for (const material of activity.materials_needed || []) {
      try {
        links[material] = await searchMaterialLinks(material);
      } catch (error) {
        console.error(`Error loading link for ${material}:`, error);
      }
    }
    setMaterialLinks(links);
  };

  const handleStatusChange = (newStatus) => {
    onStatusChange(activity.id, newStatus);
  };

  const handleRatingClick = (rating) => {
    onRating(activity.id, rating);
  };
  
  const handleShareClick = (e) => {
    e.stopPropagation();
    
    // Create comprehensive sharing text with full instructions
    let shareText = `Check out this amazing activity from Teachmo!\n\n`;
    shareText += `🎯 ${activity.title}\n\n`;
    shareText += `📖 ${activity.description}\n\n`;
    
    if (activity.materials_needed && activity.materials_needed.length > 0) {
      shareText += `🛍️ Materials needed:\n${activity.materials_needed.map(m => `• ${m}`).join('\n')}\n\n`;
    }
    
    if (activity.instructions && activity.instructions.length > 0) {
      shareText += `📝 Instructions:\n${activity.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}\n\n`;
    }
    
    if (activity.teachmo_tip) {
      shareText += `💡 Teachmo Tip: ${activity.teachmo_tip}\n\n`;
    }
    
    shareText += `Get more personalized activities at Teachmo!`;
    
    navigator.clipboard.writeText(shareText).then(() => {
      setShowCopiedMessage(true);
      setTimeout(() => setShowCopiedMessage(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };
  
  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    onBookmark(isBookmarked);
  };

  const handleScheduleClick = (e) => {
    e.stopPropagation();
    setShowScheduleModal(true);
  };

  const handleCustomizationSave = async (customizedActivity) => {
    try {
      await Activity.update(activity.id, customizedActivity);
      // Refresh the activity data
      window.location.reload(); // Simple refresh - in production, would update state properly
    } catch (error) {
      console.error("Error saving customized activity:", error);
    }
  };
  
  const getCalendarEventFromActivity = () => {
    const now = new Date();
    let durationMinutes = 30;
    if (activity.duration) {
        const durationMatch = activity.duration.match(/\d+/g);
        if (durationMatch) {
            const times = durationMatch.map(Number);
            if (times.length > 1) {
                durationMinutes = (times[0] + times[1]) / 2;
            } else {
                durationMinutes = times[0];
            }
        }
    }
    const endTime = new Date(now.getTime() + durationMinutes * 60000);

    // Create comprehensive event description with all details
    let eventDescription = activity.description + '\n\n';
    
    if (activity.materials_needed && activity.materials_needed.length > 0) {
      eventDescription += '🛍️ MATERIALS NEEDED:\n';
      activity.materials_needed.forEach(material => {
        eventDescription += `• ${material}\n`;
      });
      eventDescription += '\n';
    }
    
    if (activity.instructions && activity.instructions.length > 0) {
      eventDescription += '📝 STEP-BY-STEP INSTRUCTIONS:\n';
      activity.instructions.forEach((instruction, index) => {
        eventDescription += `${index + 1}. ${instruction}\n`;
      });
      eventDescription += '\n';
    }
    
    if (activity.learning_objectives && activity.learning_objectives.length > 0) {
      eventDescription += '🎯 LEARNING GOALS:\n';
      activity.learning_objectives.forEach(objective => {
        eventDescription += `• ${objective}\n`;
      });
      eventDescription += '\n';
    }
    
    if (activity.teachmo_tip) {
      eventDescription += `💡 TEACHMO TIP:\n${activity.teachmo_tip}\n\n`;
    }
    
    if (activity.why_it_matters) {
      eventDescription += `🌟 WHY THIS MATTERS:\n${activity.why_it_matters}`;
    }

    return {
      title: activity.title,
      description: eventDescription,
      start_time: now.toISOString(),
      end_time: endTime.toISOString(),
      resource_id: activity.id,
      resource_type: 'activity',
      child_id: child?.id,
      color: child?.color || '#6B9DC8'
    };
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="border-0 shadow-xl bg-white">
            <CardHeader className="relative pb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="absolute top-4 right-4 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </Button>
              
              <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={categoryColors[activity.category] || "bg-gray-100 text-gray-800"}>
                      {activity.category?.replace(/_/g, ' ')}
                    </Badge>
                    <Badge variant="outline" className={statusColors[activity.status]}>
                      {activity.status}
                    </Badge>
                    {activity.is_personalized && child && (
                      <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                        For {child.name}
                      </Badge>
                    )}
                    {activity.is_customized && (
                      <Badge className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                        <Edit className="w-3 h-3 mr-1" />
                        Customized
                      </Badge>
                    )}
                  </div>
                   <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBookmarkClick}
                      className="text-gray-400 hover:text-gray-600 p-1 -mt-4"
                    >
                      {isBookmarked ? (
                        <BookmarkCheck className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Bookmark className="w-5 h-5" />
                      )}
                    </Button>
              </div>

              <CardTitle className="text-2xl font-bold text-gray-900 pr-12">
                {activity.title}
              </CardTitle>
              
              {child && (
                <div className="flex items-center gap-2 mt-2">
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{backgroundColor: child.color || 'var(--teachmo-coral)'}}
                  >
                    {child.avatar || child.name[0].toUpperCase()}
                  </div>
                  <p className="text-gray-600">
                    For {child.name} ({child.age} years old)
                  </p>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">About This Activity</h3>
                <p className="text-gray-700 leading-relaxed">
                  {activity.description}
                </p>
              </div>

              {/* Customization Offer */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-1">💡 Want to make this activity perfect for your child?</h4>
                    <p className="text-sm text-purple-700">I can help you customize it based on your child's interests, available materials, or skill level.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomizationModal(true)}
                    className="border-purple-300 text-purple-700 hover:bg-purple-100"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Customize
                  </Button>
                </div>
              </div>

              {activity.why_it_matters && (
                <div className="bg-blue-50 p-4 rounded-xl border-l-4 border-blue-400">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Why This Activity Matters
                  </h3>
                  <p className="text-blue-800 leading-relaxed">{activity.why_it_matters}</p>
                </div>
              )}

              {activity.teachmo_tip && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-l-4 border-purple-400">
                  <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-purple-600" />
                    Teachmo Tip: Maximize the Learning
                  </h3>
                  <p className="text-purple-800 leading-relaxed font-medium">{activity.teachmo_tip}</p>
                </div>
              )}

              {activity.duration && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">Duration: {activity.duration}</span>
                </div>
              )}

              {activity.materials_needed && activity.materials_needed.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Materials & Shopping Links
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {activity.materials_needed.map((material, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-sm text-gray-700">{material}</span>
                        </div>
                        {materialLinks[material] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(materialLinks[material], '_blank')}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Click the cart icon to find these items online
                  </p>
                </div>
              )}

              {activity.instructions && activity.instructions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Step-by-Step Instructions
                  </h3>
                  <div className="space-y-3">
                    {activity.instructions.map((instruction, index) => (
                      <div key={index} className="flex gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <p className="text-green-800 flex-1">{instruction}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activity.learning_objectives && activity.learning_objectives.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Learning Goals
                  </h3>
                  <div className="space-y-2">
                    {activity.learning_objectives.map((objective, index) => (
                      <div key={index} className="p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                        <p className="text-sm text-orange-800">{objective}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activity.variations && activity.variations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Try These Variations
                  </h3>
                  <div className="space-y-2">
                    {activity.variations.map((variation, index) => (
                      <div key={index} className="p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">{variation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!activity.why_it_matters && !activity.teachmo_tip && !activity.instructions) && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2">💡 Get More From This Activity</h4>
                  <p className="text-sm text-blue-800">
                    This activity is from our earlier collection. For the most comprehensive learning experience, 
                    try generating new personalized recommendations that include detailed instructions, learning insights, and expert tips!
                  </p>
                </div>
              )}

              {activity.status === 'completed' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Rate this activity:</h3>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Star
                        key={rating}
                        className={`w-8 h-8 cursor-pointer transition-colors ${
                          rating <= (activity.rating || 0)
                            ? 'text-yellow-400 fill-current'
                            : 'text-gray-300 hover:text-yellow-300'
                        }`}
                        onClick={() => handleRatingClick(rating)}
                      />
                    ))}
                    {activity.rating && (
                      <span className="ml-2 text-sm text-gray-600">
                        {activity.rating}/5 stars
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap gap-3">
                  {activity.status === 'suggested' && (
                    <>
                      <Button
                        onClick={() => handleStatusChange('planned')}
                        className="flex-1"
                        style={{backgroundColor: 'var(--teachmo-blue)', color: 'white'}}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Plan This Activity
                      </Button>
                      <Button
                        onClick={handleScheduleClick}
                        variant="outline"
                        className="flex-1"
                      >
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        Schedule
                      </Button>
                    </>
                  )}

                  {activity.status === 'planned' && (
                    <>
                      <Button
                        onClick={() => handleStatusChange('completed')}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                      <Button
                        onClick={handleScheduleClick}
                        variant="outline"
                        className="flex-1"
                      >
                        <CalendarPlus className="w-4 h-4 mr-2" />
                        Schedule
                      </Button>
                    </>
                  )}

                  {activity.status === 'completed' && (
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange('planned')}
                      className="w-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Do Again
                    </Button>
                  )}

                  {activity.status === 'skipped' && (
                    <Button
                      variant="outline"
                      onClick={() => handleStatusChange('suggested')}
                      className="w-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reconsider
                    </Button>
                  )}
                </div>
                <div className="flex flex-col items-center">
                  <Button
                    variant="ghost"
                    onClick={handleShareClick}
                    className="w-full text-gray-600 hover:bg-gray-100"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share Complete Activity
                  </Button>
                  {showCopiedMessage && (
                    <span className="text-xs text-green-600 mt-1">Complete activity details copied!</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      
      {showScheduleModal && currentUser && (
        <EventModal
          event={getCalendarEventFromActivity()}
          user={currentUser}
          onClose={() => setShowScheduleModal(false)}
        />
      )}
      
      {showCustomizationModal && (
        <CustomizationModal
          activity={activity}
          child={child}
          onSave={handleCustomizationSave}
          onClose={() => setShowCustomizationModal(false)}
        />
      )}
    </AnimatePresence>
  );
}