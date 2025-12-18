'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { 
  X, Search, Trash2, Download, RotateCcw, 
  Type, ArrowRight, ZoomIn, ZoomOut, Move, 
  Layers, Plus, Minus, Save, ImageIcon
} from 'lucide-react';

interface DesignElement {
  id: string;
  type: 'image' | 'text' | 'arrow';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  content?: string; // for text
  src?: string; // for image
  fontSize?: number;
  color?: string;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<'select' | 'text' | 'arrow'>('select');
  const [zoom, setZoom] = useState(1);
  
  // Product search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Text input
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  
  // Load base image when opening
  useEffect(() => {
    if (isOpen && productImage) {
      // Add base product image as first element
      setElements([{
        id: 'base-product',
        type: 'image',
        x: 50,
        y: 50,
        width: 400,
        height: 300,
        src: productImage,
        rotation: 0
      }]);
    }
  }, [isOpen, productImage]);

  // Search products
  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}&per_page=12`);
      const data = await response.json();
      
      if (data.products) {
        setSearchResults(data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          image: p.images?.[0]?.src || '',
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

  // Add image from search
  const addImageFromProduct = (src: string) => {
    const newElement: DesignElement = {
      id: `img-${Date.now()}`,
      type: 'image',
      x: 200,
      y: 200,
      width: 150,
      height: 150,
      src,
      rotation: 0
    };
    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
    setShowSearch(false);
    setSearchQuery('');
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
      fontSize: 18,
      color: '#000000'
    };
    setElements(prev => [...prev, newElement]);
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
      color: '#000000'
    };
    setElements(prev => [...prev, newElement]);
    setSelectedElement(newElement.id);
  };

  // Delete selected element
  const deleteSelected = () => {
    if (selectedElement && selectedElement !== 'base-product') {
      setElements(prev => prev.filter(el => el.id !== selectedElement));
      setSelectedElement(null);
    }
  };

  // Mouse handlers for dragging
  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    if (tool !== 'select') return;
    
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    setSelectedElement(elementId);
    setIsDragging(true);
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left - element.x,
        y: e.clientY - rect.top - element.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return;
    
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;
    
    setElements(prev => prev.map(el => 
      el.id === selectedElement 
        ? { ...el, x: newX, y: newY }
        : el
    ));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Resize element
  const resizeElement = (delta: number) => {
    if (!selectedElement) return;
    
    setElements(prev => prev.map(el => {
      if (el.id !== selectedElement) return el;
      
      if (el.type === 'image') {
        return {
          ...el,
          width: Math.max(50, (el.width || 100) + delta),
          height: Math.max(50, (el.height || 100) + delta)
        };
      } else if (el.type === 'text') {
        return {
          ...el,
          fontSize: Math.max(10, (el.fontSize || 18) + delta / 5)
        };
      }
      return el;
    }));
  };

  // Export canvas as image
  const exportAsImage = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 800;
    canvas.height = 600;
    
    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw elements (simplified - in real app would need to load images async)
    const drawPromises = elements.map(el => {
      return new Promise<void>((resolve) => {
        if (el.type === 'image' && el.src) {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, el.x, el.y, el.width || 100, el.height || 100);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = el.src;
        } else if (el.type === 'text' && el.content) {
          ctx.font = `${el.fontSize || 18}px Arial`;
          ctx.fillStyle = el.color || '#000000';
          ctx.fillText(el.content, el.x, el.y);
          resolve();
        } else if (el.type === 'arrow') {
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.lineTo(el.x + (el.width || 100), el.y);
          ctx.strokeStyle = el.color || '#000000';
          ctx.lineWidth = 2;
          ctx.stroke();
          // Arrow head
          ctx.beginPath();
          ctx.moveTo(el.x + (el.width || 100), el.y);
          ctx.lineTo(el.x + (el.width || 100) - 10, el.y - 5);
          ctx.lineTo(el.x + (el.width || 100) - 10, el.y + 5);
          ctx.closePath();
          ctx.fill();
          resolve();
        } else {
          resolve();
        }
      });
    });
    
    Promise.all(drawPromises).then(() => {
      const dataUrl = canvas.toDataURL('image/png');
      
      // Download
      const link = document.createElement('a');
      link.download = `design-${productName}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
      
      // Callback
      onSave?.(dataUrl);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">לוח עיצוב - {productName}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="w-16 bg-gray-100 p-2 flex flex-col gap-2 border-l">
            <button
              onClick={() => setTool('select')}
              className={`p-3 rounded-lg transition-colors ${tool === 'select' ? 'bg-primary text-white' : 'hover:bg-gray-200'}`}
              title="בחירה והזזה"
            >
              <Move className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSearch(true)}
              className="p-3 rounded-lg hover:bg-gray-200 transition-colors"
              title="הוסף תמונה ממוצר"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowTextInput(true)}
              className="p-3 rounded-lg hover:bg-gray-200 transition-colors"
              title="הוסף טקסט"
            >
              <Type className="w-5 h-5" />
            </button>
            <button
              onClick={addArrow}
              className="p-3 rounded-lg hover:bg-gray-200 transition-colors"
              title="הוסף חץ"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <div className="border-t my-2" />
            
            <button
              onClick={() => resizeElement(20)}
              className="p-3 rounded-lg hover:bg-gray-200 transition-colors"
              title="הגדל"
              disabled={!selectedElement}
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={() => resizeElement(-20)}
              className="p-3 rounded-lg hover:bg-gray-200 transition-colors"
              title="הקטן"
              disabled={!selectedElement}
            >
              <Minus className="w-5 h-5" />
            </button>
            <button
              onClick={deleteSelected}
              className="p-3 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
              title="מחק"
              disabled={!selectedElement || selectedElement === 'base-product'}
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            <div className="flex-1" />
            
            <button
              onClick={exportAsImage}
              className="p-3 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              title="הורד כתמונה"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>

          {/* Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 bg-gray-50 relative overflow-auto"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedElement(null)}
          >
            <div 
              className="relative bg-white shadow-lg m-4"
              style={{ 
                width: 800 * zoom, 
                height: 600 * zoom,
                minWidth: 800 * zoom,
                minHeight: 600 * zoom
              }}
            >
              {elements.map(element => (
                <div
                  key={element.id}
                  className={`absolute cursor-move ${
                    selectedElement === element.id ? 'ring-2 ring-primary ring-offset-2' : ''
                  }`}
                  style={{
                    left: element.x * zoom,
                    top: element.y * zoom,
                    transform: `rotate(${element.rotation || 0}deg)`,
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
                        fontSize: (element.fontSize || 18) * zoom,
                        color: element.color,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {element.content}
                    </span>
                  )}
                  {element.type === 'arrow' && (
                    <svg 
                      width={(element.width || 100) * zoom} 
                      height={20 * zoom}
                      style={{ overflow: 'visible' }}
                    >
                      <line
                        x1={0}
                        y1={10 * zoom}
                        x2={(element.width || 100) * zoom - 10}
                        y2={10 * zoom}
                        stroke={element.color || '#000'}
                        strokeWidth={2 * zoom}
                      />
                      <polygon
                        points={`${(element.width || 100) * zoom},${10 * zoom} ${(element.width || 100) * zoom - 10},${5 * zoom} ${(element.width || 100) * zoom - 10},${15 * zoom}`}
                        fill={element.color || '#000'}
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel - Search Results */}
          {showSearch && (
            <div className="w-72 bg-white border-r flex flex-col">
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
                    placeholder="חפש מוצר..."
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
                        className="p-2 border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors text-right"
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
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowTextInput(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  ביטול
                </button>
                <button
                  onClick={addText}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
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
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
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
