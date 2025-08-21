import React, { useState, useEffect } from "react";
import { CalendarEvent, Activity } from "@/api/entities"; // Added Activity
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, Tag, User, Save, Trash2, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parseISO } from "date-fns";
import { useToast } from "@/components/ui/use-toast";

export default function EventModal({ event, user, onClose, childrenData, defaultChildId }) {
    const isNewEvent = !event || !event.id;
    const [currentEvent, setCurrentEvent] = useState(
        isNewEvent 
        ? {
            title: event?.title || "",
            description: event?.description || "",
            start_time: event?.start_time || new Date().toISOString(),
            end_time: event?.end_time || new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
            child_id: defaultChildId || childrenData?.[0]?.id || null,
            all_day: false,
            resource_id: event?.resource_id || null,
            resource_type: event?.resource_type || 'custom',
            color: event?.color || '#6B9DC8'
        }
        : { ...event }
    );
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formError, setFormError] = useState(null);
    const { toast } = useToast();

    useEffect(() => {
        // Handle external event changes
        if(event && JSON.stringify(event) !== JSON.stringify(currentEvent)){
             setCurrentEvent(event);
        }
    }, [event]);

    const handleInputChange = (field, value) => {
        setCurrentEvent(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!currentEvent.title) {
            setFormError("Title is required.");
            return;
        }

        setIsSaving(true);
        setFormError(null);

        const eventData = {
            ...currentEvent,
            user_id: user.id
        };
        
        try {
            if (isNewEvent) {
                const createdEvent = await CalendarEvent.create(eventData);
                // If the event was created from a suggested activity, update the activity's status
                if (createdEvent && eventData.resource_type === 'activity' && eventData.resource_id) {
                    try {
                        await Activity.update(eventData.resource_id, { status: 'planned' });
                    } catch (error) {
                        console.error("Failed to update source activity status:", error);
                        // This is a non-blocking error.
                    }
                }
            } else {
                await CalendarEvent.update(event.id, eventData);
            }
            onClose();
             toast({
                title: isNewEvent ? "Event Created" : "Event Updated",
                description: `"${currentEvent.title}" has been saved.`
            });
        } catch (error) {
            console.error("Failed to save event:", error);
            setFormError("An error occurred while saving. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDelete = async () => {
        if (isNewEvent) return;
        
        setIsDeleting(true);
        try {
            await CalendarEvent.delete(event.id);
            onClose();
            toast({
                title: "Event Deleted",
                description: `"${event.title}" has been removed from your calendar.`
            });
        } catch (error) {
            console.error("Failed to delete event:", error);
            setFormError("An error occurred while deleting. Please try again.");
            setIsDeleting(false);
        }
    }
    
    const getResourceLink = () => {
        if (!currentEvent.resource_id || !currentEvent.resource_type) return null;
        switch (currentEvent.resource_type) {
            case 'activity':
                // Assuming an activity detail page exists
                return `/activities/${currentEvent.resource_id}`;
            case 'local_event':
                 // Can link to an event detail page if available
                return `/events/${currentEvent.resource_id}`;
            default:
                return null;
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: -20 }}
                    className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 border-b flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-gray-800">{isNewEvent ? 'Create Event' : 'Edit Event'}</h2>
                        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                            <X className="w-5 h-5 text-gray-500" />
                        </Button>
                    </div>

                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-4">
                            <Input
                                placeholder="Event Title"
                                value={currentEvent.title}
                                onChange={(e) => handleInputChange('title', e.target.value)}
                                className="text-lg font-medium"
                            />
                            <Textarea
                                placeholder="Description"
                                value={currentEvent.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="flex items-center gap-2 mb-2"><Calendar className="w-4 h-4"/> Start Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={format(parseISO(currentEvent.start_time), "yyyy-MM-dd'T'HH:mm")}
                                        onChange={(e) => handleInputChange('start_time', new Date(e.target.value).toISOString())}
                                    />
                                </div>
                                <div>
                                    <Label className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4"/> End Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={format(parseISO(currentEvent.end_time), "yyyy-MM-dd'T'HH:mm")}
                                        onChange={(e) => handleInputChange('end_time', new Date(e.target.value).toISOString())}
                                    />
                                </div>
                            </div>
                            
                             <div>
                                <Label className="flex items-center gap-2 mb-2"><User className="w-4 h-4"/> For Child</Label>
                                <Select
                                    value={currentEvent.child_id || ''}
                                    onValueChange={(val) => handleInputChange('child_id', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a child..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={null}>General / Family</SelectItem>
                                        {childrenData.map(child => (
                                            <SelectItem key={child.id} value={child.id}>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-4 h-4 rounded-full" style={{backgroundColor: child.color}}></div>
                                                    {child.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label className="flex items-center gap-2 mb-2"><Tag className="w-4 h-4"/> Color</Label>
                                <Input
                                    type="color"
                                    value={currentEvent.color || '#6B9DC8'}
                                    onChange={(e) => handleInputChange('color', e.target.value)}
                                    className="w-full h-10 p-1"
                                />
                            </div>
                            
                            {getResourceLink() && (
                                <a href={getResourceLink()} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" className="w-full gap-2">
                                        <LinkIcon className="w-4 h-4"/>
                                        View Linked {currentEvent.resource_type}
                                    </Button>
                                </a>
                            )}
                        </div>
                        {formError && (
                            <div className="mt-4 text-red-600 text-sm flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4"/>
                                {formError}
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-gray-50 border-t flex justify-between">
                        <div>
                            {!isNewEvent && (
                                <Button
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </Button>
                            )}
                        </div>
                        <Button onClick={handleSave} disabled={isSaving} style={{backgroundColor: 'var(--teachmo-sage)'}}>
                            <Save className="w-4 h-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}