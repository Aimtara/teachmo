import React from 'react';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Button } from './button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

export function DatePicker({ date, value, onChange, placeholder = 'Pick a date' }) {
  const selectedDate = date ?? value;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, 'PPP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={selectedDate} onSelect={onChange} />
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
