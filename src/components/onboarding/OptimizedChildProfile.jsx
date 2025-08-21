import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { differenceInYears } from "date-fns";
import { AlertTriangle } from "lucide-react";

const AVATAR_OPTIONS = ["👶", "👧", "👦", "🧒", "🎨", "⚽", "📚", "🔬", "🎵", "🌟"];

export default function OptimizedChildProfile({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [avatar, setAvatar] = useState("👶");
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Child's name is required.";
    }
    if (!birthDate) {
      newErrors.birthDate = "Birth date is required to find age-appropriate activities.";
    } else if (differenceInYears(new Date(), new Date(birthDate)) > 18) {
      newErrors.birthDate = "Please enter a valid birth date for a child (0-18 years).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const calculatedAge = differenceInYears(new Date(), new Date(birthDate));

    onSave({
      name,
      birth_date: birthDate,
      age: calculatedAge,
      avatar,
      interests: [],
      challenges: [],
      development_goals: [],
      personality_traits: [],
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-base">Child's First Name <span className="text-red-500">*</span></Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`py-6 text-base ${errors.name ? 'border-red-500' : ''}`}
          placeholder="e.g., Alex"
          aria-describedby="name-help"
          aria-invalid={!!errors.name}
        />
        <p id="name-help" className="text-xs text-gray-500">This helps us personalize content for them.</p>
        {errors.name && <p className="text-sm text-red-600 flex items-center gap-1 mt-1"><AlertTriangle className="w-4 h-4" /> {errors.name}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="birthDate" className="text-base">Birth Date <span className="text-red-500">*</span></Label>
        <Input
          id="birthDate"
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className={`py-6 text-base ${errors.birthDate ? 'border-red-500' : ''}`}
          aria-describedby="birthdate-help"
          aria-invalid={!!errors.birthDate}
        />
        <p id="birthdate-help" className="text-xs text-gray-500">Age is used to find perfectly matched activities and milestones.</p>
        {errors.birthDate && <p className="text-sm text-red-600 flex items-center gap-1 mt-1"><AlertTriangle className="w-4 h-4" /> {errors.birthDate}</p>}
      </div>
      
      <div className="space-y-3">
        <Label className="text-base">Choose an Avatar</Label>
        <div className="flex flex-wrap gap-3" role="radiogroup" aria-labelledby="avatar-label">
          {AVATAR_OPTIONS.map(emoji => (
            <button
              key={emoji}
              type="button"
              role="radio"
              aria-checked={avatar === emoji}
              onClick={() => setAvatar(emoji)}
              className={`w-12 h-12 text-2xl rounded-full border-2 transition-all duration-200 ease-in-out flex items-center justify-center ${
                avatar === emoji 
                  ? 'border-blue-500 bg-blue-100 scale-110' 
                  : 'border-gray-200 hover:border-gray-400 bg-white'
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500">A fun icon to represent your child throughout the app.</p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Back
        </Button>
        <Button type="submit" style={{backgroundColor: 'var(--teachmo-sage)'}}>
          Save and Continue
        </Button>
      </div>
    </form>
  );
}