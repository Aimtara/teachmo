import React, { useState, useEffect } from 'react';
import { JournalEntry, Child } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Save, Smile, Tag, User, Loader2, Sparkles, X, Plus } from 'lucide-react';
import VoiceInput from '../shared/VoiceInput';
import { format } from 'date-fns';

const PROMPTS = [
  "What moment today made you feel proud as a parent?",
  "What's one small win worth celebrating today?",
  "Describe a moment of connection you shared with your child.",
  "What was challenging today, and how did you navigate it?",
  "What did your child teach you today?",
  "How did you practice patience or empathy today?",
  "What's one thing you want to remember about your child at this exact age?",
  "Describe a moment that made you laugh today.",
  "What are you grateful for in your parenting journey right now?",
  "If you could give yourself one piece of advice today, what would it be?"
];

const MOODS = [
    { value: 'joyful', label: 'Joyful', emoji: '😊' },
    { value: 'proud', label: 'Proud', emoji: '🏆' },
    { value: 'connected', label: 'Connected', emoji: '❤️' },
    { value: 'grateful', label: 'Grateful', emoji: '🙏' },
    { value: 'tired', label: 'Tired', emoji: '😴' },
    { value: 'challenged', label: 'Challenged', emoji: '🤔' },
    { value: 'frustrated', label: 'Frustrated', emoji: '😤' },
    { value: 'reflective', label: 'Reflective', emoji: '🤗' },
    { value: 'overwhelmed', label: 'Overwhelmed', emoji: '😵' },
    { value: 'peaceful', label: 'Peaceful', emoji: '😌' }
];

const getDailyPrompt = () => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    return PROMPTS[dayOfYear % PROMPTS.length];
};

export default function GrowthJournal({ user, children, onEntrySaved, existingEntry }) {
    const [prompt, setPrompt] = useState(getDailyPrompt());
    const [content, setContent] = useState('');
    const [mood, setMood] = useState('');
    const [selectedChildId, setSelectedChildId] = useState('');
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    useEffect(() => {
        if(existingEntry) {
            setContent(existingEntry.content);
            setMood(existingEntry.mood || '');
            setSelectedChildId(existingEntry.child_id || '');
            setTags(existingEntry.tags || []);
            setPrompt(existingEntry.prompt || getDailyPrompt());
        } else {
            resetForm();
        }
    }, [existingEntry]);

    const resetForm = () => {
        setContent('');
        setMood('');
        setSelectedChildId('');
        setTags([]);
        setPrompt(getDailyPrompt());
    };

    const handleSave = async () => {
        if (!content.trim()) {
            alert("Please write something in your journal entry.");
            return;
        }
        setIsSaving(true);
        const entryData = {
            content,
            prompt,
            mood,
            child_id: selectedChildId || null,
            tags,
            entry_date: format(new Date(), 'yyyy-MM-dd'),
            created_by: user.email,
        };

        try {
            if (existingEntry) {
                await JournalEntry.update(existingEntry.id, entryData);
            } else {
                await JournalEntry.create(entryData);
            }
            onEntrySaved();
            
            // If creating new entry, reset form for next entry
            if (!existingEntry) {
                resetForm();
                setIsCreatingNew(false);
            }
        } catch (error) {
            console.error("Failed to save journal entry:", error);
            alert("Could not save your entry. Please try again.");
        }
        setIsSaving(false);
    };

    const handleTagInputKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const newTag = tagInput.trim().toLowerCase();
            if (newTag && !tags.includes(newTag)) {
                setTags([...tags, newTag]);
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleNewEntry = () => {
        setIsCreatingNew(true);
        resetForm();
    };

    const handleCancelNew = () => {
        setIsCreatingNew(false);
        resetForm();
    };

    const showingExistingEntry = existingEntry && !isCreatingNew;

    return (
        <div className="space-y-4">
            {/* Show button to create new entry if viewing existing entry */}
            {showingExistingEntry && (
                <div className="flex justify-end">
                    <Button 
                        onClick={handleNewEntry}
                        variant="outline" 
                        className="gap-2"
                        style={{ borderColor: 'var(--teachmo-sage)', color: 'var(--teachmo-sage)' }}
                    >
                        <Plus className="w-4 h-4" />
                        New Entry Today
                    </Button>
                </div>
            )}

            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-3 text-xl">
                                <Sparkles className="w-6 h-6 text-purple-500" />
                                {showingExistingEntry ? "Journal Entry" : "Today's Reflection"}
                            </CardTitle>
                            <CardDescription>{prompt}</CardDescription>
                        </div>
                        {isCreatingNew && (
                            <Button 
                                onClick={handleCancelNew}
                                variant="ghost"
                                size="sm"
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative">
                        <Textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What's on your mind? Capture the moment..."
                            className="min-h-[150px] resize-none"
                        />
                        {/* Fixed positioning for voice input */}
                        <div className="absolute bottom-2 right-2">
                            <VoiceInput onTranscript={text => setContent(prev => prev + (prev ? ' ' : '') + text)} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label className="flex items-center gap-2 mb-2"><Smile /> How are you feeling?</Label>
                            <Select value={mood} onValueChange={setMood}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your mood..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {MOODS.map(m => (
                                        <SelectItem key={m.value} value={m.value}>
                                            <span className="mr-2">{m.emoji}</span>{m.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="flex items-center gap-2 mb-2"><User /> About which child? (Optional)</Label>
                            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a child..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>General reflection</SelectItem>
                                    {children.map(child => (
                                        <SelectItem key={child.id} value={child.id}>{child.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="flex items-center gap-2 mb-2"><Tag /> Themes & Tags</Label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                    {tag}
                                    <button onClick={() => removeTag(tag)} className="hover:bg-gray-200 rounded-full p-0.5">
                                        <X className="w-3 h-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagInputKeyDown}
                            placeholder="Type a tag and press Enter... (e.g., bedtime, tantrum, milestone)"
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={isSaving} style={{ backgroundColor: 'var(--teachmo-sage)' }}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {existingEntry && !isCreatingNew ? 'Update Entry' : 'Save Entry'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
