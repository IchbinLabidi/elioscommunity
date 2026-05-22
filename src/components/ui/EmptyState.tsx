import { LucideIcon } from 'lucide-react';

export default function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
      <Icon className="mx-auto h-10 w-10 text-elios-blue" />
      <h3 className="mt-4 text-lg font-semibold text-elios-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
