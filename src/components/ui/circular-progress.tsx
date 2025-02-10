'use client';

import { cn } from "@/lib/utils";

interface CircularProgressProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export function CircularProgress({ size = 'md', message, className }: CircularProgressProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="relative">
        <div className={cn(
          "animate-spin rounded-full border-4 border-t-slate-900 dark:border-t-slate-200",
          "border-slate-200 dark:border-slate-700",
          sizeClasses[size]
        )} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "rounded-full bg-slate-900 dark:bg-slate-200",
            size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4',
            "animate-pulse"
          )} />
        </div>
      </div>
      {message && (
        <div className="text-center space-y-1">
          <p className="text-slate-900 dark:text-slate-200 font-medium">
            {message}
          </p>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-200 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-200 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-200 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      )}
    </div>
  );
} 