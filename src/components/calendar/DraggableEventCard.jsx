import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, MapPin, GripVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function DraggableEventCard({ item, type, index }) {
  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className="mb-2"
          style={{
            ...provided.draggableProps.style,
            opacity: snapshot.isDragging ? 0.8 : 1,
          }}
        >
          <Card className="hover:shadow-md transition-shadow duration-200 bg-white border-l-4 cursor-grab active:cursor-grabbing" style={{borderColor: item.color || 'var(--teachmo-sage)'}}>
            <CardContent className="p-3 flex items-start gap-3">
              <GripVertical className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {type === 'activity' ? (
                      <>
                        <Lightbulb className="w-3 h-3 mr-1" />
                        Activity
                      </>
                    ) : (
                      <>
                        <MapPin className="w-3 h-3 mr-1" />
                        Local Event
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}