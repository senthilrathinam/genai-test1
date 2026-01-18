import { ReactNode } from 'react';

interface BadgeProps {
  variant?: 'draft' | 'ready' | 'filled' | 'submitted' | 'warning' | 'success' | 'info';
  children: ReactNode;
  icon?: string;
}

export default function Badge({ variant = 'info', children, icon }: BadgeProps) {
  const variants = {
    draft: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    ready: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    filled: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    submitted: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    warning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    info: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border ${variants[variant]}`}>
      {icon && <span>{icon}</span>}
      {children}
    </span>
  );
}
