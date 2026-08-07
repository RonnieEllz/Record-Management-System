import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  id?: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onClear?: () => void;
  ariaLabel?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  id,
  value,
  placeholder = 'Search',
  onChange,
  onClear,
  ariaLabel,
  className = '',
}) => {
  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
  };

  return (
    <div className={`relative ${className}`} role="search">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 sm:left-auto sm:right-0 sm:pr-4">
        <Search className="w-5 h-5 text-slate-400" />
      </div>

      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="glass-input search-input w-full pl-12 pr-12 sm:pl-4 sm:pr-20"
      />

      {value ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 sm:right-12"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
};

export default SearchInput;
