import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
    Calendar, 
    MapPin, 
    Clock, 
    DollarSign, 
    ExternalLink, 
    CalendarPlus, 
    Heart,
    Sparkles,
    Users,
    Target,
    Star
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isThisWeek } from "date-fns";
import { CalendarEvent } from "@/api/entities";
import { User } from "@/api/entities";

const categoryColors = {
    creative: "bg-purple-100 text-purple-800 border-purple-200",
    educational: "bg-blue-100 text-blue-800 border-blue-200", 
    physical: "bg-green-100 text-green-800 border-green-200",
    social: "bg-pink-100 text-pink-800 border-pink-200",
    emotional: "bg-indigo-100 text-indigo-800 border-indigo-200",
    music: "bg-yellow-100 text-yellow-800 border-yellow-200",
    outdoor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    science: "bg-cyan-100 text-cyan-800 border-cyan-200",
    art: "bg-red-100 text-red-800 border-red-200"
};

export default function LocalEventCard({ event, child, showRelevanceScore = false }) {
    const [isAddingToCalendar, setIsAddingToCalendar] = useState(false);

    const getDateLabel = (dateString) => {
        if (!dateString) return '';
        try {
            const date = parseISO(dateString);
            if (isToday(date)) return 'Today';
            if (isTomorrow(date)) return 'Tomorrow';
            if (isThisWeek(date)) return format(date, 'EEEE');
            return format(date, 'MMM d');
        } catch {
            return '';
        }
    };

    const getTimeLabel = (startTime, endTime) => {
        if (!startTime) return '';
        try {
            const start = parseISO(startTime);
            let timeStr = format(start, 'h:mm a');
            if (endTime) {
                const end = parseISO(endTime);
                timeStr += ` - ${format(end, 'h:mm a')}`;
            }
            return timeStr;
        } catch {
            return '';
        }
    };

    const handleAddToCalendar = async () => {
        setIsAddingToCalendar(true);
        try {
            const user = await User.me();
            await CalendarEvent.create({
                title: event.title,
                description: `${event.description}\n\nSource: ${event.source}${event.teachmo_tip ? `\n\nTeachmo Tip: ${event.teachmo_tip}` : ''}`,
                start_time: event.start_time,
                end_time: event.end_time || event.start_time,
                location: `${event.location_name}${event.address ? `, ${event.address}` : ''}`,
                resource_type: 'event',
                resource_id: event.id,
                user_id: user.id,
                child_id: child?.id,
                color: '#e74c3c' // Red for events
            });
            
            // Show success feedback
            const button = document.getElementById(`add-calendar-${event.id}`);
            if (button) {
                button.textContent = '✓ Added!';
                setTimeout(() => {
                    button.innerHTML = '<span class="flex items-center gap-2"><CalendarPlus class="w-4 h-4" />Add to Calendar</span>';
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to add event to calendar:', error);
        }
        setIsAddingToCalendar(false);
    };

    const getRelevanceColor = (score) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-gray-600';
    };

    return (
        <motion.div
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="h-full"
        >
            <Card className="h-full flex flex-col border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg font-bold text-gray-900 line-clamp-2 mb-2">
                                {event.title}
                            </CardTitle>
                            
                            <div className="flex flex-wrap gap-2 mb-3">
                                {event.category && (
                                    <Badge className={categoryColors[event.category] || "bg-gray-100 text-gray-800"}>
                                        {event.category}
                                    </Badge>
                                )}
                                
                                {event.is_free ? (
                                    <Badge className="bg-green-100 text-green-800 border-green-200">
                                        Free
                                    </Badge>
                                ) : (
                                    <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                        {event.price_display || 'Paid'}
                                    </Badge>
                                )}

                                {event.age_group && (
                                    <Badge variant="outline" className="text-xs">
                                        <Users className="w-3 h-3 mr-1" />
                                        {event.age_group}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        
                        {showRelevanceScore && event.relevance_score && (
                            <div className="flex items-center gap-1 text-sm">
                                <Star className={`w-4 h-4 ${getRelevanceColor(event.relevance_score)}`} />
                                <span className={getRelevanceColor(event.relevance_score)}>
                                    {event.relevance_score}%
                                </span>
                            </div>
                        )}
                    </div>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                    {/* Description */}
                    <p className="text-sm text-gray-600 line-clamp-3 flex-1">
                        {event.description}
                    </p>

                    {/* Teachmo Tip */}
                    {event.teachmo_tip && (
                        <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                            <div className="flex items-start gap-2">
                                <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-semibold text-blue-800 mb-1">
                                        Why This Is Perfect for {child?.name || 'Your Child'}
                                    </p>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        {event.teachmo_tip}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Event Details */}
                    <div className="space-y-2 text-sm text-gray-600">
                        {/* Date & Time */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 flex-shrink-0" />
                            <span className="font-medium">{getDateLabel(event.start_time)}</span>
                            {event.start_time && (
                                <>
                                    <Clock className="w-4 h-4 flex-shrink-0 ml-2" />
                                    <span>{getTimeLabel(event.start_time, event.end_time)}</span>
                                </>
                            )}
                        </div>

                        {/* Location */}
                        {event.location_name && (
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{event.location_name}</p>
                                    {event.address && (
                                        <p className="text-xs text-gray-500 line-clamp-1">{event.address}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Learning Objectives */}
                        {event.learning_objectives && event.learning_objectives.length > 0 && (
                            <div className="flex items-start gap-2">
                                <Target className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <div className="text-xs">
                                    <span className="font-medium">Skills: </span>
                                    {event.learning_objectives.slice(0, 2).join(', ')}
                                    {event.learning_objectives.length > 2 && '...'}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Source & Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                            via {event.source}
                        </div>
                        
                        <div className="flex gap-2">
                            {event.url && (
                                <Button 
                                    size="sm" 
                                    variant="outline" 
                                    className="text-xs"
                                    onClick={() => window.open(event.url, '_blank')}
                                >
                                    <ExternalLink className="w-3 h-3 mr-1" />
                                    Details
                                </Button>
                            )}
                            
                            <Button 
                                id={`add-calendar-${event.id}`}
                                size="sm" 
                                onClick={handleAddToCalendar}
                                disabled={isAddingToCalendar}
                                style={{backgroundColor: 'var(--teachmo-sage)'}}
                                className="text-xs"
                            >
                                {isAddingToCalendar ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <CalendarPlus className="w-3 h-3 mr-1" />
                                        Add
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}