'use client';

import { useTheme } from './ThemeProvider';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as any)}
      className="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer"
      style={{
        backgroundColor: 'rgb(var(--bg-secondary))',
        borderColor: 'rgb(var(--border-color))',
        color: 'rgb(var(--text-primary))',
      }}
    >
      <option value="professional">Professional</option>
      <option value="vibrant">Vibrant</option>
    </select>
  );
}
