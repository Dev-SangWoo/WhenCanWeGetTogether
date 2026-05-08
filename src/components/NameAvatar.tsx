'use client';

import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#10b981', 
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
];

export default function NameAvatar({ name, size = 'md' }: AvatarProps) {
  const firstChar = name.trim().charAt(0).toUpperCase() || '?';
  
  // Simple hash for consistent color per name
  const charCodeSum = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const bgColor = COLORS[charCodeSum % COLORS.length];

  const sizePx = {
    sm: '28px',
    md: '40px',
    lg: '56px'
  }[size];

  const fontSize = {
    sm: '0.75rem',
    md: '1.1rem',
    lg: '1.5rem'
  }[size];

  return (
    <div 
      style={{
        width: sizePx,
        height: sizePx,
        backgroundColor: bgColor,
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: '800',
        fontSize: fontSize,
        fontFamily: 'var(--font-game)',
        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        boxShadow: `0 4px 10px ${bgColor}44`,
        flexShrink: 0
      }}
    >
      {firstChar}
    </div>
  );
}
