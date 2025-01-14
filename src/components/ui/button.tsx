import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', children, className = '', ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50';
    
    const variantClasses = {
      default: 'bg-white/10 hover:bg-white/20 text-white',
      ghost: 'hover:bg-white/10 text-white/80'
    };

    const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

    return (
      <button
        ref={ref}
        className={combinedClasses}
        {...props}
      >
        {children}
      </button>
    );
  }
);
