import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertProps {
  type: 'error' | 'success' | 'warning';
  title?: string;
  message: string;
  className?: string;
  onDismiss?: () => void;
}

export function Alert({ type, title, message, className, onDismiss }: AlertProps) {
  const icons = {
    error: <XCircle className="h-5 w-5 text-red-500" />,
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    warning: <AlertCircle className="h-5 w-5 text-yellow-500" />
  };

  const backgrounds = {
    error: 'bg-red-50 dark:bg-red-900/20',
    success: 'bg-green-50 dark:bg-green-900/20',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20'
  };

  const borders = {
    error: 'border-red-200 dark:border-red-800',
    success: 'border-green-200 dark:border-green-800',
    warning: 'border-yellow-200 dark:border-yellow-800'
  };

  const titles = {
    error: 'Erro',
    success: 'Sucesso',
    warning: 'Atenção'
  };

  return (
    <div className={cn(
      "rounded-lg border p-4",
      backgrounds[type],
      borders[type],
      className
    )}>
      <div className="flex items-start gap-3">
        {icons[type]}
        <div className="flex-1">
          <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
            {title || titles[type]}
          </h3>
          <div className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {message}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <XCircle className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
} 