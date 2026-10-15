'use client';

import { useState, forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import 'react-datepicker/dist/react-datepicker.css';

interface CustomDatePickerProps {
  label: string;
  placeholder?: string;
  value?: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  maxDate?: Date;
  tooltip?: string;
}

// Custom input component to match the design of SearchDropdown
const CustomInput = forwardRef<HTMLInputElement, any>(({ value, onClick, placeholder }, ref) => (
  <div className="relative">
    <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-white/80 pointer-events-none">
      <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4" />
    </div>
    <input
      ref={ref}
      type="text"
      placeholder={placeholder}
      value={value ? `${value} 2025` : ''}
      onClick={onClick}
      readOnly
      className="w-full pl-9 pr-2 py-2.5 text-xs md:text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent cursor-pointer text-white placeholder-white/50"
    />
  </div>
));

CustomInput.displayName = 'CustomInput';

export function CustomDatePicker({ 
  label, 
  placeholder = "Select date...", 
  value, 
  onChange,
  minDate,
  maxDate,
  tooltip
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Format date to show only month and day (e.g., "Jan 15", "Mar 30")
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="relative w-full">
      <label className="block text-xs md:text-sm font-medium text-white mb-1.5">
        <span className="inline-flex items-center gap-1">
          {label}
          {tooltip ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`${label} help`}
                    className="text-white/60 hover:text-white/90 transition-colors"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </span>
      </label>
      <DatePicker
        selected={value}
        onChange={onChange}
        customInput={<CustomInput placeholder={placeholder} />}
        dateFormat="MMM d"
        minDate={minDate}
        maxDate={maxDate}
        showPopperArrow={false}
        popperClassName="date-picker-popper"
        calendarClassName="date-picker-calendar"
        onCalendarOpen={() => setIsOpen(true)}
        onCalendarClose={() => setIsOpen(false)}
        popperPlacement="bottom-start"
        showYearDropdown={false}
        formatWeekDay={nameOfDay => nameOfDay.substr(0,1)}
        renderCustomHeader={({date, decreaseMonth, increaseMonth, prevMonthButtonDisabled, nextMonthButtonDisabled}) => (
          <div className="react-datepicker__header">
            <button
              type="button"
              className="react-datepicker__navigation react-datepicker__navigation--previous"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
            >
              <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--previous">
                ←
              </span>
            </button>
            <div className="react-datepicker__current-month">
              {date.toLocaleDateString('en-US', { month: 'long' })}
            </div>
            <button
              type="button"
              className="react-datepicker__navigation react-datepicker__navigation--next"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
            >
              <span className="react-datepicker__navigation-icon react-datepicker__navigation-icon--next">
                →
              </span>
            </button>
          </div>
        )}
      />
      <style jsx global>{`
        .date-picker-popper {
          z-index: 1000;
        }
        .date-picker-calendar {
          border: 1px solid hsl(var(--border));
          border-radius: 0.375rem;
          background-color: #fff;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
          font-family: inherit;
        }
        .react-datepicker__header {
          background-color: hsl(var(--background));
          border-bottom: 1px solid hsl(var(--border));
          border-radius: 0.375rem 0.375rem 0 0;
        }
        .react-datepicker__current-month {
          color: hsl(var(--foreground));
          font-weight: 600;
          font-size: 0.875rem;
        }
        .react-datepicker__day-name {
          color: hsl(var(--muted-foreground));
          font-size: 0.75rem;
          font-weight: 500;
          width: 2rem;
          height: 1.5rem;
          line-height: 1.5rem;
          text-align: center;
          margin: 0.125rem;
        }
        .react-datepicker__day-names {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.25rem;
        }
        .react-datepicker__day {
          color: hsl(var(--foreground));
          font-size: 0.875rem;
          width: 2rem;
          height: 2rem;
          line-height: 2rem;
          margin: 0.125rem;
          border-radius: 0.25rem;
        }
        .react-datepicker__day:hover {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }
        .react-datepicker__day--selected {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .react-datepicker__day--disabled {
          color: hsl(var(--muted-foreground));
          cursor: not-allowed;
        }
        .react-datepicker__navigation {
          background: none;
          border: none;
          cursor: pointer;
          position: absolute;
          top: 0.5rem;
          width: 2rem;
          height: 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }
        .react-datepicker__navigation--previous {
          left: 0.5rem;
        }
        .react-datepicker__navigation--next {
          right: 0.5rem;
        }
        .react-datepicker__navigation-icon {
          width: 1.25rem;
          height: 1.25rem;
          display: inline-block;
          border: none;
          background: none;
        }
        .react-datepicker__navigation-icon--previous,
        .react-datepicker__navigation-icon--next {
          font-size: 1.5rem;
          color: #000;
          font-weight: bold;
        }
        .react-datepicker__navigation:hover {
          opacity: 0.7;
        }
        .react-datepicker__year-read-view {
          display: none;
        }
      `}</style>
    </div>
  );
}