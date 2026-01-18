import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export default function Input({ label, error, helperText, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <input
        className={`w-full px-4 py-2.5 bg-zinc-950 border ${error ? 'border-red-500 focus:border-red-500' : 'border-zinc-700 focus:border-blue-500'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-white placeholder-zinc-500 transition-colors ${className}`}
        {...props}
      />
      {helperText && !error && (
        <p className="text-xs text-zinc-500 mt-1.5">{helperText}</p>
      )}
      {error && (
        <p className="text-xs text-red-400 mt-1.5">{error}</p>
      )}
    </div>
  );
}
