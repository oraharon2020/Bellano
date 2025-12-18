'use client';

import { ChevronDown } from 'lucide-react';

interface ToolButtonProps {
  onClick: () => void;
  icon: any;
  label: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  tooltip?: string;
}

export function ToolButton({ 
  onClick, 
  icon: Icon, 
  label, 
  active = false,
  disabled = false,
  danger = false,
  tooltip
}: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tooltip || label}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all w-full
        ${active ? 'bg-purple-100 text-purple-700 border border-purple-300' : ''}
        ${danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-gray-100'}
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}

interface SectionHeaderProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function SectionHeader({ title, isOpen, onToggle }: SectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
    >
      {title}
      <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
  );
}
