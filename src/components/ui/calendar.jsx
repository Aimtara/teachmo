
import React, { useState } from 'react';
import { cn } from '@/components/utils/cn';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';

function Calendar({
  className,
  selected,
  onSelect,
  mode = 'single',
  showOutsideDays = true,
  ...props
}) {
  const [currentMonth, setCurrentMonth] = useState(selected || new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDayClick = (day) => {
    if (onSelect) {
      onSelect(day);
    }
  };

  return (
    <div className={cn('p-3', className)} {...props}>
      <div className="flex justify-between items-center mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <h2 className="text-sm font-medium">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isSelected = selected && isSameDay(day, selected);
            const isCurrentDay = isToday(day);
            
            return (
              <Button
                key={`${weekIndex}-${dayIndex}`}
                variant="ghost"
                className={cn(
                  'h-9 w-9 p-0 font-normal',
                  !isCurrentMonth && 'text-gray-400 opacity-50',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                  isCurrentDay && !isSelected && 'bg-accent text-accent-foreground',
                  !showOutsideDays && !isCurrentMonth && 'invisible'
                )}
                onClick={() => handleDayClick(day)}
                disabled={!isCurrentMonth && !showOutsideDays}
              >
                {format(day, 'd')}
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}

Calendar.displayName = 'Calendar';

export { Calendar };
