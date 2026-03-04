import { DayPicker } from 'react-day-picker';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-4', className)}
      classNames={{
        months: 'flex flex-col gap-4',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-semibold text-white tracking-wider uppercase',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          'absolute left-1 h-7 w-7 rounded-lg border border-white/10 bg-transparent',
          'flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-colors',
        ),
        button_next: cn(
          'absolute right-1 h-7 w-7 rounded-lg border border-white/10 bg-transparent',
          'flex items-center justify-center text-gray-400 hover:text-white hover:border-white/30 transition-colors',
        ),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-gray-600 rounded-md w-9 font-normal text-[0.8rem] text-center',
        week: 'flex w-full mt-2',
        day: 'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button: cn(
          'h-9 w-9 rounded-lg text-sm font-normal text-gray-300 transition-colors',
          'hover:bg-white/10 hover:text-white',
          'focus:outline-none focus:ring-2 focus:ring-white/20',
        ),
        selected: '[&>button]:bg-white [&>button]:text-black [&>button]:font-semibold [&>button]:hover:bg-white/90',
        today: '[&>button]:border [&>button]:border-white/30 [&>button]:text-white',
        outside: '[&>button]:text-gray-700 [&>button]:opacity-50',
        disabled: '[&>button]:text-gray-700 [&>button]:opacity-30 [&>button]:cursor-not-allowed',
        range_middle: '[&>button]:rounded-none [&>button]:bg-white/10',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
