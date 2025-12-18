'use client';

import { DesignElement } from './types';

interface CanvasElementProps {
  element: DesignElement;
  zoom: number;
  isSelected: boolean;
  toolMode: 'select' | 'crop';
  onMouseDown: (e: React.MouseEvent) => void;
}

export function CanvasElement({ 
  element, 
  zoom, 
  isSelected, 
  toolMode,
  onMouseDown 
}: CanvasElementProps) {
  const isCropMode = toolMode === 'crop' && element.type === 'image';
  
  return (
    <div
      className={`absolute ${isCropMode ? 'cursor-crosshair' : 'cursor-move'} ${
        isSelected 
          ? 'ring-2 ring-purple-500 ring-offset-2' 
          : 'hover:ring-2 hover:ring-gray-300'
      }`}
      style={{
        left: element.x * zoom,
        top: element.y * zoom,
        transform: `
          rotate(${element.rotation || 0}deg)
          scaleX(${element.flipX ? -1 : 1})
          scaleY(${element.flipY ? -1 : 1})
        `,
        opacity: (element.opacity ?? 100) / 100
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(e);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {element.type === 'image' && element.src && (
        <img
          src={element.src}
          alt=""
          style={{
            width: (element.width || 100) * zoom,
            height: (element.height || 100) * zoom,
            objectFit: 'contain'
          }}
          draggable={false}
        />
      )}
      
      {element.type === 'text' && (
        <span
          style={{
            fontSize: (element.fontSize || 24) * zoom,
            color: element.color,
            whiteSpace: 'nowrap',
            fontFamily: 'Arial, sans-serif'
          }}
        >
          {element.content}
        </span>
      )}
      
      {element.type === 'arrow' && (
        <svg 
          width={(element.width || 100) * zoom} 
          height={24 * zoom}
          style={{ overflow: 'visible' }}
        >
          <line
            x1={0}
            y1={12 * zoom}
            x2={(element.width || 100) * zoom - 15}
            y2={12 * zoom}
            stroke={element.color || '#000'}
            strokeWidth={2 * zoom}
          />
          <polygon
            points={`${(element.width || 100) * zoom},${12 * zoom} ${(element.width || 100) * zoom - 15},${4 * zoom} ${(element.width || 100) * zoom - 15},${20 * zoom}`}
            fill={element.color || '#000'}
          />
        </svg>
      )}
      
      {element.type === 'line' && (
        <svg 
          width={(element.width || 100) * zoom} 
          height={4 * zoom}
          style={{ overflow: 'visible' }}
        >
          <line
            x1={0}
            y1={2 * zoom}
            x2={(element.width || 100) * zoom}
            y2={2 * zoom}
            stroke={element.color || '#000'}
            strokeWidth={2 * zoom}
          />
        </svg>
      )}
      
      {element.type === 'rectangle' && (
        <div
          style={{
            width: (element.width || 100) * zoom,
            height: (element.height || 60) * zoom,
            border: `${2 * zoom}px solid ${element.color || '#000'}`,
            backgroundColor: element.backgroundColor || 'transparent'
          }}
        />
      )}
      
      {element.type === 'circle' && (
        <div
          style={{
            width: (element.width || 80) * zoom,
            height: (element.width || 80) * zoom,
            borderRadius: '50%',
            border: `${2 * zoom}px solid ${element.color || '#000'}`,
            backgroundColor: element.backgroundColor || 'transparent'
          }}
        />
      )}
      
      {/* Selection handles */}
      {isSelected && element.type === 'image' && (
        <>
          <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow" />
          <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow" />
          <div className="absolute -top-2 -left-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow" />
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow" />
        </>
      )}
    </div>
  );
}

interface CropOverlayProps {
  cropStart: { x: number; y: number };
  cropEnd: { x: number; y: number };
  zoom: number;
}

export function CropOverlay({ cropStart, cropEnd, zoom }: CropOverlayProps) {
  const left = Math.min(cropStart.x, cropEnd.x) * zoom;
  const top = Math.min(cropStart.y, cropEnd.y) * zoom;
  const width = Math.abs(cropEnd.x - cropStart.x) * zoom;
  const height = Math.abs(cropEnd.y - cropStart.y) * zoom;
  
  if (width < 5 || height < 5) return null;
  
  return (
    <div
      className="absolute border-2 border-dashed border-yellow-500 bg-yellow-500/20 pointer-events-none z-50"
      style={{ left, top, width, height }}
    >
      <div className="absolute -top-6 left-0 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
        ✂️ {Math.round(width / zoom)} × {Math.round(height / zoom)}
      </div>
    </div>
  );
}
