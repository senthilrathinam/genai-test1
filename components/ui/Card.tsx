import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  hover?: boolean;
  className?: string;
}

export default function Card({ children, hover = false, className = '' }: CardProps) {
  return (
    <div className={`bg-zinc-900/50 border border-zinc-800 rounded-xl ${hover ? 'hover:border-zinc-700 hover:shadow-lg hover:shadow-zinc-900/50 transition-all duration-200' : ''} ${className}`}>
      {children}
    </div>
  );
}
