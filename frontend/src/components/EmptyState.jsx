import { cn } from '@/lib/utils';

/**
 * Reusable empty-state placeholder for tables and lists.
 *
 * Props:
 *   icon        — Lucide icon component (optional)
 *   title       — primary message (required)
 *   description — secondary message (optional)
 *   action      — ReactNode: a button or link to render below the text (optional)
 *   className   — extra classes applied to the wrapper (optional)
 */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <p className="font-medium text-sm">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
