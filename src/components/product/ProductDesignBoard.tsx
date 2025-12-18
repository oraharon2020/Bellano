'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Search, Trash2, Download, RotateCw, 
  Type, ArrowRight, ZoomIn, ZoomOut, 
  Plus, Minus, Copy, Undo, FlipHorizontal,
  Square, Circle, ImageIcon, ChevronUp, ChevronDown
} from 'lucide-react';

interface DesignElement {
  id: string;
  type: 'image' | 'text' | 'arrow' | 'rectangle' | 'circle' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  content?: string;
  src?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  flipX?: boolean;
  flipY?: boolean;
  zIndex?: number;
}

interface ProductSearchResult {
  id: number;
  name: string;
  image: string;
  slug: string;
}

interface ProductDesignBoardProps {
  isOpen: boolean;
  onClose: () => void;
  productImage: string;
  productName: string;
  onSave?: (imageDataUrl: string) => void;
}

export function ProductDesignBoard({ 
  isOpen, 
  onClose, 
  productImage, 
  productName,
  onSave 
}: ProductDesignBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<DesignElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Text input
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textColor, setTextColor] = useState('#000000');
  
  // Color for shapes
  const [shapeColor, setShapeColor] = useState('#000000');
  const [shapeFill, setShapeFill] = useState('transparent');

  // Save to history
  const saveToHistory = useCallback((newElements: DesignElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newElements]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements([...history[historyIndex - 1]]);
    }
  }, [history, historyIndex]);

  // Load base image when opening
  useEffect(() => {
    if (isOpen && productImage) {
      const initialElements: DesignElement[] = [{
        id: 'base-product',
        type: 'image',
        x: 50,
        y: 50,
        width: 400,
        height: 300,
        src: productImage,
        rotation: 0,
        zIndex: 0
      }];
      setElements(initialElements);
      saveToHistory(initialElements);
    }
  }, [isOpen, productImage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElement && selectedElement !== 'base-product') {
          deleteSelected();
        }
      }
      if (e.key === 'Escape') {
        setSelectedElement(null);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedElement, undo]);

  // Search products
  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&per_page=20`);
      const data = await response.json();
      
      if (data.products) {
        setSearchResults(data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          image: p.image || '',
          slug: p.slug
        })));
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchProducts(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts]);

  // Get max zIndex
  const getMaxZIndex = () => {
    return Math.max(...elements.map(el => el.zIndex || 0), 0);
  };

  // Add image from search
  const addImageFromProduct = (src: string) => {
    const newElement: DesignElement = {
      id: `img-${Date.now()}`,
      type: 'image',
      x: 200,
      y: 150,
      width: 200,
      height: 200,
      src,
      rotation: 0,
      zIndex: getMaxZIndex() + 1
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
    setShowSearch(false);
  };

  // Add text
  const addText = () => {
    if (!textInput.trim()) return;
    
    const newElement: DesignElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      x: 250,
      y: 250,
      content: textInput,
      fontSize: 24,
      color: textColor,
      zIndex: getMaxZIndex() + 1
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
    setTextInput('');
    setShowTextInput(false);
  };

  // Add arrow
  const addArrow = () => {
    const newElement: DesignElement = {
      id: `arrow-${Date.now()}`,
      type: 'arrow',
      x: 300,
      y: 300,
      width: 100,
      rotation: 0,
      color: shapeColor,
      zIndex: getMaxZIndex() + 1
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
  };

  // Add rectangle
  const addRectangle = () => {
    const newElement: DesignElement = {
      id: `rect-${Date.now()}`,
      type: 'rectangle',
      x: 250,
      y: 250,
      width: 100,
      height: 60,
      color: shapeColor,
      backgroundColor: shapeFill,
      zIndex: getMaxZIndex() + 1
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
  };

  // Add circle
  const addCircle = () => {
    const newElement: DesignElement = {
      id: `circle-${Date.now()}`,
      type: 'circle',
      x: 300,
      y: 300,
      width: 80,
      height: 80,
      color: shapeColor,
      backgroundColor: shapeFill,
      zIndex: getMaxZIndex() + 1
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
  };

  // Add line
  const addLine = () => {
    const newElement: DesignElement = {
      id: `line-${Date.now()}`,
      type: 'line',
      x: 200,
      y: 300,
      width: 150,
      rotation: 0,
      color: shapeColor,
      zIndex: getMaxZIndex() + 1
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
  };

  // Delete selected element
  const deleteSelected = () => {
    if (selectedElement && selectedElement !== 'base-product') {
      const newElements = elements.filter(el => el.id !== selectedElement);
      setElements(newElements);
      saveToHistory(newElements);
      setSelectedElement(null);
    }
  };

  // Duplicate selected element
  const duplicateSelected = () => {
    if (!selectedElement) return;
    
    const element = elements.find(el => el.id === selectedElement);
    if (!element) return;
    
    const newElement: DesignElement = {
      ...element,
      id: `${element.type}-${Date.now()}`,
      x: element.x + 20,
      y: element.y + 20,
      zIndex: getMaxZIndex() + 1
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
  };

  // Rotate selected element
  const rotateSelected = (degrees: number) => {
    if (!selectedElement) return;
    
    const newElements = elements.map(el => {
      if (el.id !== selectedElement) return el;
      return { ...el, rotation: ((el.rotation || 0) + degrees) % 360 };
    });
    setElements(newElements);
    saveToHistory(newElements);
  };

  // Flip selected element
  const flipSelected = () => {
    if (!selectedElement) return;
    
    const newElements = elements.map(el => {
      if (el.id !== selectedElement) return el;
      return { ...el, flipX: !el.flipX };
    });
    setElements(newElements);
    saveToHistory(newElements);
  };

  // Move element in layer order
  const moveLayer = (direction: 'up' | 'down') => {
    if (!selectedElement) return;
    
    const element = elements.find(el => el.id === selectedElement);
    if (!element) return;
    
    const currentZ = element.zIndex || 0;
    const newZ = direction === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
    
    const newElements = elements.map(el => {
      if (el.id === selectedElement) {
        return { ...el, zIndex: newZ };
      }
      return el;
    });
    setElements(newElements);
    saveToHistory(newElements);
  };

  // Mouse handlers for dragging
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    setSelectedElement(elementId);
    setIsDragging(true);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: (e.clientX - rect.left) / zoom - element.x,
        y: (e.clientY - rect.top) / zoom - element.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const newX = (e.clientX - rect.left) / zoom - dragOffset.x;
    const newY = (e.clientY - rect.top) / zoom - dragOffset.y;
    
    setElements(prev => prev.map(el => 
      el.id === selectedElement 
        ? { ...el, x: newX, y: newY }
        : el
    ));
  };

  const handleMouseUp = () => {
    if (isDragging) {
      saveToHistory(elements);
    }
    setIsDragging(false);
  };

  // Resize element
  const resizeElement = (delta: number) => {
    if (!selectedElement) return;
    
    const newElements = elements.map(el => {
      if (el.id !== selectedElement) return el;
      
      if (el.type === 'image' || el.type === 'rectangle' || el.type === 'circle') {
        const aspectRatio = (el.width || 100) / (el.height || 100);
        const newWidth = Math.max(30, (el.width || 100) + delta);
        const newHeight = el.type === 'circle' ? newWidth : Math.max(30, (el.height || 100) + delta / aspectRatio);
        return { ...el, width: newWidth, height: newHeight };
      } else if (el.type === 'text') {
        return { ...el, fontSize: Math.max(10, (el.fontSize || 24) + delta / 5) };
      } else if (el.type === 'arrow' || el.type === 'line') {
        return { ...el, width: Math.max(30, (el.width || 100) + delta) };
      }
      return el;
    });
    setElements(newElements);
  };

  // Helper to load image
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Export canvas as image
  const exportAsImage = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 800;
    canvas.height = 600;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Sort elements by zIndex
    const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    // Draw elements
    for (const el of sortedElements) {
      ctx.save();
      
      // Apply transformations
      if (el.rotation || el.flipX || el.flipY) {
        const centerX = el.x + (el.width || 0) / 2;
        const centerY = el.y + (el.height || 0) / 2;
        ctx.translate(centerX, centerY);
        if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
        if (el.flipX) ctx.scale(-1, 1);
        if (el.flipY) ctx.scale(1, -1);
        ctx.translate(-centerX, -centerY);
      }
      
      if (el.type === 'image' && el.src) {
        try {
          const img = await loadImage(el.src);
          ctx.drawImage(img, el.x, el.y, el.width || 100, el.height || 100);
        } catch (e) {
          console.error('Failed to load image:', e);
        }
      } else if (el.type === 'text' && el.content) {
        ctx.font = `${el.fontSize || 24}px Arial`;
        ctx.fillStyle = el.color || '#000000';
        ctx.fillText(el.content, el.x, el.y + (el.fontSize || 24));
      } else if (el.type === 'arrow') {
        const endX = el.x + (el.width || 100);
        ctx.strokeStyle = el.color || '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(endX - 10, el.y);
        ctx.stroke();
        // Arrow head
        ctx.fillStyle = el.color || '#000000';
        ctx.beginPath();
        ctx.moveTo(endX, el.y);
        ctx.lineTo(endX - 15, el.y - 8);
        ctx.lineTo(endX - 15, el.y + 8);
        ctx.closePath();
        ctx.fill();
      } else if (el.type === 'line') {
        ctx.strokeStyle = el.color || '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + (el.width || 100), el.y);
        ctx.stroke();
      } else if (el.type === 'rectangle') {
        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
          ctx.fillStyle = el.backgroundColor;
          ctx.fillRect(el.x, el.y, el.width || 100, el.height || 60);
        }
        ctx.strokeStyle = el.color || '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(el.x, el.y, el.width || 100, el.height || 60);
      } else if (el.type === 'circle') {
        const radius = (el.width || 80) / 2;
        ctx.beginPath();
        ctx.arc(el.x + radius, el.y + radius, radius, 0, Math.PI * 2);
        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
          ctx.fillStyle = el.backgroundColor;
          ctx.fill();
        }
        ctx.strokeStyle = el.color || '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    const dataUrl = canvas.toDataURL('image/png');
    
    // Download
    const link = document.createElement('a');
    link.download = `design-${productName}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    
    // Callback
    onSave?.(dataUrl);
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-xl w-full max-w-7xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">לוח עיצוב - {productName}</h2>
            <span className="text-sm text-gray-500">גרור אלמנטים | Delete למחיקה | Ctrl+D לשכפול</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Right Toolbar */}
          <div className="w-20 bg-gray-100 p-2 flex flex-col gap-1 border-l overflow-y-auto">
            <div className="text-xs font-medium text-gray-500 text-center mb-1">כלים</div>
            
            <button
              onClick={() => setShowSearch(true)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="הוסף תמונה ממוצר"
            >
              <ImageIcon className="w-5 h-5" />
              <span className="text-[10px]">תמונה</span>
            </button>
            <button
              onClick={() => setShowTextInput(true)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="הוסף טקסט"
            >
              <Type className="w-5 h-5" />
              <span className="text-[10px]">טקסט</span>
            </button>
            <button
              onClick={addArrow}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="הוסף חץ"
            >
              <ArrowRight className="w-5 h-5" />
              <span className="text-[10px]">חץ</span>
            </button>
            <button
              onClick={addLine}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="הוסף קו"
            >
              <Minus className="w-5 h-5" />
              <span className="text-[10px]">קו</span>
            </button>
            <button
              onClick={addRectangle}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="הוסף מלבן"
            >
              <Square className="w-5 h-5" />
              <span className="text-[10px]">מלבן</span>
            </button>
            <button
              onClick={addCircle}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="הוסף עיגול"
            >
              <Circle className="w-5 h-5" />
              <span className="text-[10px]">עיגול</span>
            </button>
            
            <div className="border-t my-2" />
            <div className="text-xs font-medium text-gray-500 text-center mb-1">צבע</div>
            
            <div className="flex flex-col items-center gap-1">
              <label className="text-[10px] text-gray-500">קו</label>
              <input
                type="color"
                value={shapeColor}
                onChange={(e) => setShapeColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
            </div>
            <div className="flex flex-col items-center gap-1">
              <label className="text-[10px] text-gray-500">מילוי</label>
              <input
                type="color"
                value={shapeFill === 'transparent' ? '#ffffff' : shapeFill}
                onChange={(e) => setShapeFill(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <button
                onClick={() => setShapeFill('transparent')}
                className={`text-[9px] px-1 py-0.5 rounded ${shapeFill === 'transparent' ? 'bg-gray-300' : 'bg-gray-100'}`}
              >
                ללא
              </button>
            </div>
            
            <div className="border-t my-2" />
            <div className="text-xs font-medium text-gray-500 text-center mb-1">עריכה</div>
            
            <button
              onClick={() => resizeElement(20)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="הגדל"
              disabled={!selectedElement}
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px]">הגדל</span>
            </button>
            <button
              onClick={() => resizeElement(-20)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="הקטן"
              disabled={!selectedElement}
            >
              <Minus className="w-5 h-5" />
              <span className="text-[10px]">הקטן</span>
            </button>
            <button
              onClick={() => rotateSelected(15)}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="סובב"
              disabled={!selectedElement}
            >
              <RotateCw className="w-5 h-5" />
              <span className="text-[10px]">סובב</span>
            </button>
            <button
              onClick={flipSelected}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="הפוך אופקי"
              disabled={!selectedElement}
            >
              <FlipHorizontal className="w-5 h-5" />
              <span className="text-[10px]">הפוך</span>
            </button>
            <button
              onClick={duplicateSelected}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="שכפל"
              disabled={!selectedElement}
            >
              <Copy className="w-5 h-5" />
              <span className="text-[10px]">שכפל</span>
            </button>
            <button
              onClick={() => moveLayer('up')}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="הבא קדימה"
              disabled={!selectedElement}
            >
              <ChevronUp className="w-5 h-5" />
              <span className="text-[10px]">קדימה</span>
            </button>
            <button
              onClick={() => moveLayer('down')}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="שלח אחורה"
              disabled={!selectedElement}
            >
              <ChevronDown className="w-5 h-5" />
              <span className="text-[10px]">אחורה</span>
            </button>
            <button
              onClick={deleteSelected}
              className="p-2 rounded-lg hover:bg-red-100 text-red-600 transition-colors flex flex-col items-center gap-1"
              title="מחק"
              disabled={!selectedElement || selectedElement === 'base-product'}
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-[10px]">מחק</span>
            </button>
            <button
              onClick={undo}
              className="p-2 rounded-lg hover:bg-gray-200 transition-colors flex flex-col items-center gap-1"
              title="בטל"
              disabled={historyIndex <= 0}
            >
              <Undo className="w-5 h-5" />
              <span className="text-[10px]">בטל</span>
            </button>
          </div>

          {/* Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 bg-gray-200 relative overflow-auto"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedElement(null)}
          >
            <div 
              className="relative bg-white shadow-lg m-4 origin-top-right"
              style={{ 
                width: 800 * zoom, 
                height: 600 * zoom,
                minWidth: 800 * zoom,
                minHeight: 600 * zoom
              }}
            >
              {/* Grid pattern */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-20"
                style={{
                  backgroundImage: 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)',
                  backgroundSize: `${20 * zoom}px ${20 * zoom}px`
                }}
              />
              
              {/* Sort elements by zIndex */}
              {[...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(element => (
                <div
                  key={element.id}
                  className={`absolute cursor-move ${
                    selectedElement === element.id 
                      ? 'ring-2 ring-blue-500 ring-offset-2' 
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
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(e, element.id);
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
                  
                  {/* Resize handles for selected element */}
                  {selectedElement === element.id && element.type === 'image' && (
                    <>
                      <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-se-resize" />
                      <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-sw-resize" />
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full cursor-ne-resize" />
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full cursor-nw-resize" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Left Panel - Search Results */}
          {showSearch && (
            <div className="w-80 bg-white border-r flex flex-col">
              <div className="p-3 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">חיפוש מוצרים</h3>
                  <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-gray-100 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפש מוצר לפי שם..."
                    className="w-full pr-10 pl-3 py-2 border rounded-lg text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {isSearching ? (
                  <div className="text-center py-8 text-gray-500">מחפש...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {searchQuery ? 'לא נמצאו תוצאות' : 'הקלד שם מוצר לחיפוש'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.map(product => (
                      <button
                        key={product.id}
                        onClick={() => product.image && addImageFromProduct(product.image)}
                        className="p-2 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-right"
                        disabled={!product.image}
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full aspect-square object-cover rounded mb-1"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-gray-100 rounded mb-1 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                        <p className="text-xs line-clamp-2">{product.name}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Text Input Modal */}
        {showTextInput && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="bg-white rounded-lg p-4 w-80">
              <h3 className="font-medium mb-3">הוסף טקסט</h3>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="הקלד טקסט..."
                className="w-full px-3 py-2 border rounded-lg mb-3"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && addText()}
              />
              <div className="flex items-center gap-2 mb-3">
                <label className="text-sm text-gray-600">צבע:</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowTextInput(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  ביטול
                </button>
                <button
                  onClick={addText}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  הוסף
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">זום:</span>
            <button 
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button 
              onClick={() => setZoom(z => Math.min(2, z + 0.1))}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            
            {selectedElementData && (
              <span className="text-sm text-gray-500 mr-4">
                נבחר: {selectedElementData.type === 'image' ? 'תמונה' : 
                       selectedElementData.type === 'text' ? 'טקסט' :
                       selectedElementData.type === 'arrow' ? 'חץ' :
                       selectedElementData.type === 'rectangle' ? 'מלבן' :
                       selectedElementData.type === 'circle' ? 'עיגול' :
                       selectedElementData.type === 'line' ? 'קו' : selectedElementData.type}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
            >
              סגור
            </button>
            <button
              onClick={exportAsImage}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 font-medium"
            >
              <Download className="w-4 h-4" />
              שמור והורד
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
