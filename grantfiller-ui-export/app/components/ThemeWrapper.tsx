'use client';

import { useTheme } from '../ThemeProvider';

export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  
  return (
    <div data-theme={theme} className="theme-wrapper">
      {children}
    </div>
  );
}

export function useCurrentTheme() {
  const { theme } = useTheme();
  return theme;
}
