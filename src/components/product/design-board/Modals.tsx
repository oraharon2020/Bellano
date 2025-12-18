'use client';

import { Scissors, X } from 'lucide-react';

interface CropModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onApply: () => void;
}

export function CropModal({ isOpen, onCancel, onApply }: CropModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
      <div className="bg-white rounded-xl p-5 shadow-xl max-w-sm w-full mx-4">
        <h3 className="font-semibold mb-2 text-center text-lg">✂️ חיתוך תמונה</h3>
        <p className="text-sm text-gray-500 text-center mb-4">לחתוך את האזור המסומן?</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={onApply}
            className="px-5 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2 font-medium transition-colors"
          >
            <Scissors className="w-4 h-4" />
            חתוך
          </button>
        </div>
      </div>
    </div>
  );
}

interface TextInputModalProps {
  isOpen: boolean;
  textInput: string;
  textColor: string;
  onTextChange: (text: string) => void;
  onColorChange: (color: string) => void;
  onCancel: () => void;
  onAdd: () => void;
}

export function TextInputModal({ 
  isOpen, 
  textInput, 
  textColor,
  onTextChange,
  onColorChange,
  onCancel, 
  onAdd 
}: TextInputModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
      <div className="bg-white rounded-xl p-5 w-96 shadow-xl mx-4">
        <h3 className="font-semibold mb-3">✏️ הוסף טקסט</h3>
        <input
          type="text"
          value={textInput}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="הקלד טקסט..."
          className="w-full px-4 py-3 border rounded-lg mb-3 focus:ring-2 focus:ring-purple-300 text-lg"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <div className="flex items-center gap-3 mb-4">
          <label className="text-sm text-gray-600">צבע טקסט:</label>
          <input
            type="color"
            value={textColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border-2"
          />
          <span className="text-xs text-gray-400 font-mono">{textColor}</span>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ביטול
          </button>
          <button
            onClick={onAdd}
            disabled={!textInput.trim()}
            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
          >
            הוסף
          </button>
        </div>
      </div>
    </div>
  );
}
