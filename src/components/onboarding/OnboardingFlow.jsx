import React, { useState, useEffect } from "react";
import { User } from "@/api/entities";
import { Child } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Heart, ArrowRight, ArrowLeft, Check, Sparkles, Users, Target, Calendar, X, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import VoiceInput from "../shared/VoiceInput";
import NewChildProfile from "./NewChildProfile";

export default function OnboardingFlow({ onComplete, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [userData, setUserData] = useState({
    username: "",
    location: "",
    parenting_style: "",
    parenting_philosophy: ""
  });
  const [childData, setChildData] = useState({
    name: "",
    age: "",
    interests: [],
    personality_traits: []
  });
  const [isLoading, setIsLoading] = useState(false);

  const steps = [
    {
      id: 1,
      title: "Welcome to Teachmo! 🌟",
      description: "Let's personalize your parenting journey"
    },
    {
      id: 2,
      title: "Create Your Profile",
      description: "Tell us a bit about yourself"
    },
    {
      id: 3,
      title: "Add Your First Child",
      description: "Help us understand your family"
    },
    {
      id: 4,
      title: "You're All Set! 🎉",
      description: "Welcome to your personalized parenting companion"
    }
  ];

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    if (!userData.username.trim()) {
      alert("Please enter a username");
      return;
    }

    setIsLoading(true);
    try {
      await User.updateMyUserData({
        username: userData.username,
        location: userData.location,
        parenting_style: userData.parenting_style,
        parenting_philosophy: userData.parenting_philosophy,
        onboarding_step: 3
      });
      setCurrentStep(3);
    } catch (error) {
      console.error("Error saving user data:", error);
      alert("Error saving your information. Please try again.");
    }
    setIsLoading(false);
  };

  const handleChildSave = async (newChildData) => {
    setIsLoading(true);
    try {
      await Child.create(newChildData);
      setChildData(newChildData);
      await User.updateMyUserData({
        onboarding_step: 4
      });
      setCurrentStep(4);
    } catch (error) {
      console.error("Error creating child profile:", error);
      alert("Error saving child information. Please try again.");
    }
    setIsLoading(false);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      await User.updateMyUserData({
        onboarding_completed: true,
        onboarding_step: 4
      });
      onComplete();
    } catch (error) {
      console.error("Error completing onboarding:", error);
    }
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{steps[currentStep - 1].title}</h2>
                <p className="text-gray-600 mt-1">{steps[currentStep - 1].description}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mt-6">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    step.id <= currentStep ? 'bg-teachmo-sage' : 'bg-gray-200'
                  }`}
                  style={step.id <= currentStep ? {backgroundColor: 'var(--teachmo-sage)'} : {}}
                />
              ))}
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {currentStep === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center" style={{background: 'linear-gradient(135deg, var(--teachmo-sage), var(--teachmo-sage-light))'}}>
                    <Heart className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Your AI-Powered Parenting Coach
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-8 max-w-md mx-auto">
                    Get personalized activities, expert tips, and join a supportive community of parents on the same journey.
                  </p>
                  <Button
                    onClick={() => setCurrentStep(2)}
                    size="lg"
                    style={{backgroundColor: 'var(--teachmo-sage)'}}
                  >
                    Let's Get Started
                  </Button>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <form onSubmit={handleStep2Submit} className="space-y-6">
                  <div>
                    <Label htmlFor="username">Choose a Username *</Label>
                    <p className="text-sm text-gray-600 mb-2">This will be visible to other parents in the community</p>
                    <Input
                      id="username"
                      value={userData.username}
                      onChange={(e) => setUserData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="e.g., SuperMom2024, DadOfTwins"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Your Location</Label>
                    <p className="text-sm text-gray-600 mb-2">Help us find local events and activities</p>
                    <Input
                      id="location"
                      value={userData.location}
                      onChange={(e) => setUserData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g., Brooklyn, NY or London, UK"
                    />
                  </div>

                  <div>
                    <Label>Your Parenting Style</Label>
                    <p className="text-sm text-gray-600 mb-2">Choose what resonates most with you</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: "authoritative", label: "Authoritative", desc: "Clear rules with warmth" },
                        { value: "gentle", label: "Gentle", desc: "Empathy-focused approach" },
                        { value: "positive", label: "Positive", desc: "Encouragement over punishment" },
                        { value: "attachment", label: "Attachment", desc: "Strong emotional bonds" },
                        { value: "montessori", label: "Montessori", desc: "Child-led learning" },
                        { value: "balanced", label: "Balanced", desc: "Mix of different styles" }
                      ].map((style) => (
                        <div
                          key={style.value}
                          className={`p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                            userData.parenting_style === style.value
                              ? 'border-teachmo-sage bg-teachmo-sage/10'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setUserData(prev => ({ ...prev, parenting_style: style.value }))}
                        >
                          <div className="font-medium text-sm">{style.label}</div>
                          <div className="text-xs text-gray-600">{style.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="philosophy">Your Parenting Philosophy (Optional)</Label>
                    <div className="flex gap-2 mb-2">
                      <Textarea
                        id="philosophy"
                        value={userData.parenting_philosophy}
                        onChange={(e) => setUserData(prev => ({ ...prev, parenting_philosophy: e.target.value }))}
                        placeholder="Share your thoughts on parenting, your goals, or what matters most to you..."
                        rows={3}
                        className="flex-1"
                      />
                      <div className="flex flex-col justify-end">
                        <VoiceInput
                          onTranscript={(transcript) => setUserData(prev => ({
                            ...prev,
                            parenting_philosophy: prev.parenting_philosophy + (prev.parenting_philosophy ? " " : "") + transcript
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between pt-4">
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={isLoading || !userData.username.trim()}
                      style={{backgroundColor: 'var(--teachmo-sage)'}}
                    >
                      {isLoading ? 'Saving...' : 'Continue'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <NewChildProfile
                  onSave={handleChildSave}
                  onCancel={() => setCurrentStep(2)}
                  isOnboarding={true}
                />
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-green-100">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Welcome to Teachmo! 🎉
                  </h3>
                  <p className="text-gray-600 leading-relaxed mb-8 max-w-md mx-auto">
                    You're all set up! Start exploring personalized activities, connect with other parents, and track your parenting journey.
                  </p>
                  <Button
                    onClick={handleComplete}
                    size="lg"
                    style={{backgroundColor: 'var(--teachmo-sage)'}}
                  >
                    Start My Journey
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}