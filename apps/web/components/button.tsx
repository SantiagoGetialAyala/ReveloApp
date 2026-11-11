import { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost';
};

export function Button({ className, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition duration-200',
        variant === 'primary' &&
          'bg-primary text-primary-foreground shadow-[0_5px_14px_rgba(11,37,69,0.16)] hover:-translate-y-0.5 hover:bg-[#123b63] hover:shadow-[0_9px_20px_rgba(11,37,69,0.2)]',
        variant === 'secondary' &&
          'bg-action text-action-foreground shadow-[0_5px_14px_rgba(22,163,74,0.15)] hover:-translate-y-0.5 hover:bg-[#10863d]',
        variant === 'ghost' && 'bg-transparent text-primary hover:bg-blue-50',
        className,
      )}
      {...props}
    />
  );
}
