import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, MapPin, Loader2 } from 'lucide-react';
import DraggableEventCard from './DraggableEventCard';

export default function UnscheduledPanel({ items, selectedChild, isLoading }) {
  const suggestedActivities = items.filter(item => item.resource_type === 'activity');
  const localEvents = items.filter(item => item.resource_type === 'local_event');

  const renderContent = (type, data) => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
        </div>
      );
    }
    if (data.length > 0) {
      return (
        <Droppable droppableId={`unscheduled-${type}`} type="ITEM">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2"
            >
              {data.map((item, index) => (
                <DraggableEventCard 
                  key={item.id} 
                  item={item} 
                  type={type} 
                  index={index}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      );
    }
    return (
      <p className="p-4 text-sm text-center text-gray-500">
        {type === 'activity' ? 'No new suggested activities.' : 'No saved local events.'}
      </p>
    );
  };

  return (
    <div className="w-80 bg-white/70 border-r border-gray-200 flex flex-col h-full shadow-lg">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold text-gray-800">Unscheduled Items</h2>
        <p className="text-sm text-gray-600">Drag items onto the calendar to schedule them.</p>
        {selectedChild && (
          <p className="text-xs text-blue-600 font-medium mt-1">Showing suggestions for {selectedChild.name}</p>
        )}
      </div>

      <Tabs defaultValue="activities" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 shrink-0">
          <TabsTrigger value="activities">
            <Lightbulb className="w-4 h-4 mr-2" />
            Suggestions
          </TabsTrigger>
          <TabsTrigger value="events">
            <MapPin className="w-4 h-4 mr-2" />
            Local Events
          </TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-1">
          <TabsContent value="activities" className="p-2">
            {renderContent('activity', suggestedActivities)}
          </TabsContent>
          <TabsContent value="events" className="p-2">
            {renderContent('local_event', localEvents)}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}