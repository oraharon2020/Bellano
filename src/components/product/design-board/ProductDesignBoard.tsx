'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Trash2, Download, RotateCw, 
  Type, ArrowRight, ZoomIn, ZoomOut, 
  Plus, Minus, Copy, Undo, FlipHorizontal,
  Square, Circle, ImageIcon, ChevronUp, ChevronDown,
  Crop, Droplets, MousePointer, Eye
} from 'lucide-react';

import { DesignElement, ProductDesignBoardProps, ToolMode } from './types';
import { ToolButton, SectionHeader } from './ToolbarComponents';
import { CanvasElement, CropOverlay } from './CanvasElements';
import { ProductSearchPanel } from './ProductSearchPanel';
import { CropModal, TextInputModal } from './Modals';
import { useProductSearch } from './hooks';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export function ProductDesignBoard({ 
  isOpen, 
  onClose, 
  productImage, 
  productName,
  onSave 
}: ProductDesignBoardProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Elements state
  const [elements, setElements] = useState<DesignElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  
  // History for undo
  const [history, setHistory] = useState<DesignElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Tool state
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [zoom, setZoom] = useState(1);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 });
  const [showCropPreview, setShowCropPreview] = useState(false);
  
  // UI state
  const [showSearch, setShowSearch] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('add');
  
  // Text input
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  
  // Shape colors
  const [shapeColor, setShapeColor] = useState('#000000');
  const [shapeFill, setShapeFill] = useState('transparent');
  
  // Product search hook
  const { searchQuery, setSearchQuery, searchResults, isSearching, searchProducts } = useProductSearch();

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) searchProducts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts]);

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

  // Load base image
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
        originalSrc: productImage,
        rotation: 0,
        zIndex: 0,
        opacity: 100
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
        setToolMode('select');
        setIsCropping(false);
        setShowCropPreview(false);
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

  // Get max zIndex
  const getMaxZIndex = () => Math.max(...elements.map(el => el.zIndex || 0), 0);

  // Get mouse position relative to canvas
  const getCanvasPosition = (e: React.MouseEvent): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    
    return { x, y };
  };

  // Handle mouse down on element
  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    
    setSelectedElement(elementId);
    
    if (toolMode === 'crop' && element.type === 'image') {
      const pos = getCanvasPosition(e);
      if (pos) {
        setCropStart(pos);
        setCropEnd(pos);
        setIsCropping(true);
      }
      return;
    }
    
    // Start dragging
    const pos = getCanvasPosition(e);
    if (pos) {
      setDragOffset({
        x: pos.x - element.x,
        y: pos.y - element.y
      });
      setIsDragging(true);
    }
  };

  // Handle mouse move on canvas
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasPosition(e);
    if (!pos) return;
    
    if (isCropping) {
      setCropEnd(pos);
      return;
    }
    
    if (isDragging && selectedElement) {
      setElements(prev => prev.map(el => 
        el.id === selectedElement 
          ? { ...el, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y }
          : el
      ));
    }
  };

  // Handle mouse up
  const handleCanvasMouseUp = () => {
    if (isCropping) {
      const width = Math.abs(cropEnd.x - cropStart.x);
      const height = Math.abs(cropEnd.y - cropStart.y);
      if (width > 10 && height > 10) {
        setShowCropPreview(true);
      }
      setIsCropping(false);
    }
    
    if (isDragging) {
      saveToHistory(elements);
      setIsDragging(false);
    }
  };

  // Apply crop
  const applyCrop = async () => {
    if (!selectedElement) return;
    
    const element = elements.find(el => el.id === selectedElement);
    if (!element || element.type !== 'image' || !element.src) return;
    
    // Get crop bounds
    const minX = Math.min(cropStart.x, cropEnd.x);
    const minY = Math.min(cropStart.y, cropEnd.y);
    const maxX = Math.max(cropStart.x, cropEnd.x);
    const maxY = Math.max(cropStart.y, cropEnd.y);
    
    // Calculate relative to element
    const cropX = Math.max(0, minX - element.x);
    const cropY = Math.max(0, minY - element.y);
    const cropWidth = Math.min(maxX - minX, (element.width || 100) - cropX);
    const cropHeight = Math.min(maxY - minY, (element.height || 100) - cropY);
    
    if (cropWidth < 10 || cropHeight < 10) {
      setShowCropPreview(false);
      return;
    }
    
    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = element.originalSrc || element.src || '';
      });
      
      // Calculate scale
      const scaleX = img.naturalWidth / (element.width || 100);
      const scaleY = img.naturalHeight / (element.height || 100);
      
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cropWidth * scaleX);
      canvas.height = Math.round(cropHeight * scaleY);
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          img,
          Math.round(cropX * scaleX),
          Math.round(cropY * scaleY),
          canvas.width,
          canvas.height,
          0, 0,
          canvas.width,
          canvas.height
        );
        
        const croppedSrc = canvas.toDataURL('image/png');
        
        // Add as new element
        const newElement: DesignElement = {
          id: `cropped-${Date.now()}`,
          type: 'image',
          x: minX,
          y: minY,
          width: cropWidth,
          height: cropHeight,
          src: croppedSrc,
          originalSrc: croppedSrc,
          zIndex: getMaxZIndex() + 1,
          opacity: 100
        };
        
        const newElements = [...elements, newElement];
        setElements(newElements);
        saveToHistory(newElements);
        setSelectedElement(newElement.id);
      }
    } catch (error) {
      console.error('Crop error:', error);
    }
    
    setShowCropPreview(false);
    setToolMode('select');
  };

  // Add image from product
  const addImageFromProduct = (src: string) => {
    const newElement: DesignElement = {
      id: `img-${Date.now()}`,
      type: 'image',
      x: 200,
      y: 150,
      width: 200,
      height: 200,
      src,
      originalSrc: src,
      zIndex: getMaxZIndex() + 1,
      opacity: 100
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
      zIndex: getMaxZIndex() + 1,
      opacity: 100
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
    setTextInput('');
    setShowTextInput(false);
  };

  // Add shape
  const addShape = (type: 'arrow' | 'line' | 'rectangle' | 'circle') => {
    const baseProps = {
      id: `${type}-${Date.now()}`,
      type: type as DesignElement['type'],
      x: 250 + Math.random() * 100,
      y: 250 + Math.random() * 100,
      color: shapeColor,
      zIndex: getMaxZIndex() + 1,
      opacity: 100
    };
    
    let newElement: DesignElement;
    
    switch (type) {
      case 'arrow': newElement = { ...baseProps, width: 100 }; break;
      case 'line': newElement = { ...baseProps, width: 150 }; break;
      case 'rectangle': newElement = { ...baseProps, width: 100, height: 60, backgroundColor: shapeFill }; break;
      case 'circle': newElement = { ...baseProps, width: 80, height: 80, backgroundColor: shapeFill }; break;
      default: return;
    }
    
    const newElements = [...elements, newElement];
    setElements(newElements);
    saveToHistory(newElements);
    setSelectedElement(newElement.id);
  };

  // Delete selected
  const deleteSelected = () => {
    if (selectedElement && selectedElement !== 'base-product') {
      const newElements = elements.filter(el => el.id !== selectedElement);
      setElements(newElements);
      saveToHistory(newElements);
      setSelectedElement(null);
    }
  };

  // Duplicate selected
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

  // Rotate selected
  const rotateSelected = (degrees: number) => {
    if (!selectedElement) return;
    const newElements = elements.map(el => 
      el.id === selectedElement 
        ? { ...el, rotation: ((el.rotation || 0) + degrees) % 360 }
        : el
    );
    setElements(newElements);
    saveToHistory(newElements);
  };

  // Flip selected
  const flipSelected = () => {
    if (!selectedElement) return;
    const newElements = elements.map(el => 
      el.id === selectedElement ? { ...el, flipX: !el.flipX } : el
    );
    setElements(newElements);
    saveToHistory(newElements);
  };

  // Change opacity
  const changeOpacity = (value: number) => {
    if (!selectedElement) return;
    setElements(prev => prev.map(el => 
      el.id === selectedElement ? { ...el, opacity: value } : el
    ));
  };

  // Resize element
  const resizeElement = (delta: number) => {
    if (!selectedElement) return;
    const newElements = elements.map(el => {
      if (el.id !== selectedElement) return el;
      
      if (el.type === 'image' || el.type === 'rectangle' || el.type === 'circle') {
        const ratio = (el.width || 100) / (el.height || 100);
        return { 
          ...el, 
          width: Math.max(30, (el.width || 100) + delta),
          height: el.type === 'circle' ? Math.max(30, (el.width || 100) + delta) : Math.max(30, (el.height || 100) + delta / ratio)
        };
      } else if (el.type === 'text') {
        return { ...el, fontSize: Math.max(10, (el.fontSize || 24) + delta / 5) };
      } else {
        return { ...el, width: Math.max(30, (el.width || 100) + delta) };
      }
    });
    setElements(newElements);
  };

  // Move layer
  const moveLayer = (direction: 'up' | 'down') => {
    if (!selectedElement) return;
    const element = elements.find(el => el.id === selectedElement);
    if (!element) return;
    
    const newZ = direction === 'up' ? (element.zIndex || 0) + 1 : Math.max(0, (element.zIndex || 0) - 1);
    const newElements = elements.map(el => 
      el.id === selectedElement ? { ...el, zIndex: newZ } : el
    );
    setElements(newElements);
    saveToHistory(newElements);
  };

  // Remove background
  const removeBackground = async () => {
    if (!selectedElement) return;
    const element = elements.find(el => el.id === selectedElement);
    if (!element || element.type !== 'image' || !element.src) return;
    
    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = element.src!;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 240 && data[i+1] > 240 && data[i+2] > 240) {
            data[i + 3] = 0;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        const newSrc = canvas.toDataURL('image/png');
        
        const newElements = elements.map(el => 
          el.id === selectedElement ? { ...el, src: newSrc } : el
        );
        setElements(newElements);
        saveToHistory(newElements);
      }
    } catch (error) {
      console.error('Remove background error:', error);
    }
  };

  // Export as image
  const exportAsImage = async () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    for (const el of sortedElements) {
      ctx.save();
      ctx.globalAlpha = (el.opacity ?? 100) / 100;
      
      if (el.rotation || el.flipX) {
        const cx = el.x + (el.width || 0) / 2;
        const cy = el.y + (el.height || 0) / 2;
        ctx.translate(cx, cy);
        if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
        if (el.flipX) ctx.scale(-1, 1);
        ctx.translate(-cx, -cy);
      }
      
      if (el.type === 'image' && el.src) {
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new window.Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = el.src!;
          });
          ctx.drawImage(img, el.x, el.y, el.width || 100, el.height || 100);
        } catch {}
      } else if (el.type === 'text' && el.content) {
        ctx.font = `${el.fontSize || 24}px Arial`;
        ctx.fillStyle = el.color || '#000';
        ctx.fillText(el.content, el.x, el.y + (el.fontSize || 24));
      } else if (el.type === 'arrow') {
        ctx.strokeStyle = el.color || '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + (el.width || 100) - 10, el.y);
        ctx.stroke();
        ctx.fillStyle = el.color || '#000';
        ctx.beginPath();
        ctx.moveTo(el.x + (el.width || 100), el.y);
        ctx.lineTo(el.x + (el.width || 100) - 15, el.y - 8);
        ctx.lineTo(el.x + (el.width || 100) - 15, el.y + 8);
        ctx.fill();
      } else if (el.type === 'line') {
        ctx.strokeStyle = el.color || '#000';
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
        ctx.strokeStyle = el.color || '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(el.x, el.y, el.width || 100, el.height || 60);
      } else if (el.type === 'circle') {
        const r = (el.width || 80) / 2;
        ctx.beginPath();
        ctx.arc(el.x + r, el.y + r, r, 0, Math.PI * 2);
        if (el.backgroundColor && el.backgroundColor !== 'transparent') {
          ctx.fillStyle = el.backgroundColor;
          ctx.fill();
        }
        ctx.strokeStyle = el.color || '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `design-${productName}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    onSave?.(dataUrl);
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-l from-purple-50 to-white">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">🎨 לוח עיצוב - {productName}</h2>
            <div className="hidden md:flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              <span className="font-medium">Del</span>=מחיקה |
              <span className="font-medium">Ctrl+D</span>=שכפול |
              <span className="font-medium">Ctrl+Z</span>=בטל
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Toolbar */}
          <div className="w-64 bg-gray-50 border-l flex flex-col overflow-hidden">
            {/* Tool Mode */}
            <div className="p-3 border-b bg-white">
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setToolMode('select')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                    toolMode === 'select' ? 'bg-white shadow text-purple-700' : 'text-gray-600'
                  }`}
                >
                  <MousePointer className="w-4 h-4" />
                  בחירה
                </button>
                <button
                  onClick={() => setToolMode('crop')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                    toolMode === 'crop' ? 'bg-white shadow text-yellow-600' : 'text-gray-600'
                  }`}
                >
                  <Crop className="w-4 h-4" />
                  חיתוך
                </button>
              </div>
              {toolMode === 'crop' && (
                <p className="text-xs text-yellow-600 mt-2 text-center">✂️ גרור על תמונה לחיתוך</p>
              )}
            </div>
            
            {/* Sections */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Add Elements */}
              <div className="bg-white rounded-xl border shadow-sm">
                <SectionHeader 
                  title="➕ הוספת אלמנטים" 
                  isOpen={activeSection === 'add'} 
                  onToggle={() => setActiveSection(activeSection === 'add' ? '' : 'add')} 
                />
                {activeSection === 'add' && (
                  <div className="p-2 space-y-1 border-t">
                    <ToolButton onClick={() => setShowSearch(true)} icon={ImageIcon} label="🔍 חפש מוצר" />
                    <ToolButton onClick={() => setShowTextInput(true)} icon={Type} label="הוסף טקסט" />
                    <div className="grid grid-cols-2 gap-1 pt-1">
                      <ToolButton onClick={() => addShape('arrow')} icon={ArrowRight} label="חץ" />
                      <ToolButton onClick={() => addShape('line')} icon={Minus} label="קו" />
                      <ToolButton onClick={() => addShape('rectangle')} icon={Square} label="מלבן" />
                      <ToolButton onClick={() => addShape('circle')} icon={Circle} label="עיגול" />
                    </div>
                  </div>
                )}
              </div>

              {/* Edit */}
              <div className="bg-white rounded-xl border shadow-sm">
                <SectionHeader 
                  title="✏️ עריכה" 
                  isOpen={activeSection === 'edit'} 
                  onToggle={() => setActiveSection(activeSection === 'edit' ? '' : 'edit')} 
                />
                {activeSection === 'edit' && (
                  <div className="p-2 space-y-1 border-t">
                    {!selectedElement ? (
                      <p className="text-xs text-gray-500 text-center py-4">בחר אלמנט לעריכה</p>
                    ) : (
                      <>
                        {selectedElementData?.type === 'image' && (
                          <ToolButton onClick={removeBackground} icon={Droplets} label="🧹 הסר רקע לבן" />
                        )}
                        <div className="grid grid-cols-2 gap-1">
                          <ToolButton onClick={() => resizeElement(20)} icon={Plus} label="הגדל" />
                          <ToolButton onClick={() => resizeElement(-20)} icon={Minus} label="הקטן" />
                          <ToolButton onClick={() => rotateSelected(15)} icon={RotateCw} label="סובב" />
                          <ToolButton onClick={flipSelected} icon={FlipHorizontal} label="הפוך" />
                        </div>
                        <ToolButton onClick={duplicateSelected} icon={Copy} label="שכפל" />
                        
                        {/* Opacity */}
                        <div className="px-3 py-3 bg-gray-50 rounded-lg mt-2">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="flex items-center gap-2"><Eye className="w-4 h-4" />שקיפות</span>
                            <span className="font-medium">{selectedElementData?.opacity ?? 100}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={selectedElementData?.opacity ?? 100}
                            onChange={(e) => changeOpacity(parseInt(e.target.value))}
                            onMouseUp={() => saveToHistory(elements)}
                            className="w-full h-2 bg-gray-200 rounded-lg accent-purple-600"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Layers */}
              <div className="bg-white rounded-xl border shadow-sm">
                <SectionHeader 
                  title="📚 שכבות" 
                  isOpen={activeSection === 'layers'} 
                  onToggle={() => setActiveSection(activeSection === 'layers' ? '' : 'layers')} 
                />
                {activeSection === 'layers' && (
                  <div className="p-2 space-y-1 border-t">
                    <div className="grid grid-cols-2 gap-1">
                      <ToolButton onClick={() => moveLayer('up')} icon={ChevronUp} label="קדימה" disabled={!selectedElement} />
                      <ToolButton onClick={() => moveLayer('down')} icon={ChevronDown} label="אחורה" disabled={!selectedElement} />
                    </div>
                    <div className="border-t my-2" />
                    <ToolButton onClick={deleteSelected} icon={Trash2} label="🗑️ מחק" disabled={!selectedElement || selectedElement === 'base-product'} danger />
                    <ToolButton onClick={undo} icon={Undo} label="↩️ בטל" disabled={historyIndex <= 0} />
                  </div>
                )}
              </div>

              {/* Colors */}
              <div className="bg-white rounded-xl border shadow-sm">
                <SectionHeader 
                  title="🎨 צבעים" 
                  isOpen={activeSection === 'colors'} 
                  onToggle={() => setActiveSection(activeSection === 'colors' ? '' : 'colors')} 
                />
                {activeSection === 'colors' && (
                  <div className="p-3 space-y-3 border-t">
                    <div className="flex items-center gap-3">
                      <input type="color" value={shapeColor} onChange={(e) => setShapeColor(e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer border-2" />
                      <div><p className="text-sm font-medium">צבע קו</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input type="color" value={shapeFill === 'transparent' ? '#ffffff' : shapeFill} onChange={(e) => setShapeFill(e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer border-2" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">מילוי</p>
                        <button onClick={() => setShapeFill('transparent')} className={`text-xs px-2 py-0.5 rounded mt-1 ${shapeFill === 'transparent' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>
                          ללא
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selected info */}
            {selectedElementData && (
              <div className="p-3 border-t bg-purple-50">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <span className="font-medium text-purple-800">
                    {selectedElementData.type === 'image' ? 'תמונה' : 
                     selectedElementData.type === 'text' ? 'טקסט' : selectedElementData.type}
                    {selectedElementData.id === 'base-product' && ' (בסיס)'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-gray-200 relative overflow-auto p-4">
            <div 
              ref={canvasRef}
              className="relative bg-white shadow-lg mx-auto"
              style={{ 
                width: CANVAS_WIDTH * zoom, 
                height: CANVAS_HEIGHT * zoom,
              }}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onClick={() => setSelectedElement(null)}
            >
              {/* Grid */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: 'linear-gradient(#9ca3af 1px, transparent 1px), linear-gradient(90deg, #9ca3af 1px, transparent 1px)',
                  backgroundSize: `${20 * zoom}px ${20 * zoom}px`
                }}
              />
              
              {/* Elements */}
              {[...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(element => (
                <CanvasElement
                  key={element.id}
                  element={element}
                  zoom={zoom}
                  isSelected={selectedElement === element.id}
                  toolMode={toolMode}
                  onMouseDown={(e) => handleElementMouseDown(e, element.id)}
                />
              ))}
              
              {/* Crop overlay */}
              {(isCropping || showCropPreview) && (
                <CropOverlay cropStart={cropStart} cropEnd={cropEnd} zoom={zoom} />
              )}
            </div>
          </div>

          {/* Search panel */}
          <ProductSearchPanel
            isOpen={showSearch}
            onClose={() => setShowSearch(false)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchResults={searchResults}
            isSearching={isSearching}
            onSelectProduct={addImageFromProduct}
          />
        </div>

        {/* Modals */}
        <CropModal isOpen={showCropPreview} onCancel={() => { setShowCropPreview(false); setToolMode('select'); }} onApply={applyCrop} />
        <TextInputModal
          isOpen={showTextInput}
          textInput={textInput}
          textColor={textColor}
          onTextChange={setTextInput}
          onColorChange={setTextColor}
          onCancel={() => setShowTextInput(false)}
          onAdd={addText}
        />

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border">
              <span className="text-sm text-gray-500">זום:</span>
              <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1 hover:bg-gray-100 rounded"><ZoomOut className="w-4 h-4" /></button>
              <span className="text-sm w-12 text-center font-medium">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1 hover:bg-gray-100 rounded"><ZoomIn className="w-4 h-4" /></button>
            </div>
            <div className="text-sm text-gray-500">{elements.length} אלמנטים</div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg">סגור</button>
            <button onClick={exportAsImage} className="px-6 py-2.5 bg-gradient-to-l from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 flex items-center gap-2 font-medium shadow-lg shadow-purple-200">
              <Download className="w-4 h-4" />
              שמור והורד
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
