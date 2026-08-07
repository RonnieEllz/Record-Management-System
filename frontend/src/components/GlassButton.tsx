import React from 'react';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({ icon, children, className = '', type = 'button', ...props }) => {
  return (
    <button type={type} className={`glass-button ${className}`.trim()} {...props}>
      {icon}
      {children}
    </button>
  );
};
