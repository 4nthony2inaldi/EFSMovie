import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'gold' | 'purple' | 'green' | 'red' | 'gray';
  className?: string;
}

const variants = {
  default: 'bg-gray-100 text-gray-800',
  gold: 'bg-gold-200 text-gold-900',
  purple: 'bg-purple-100 text-purple-900',
  green: 'bg-green-100 text-green-800',
  red: 'bg-red-100 text-red-800',
  gray: 'bg-gray-50 text-gray-500',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
