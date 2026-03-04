import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Calendar } from './calendar';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
  captionLayout?: 'dropdown' | 'label';
  id?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
  disabled,
  fromYear,
  toYear,
  captionLayout,
  id,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-left text-sm transition-colors',
            'hover:border-white/20 hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-white/20',
            'disabled:cursor-not-allowed disabled:opacity-40',
            !value && 'text-gray-500',
            value && 'text-white',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />
          <span className="flex-1 truncate">
            {value ? format(value, 'PPP') : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange?.(date);
            setOpen(false);
          }}
          fromYear={fromYear}
          toYear={toYear}
          captionLayout={captionLayout}
          defaultMonth={value}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = 'Pick date & time',
  className,
  disabled,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const [timeStr, setTimeStr] = useState(value ? format(value, 'HH:mm') : '18:00');

  function handleDateSelect(date: Date | undefined) {
    if (!date) { onChange?.(undefined); return; }
    const [h, m] = timeStr.split(':').map(Number);
    const combined = new Date(date);
    combined.setHours(h ?? 18, m ?? 0, 0, 0);
    onChange?.(combined);
    setOpen(false);
  }

  function handleTimeChange(t: string) {
    setTimeStr(t);
    if (value) {
      const [h, m] = t.split(':').map(Number);
      const updated = new Date(value);
      updated.setHours(h ?? 18, m ?? 0, 0, 0);
      onChange?.(updated);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-left text-sm transition-colors',
            'hover:border-white/20 hover:bg-white/8 focus:outline-none focus:ring-2 focus:ring-white/20',
            'disabled:cursor-not-allowed disabled:opacity-40',
            !value && 'text-gray-500',
            value && 'text-white',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 flex-shrink-0 text-gray-500" />
          <span className="flex-1 truncate">
            {value ? format(value, 'PPP · HH:mm') : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          defaultMonth={value}
        />
        <div className="border-t border-white/10 px-4 py-3">
          <label className="block text-xs text-gray-500 uppercase tracking-widest mb-2">Time</label>
          <input
            type="time"
            value={timeStr}
            onChange={e => handleTimeChange(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
