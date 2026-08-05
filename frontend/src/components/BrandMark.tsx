import React from 'react';
import { Wrench } from 'lucide-react';

interface BrandMarkProps {
  showTagline?: boolean;
  compact?: boolean;
  logoSrc?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({
  showTagline = true,
  compact = false,
  logoSrc,
}) => {
  if (logoSrc) {
    return (
      <img
        src={logoSrc}
        alt="Maintec Engineering logo"
        style={{
          display: 'block',
          width: compact ? 320 : 420,
          height: 'auto',
          maxWidth: '100%',
          borderRadius: 18,
          boxShadow: 'none',
        }}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center justify-center rounded-xl shadow-lg"
        style={{
          width: compact ? 42 : 48,
          height: compact ? 42 : 48,
          background: 'linear-gradient(135deg, var(--accent-strong), var(--accent))',
          boxShadow: '0 12px 28px rgba(30, 143, 214, 0.28)',
        }}
      >
        <Wrench className="text-white" style={{ width: compact ? 19 : 22, height: compact ? 19 : 22 }} />
      </div>

      <div>
        <h1
          className="font-bold tracking-tight leading-none"
          style={{ color: 'var(--text)', fontSize: compact ? '1rem' : '1.125rem' }}
        >
          Maintec Engineering
        </h1>
        {showTagline && (
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Workshop Record System
          </span>
        )}
      </div>
    </div>
  );
};
