'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Search, Trash2, Download, RotateCw, 
  Type, ArrowRight, ZoomIn, ZoomOut, 
  Plus, Minus, Copy, Undo, FlipHorizontal,
  Square, Circle, ImageIcon, ChevronUp, ChevronDown,
  Crop, Droplets, Scissors, MousePointer, Eye
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
  opacity?: number;
  originalSrc?: string;
}

interface ProductSearchResult {
  id: number;
  name: string;
  image: string;
  slug: string;
}

type ToolMode = 'select' | 'crop';

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
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  
  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState({ x: 0, y: 0 });
  const [cropEnd, setCropEnd] = useState({ x: 0, y: 0 });
  const [showCropPreview, setShowCropPreview] = useState(false);
  
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
  
  // Active toolbar section
  const [activeSection, setActiveSection] = useState<string>('add');

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
      const url = `/api/products/search?q=${encodeURIComponent(query)}&per_page=20`;
      console.log('Searching products:', url);
      
      const response = await fetch(url);
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Search results:', data);
      
      if (data.products && Array.isArray(data.products)) {
        const results = data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          image: p.image || '',
          slug: p.slug
        }));
        console.log('Mapped results:', results);
        setSearchResults(results);
      } else {
        console.log('No products in response');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
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
      originalSrc: src,
      rotation: 0,
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

  // Add shapes
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
      case 'arrow':
        newElement = { ...baseProps, width: 100, rotation: 0 };
        break;
      case 'line':
        newElement = { ...baseProps, width: 150, rotation: 0 };
        break;
      case 'rectangle':
        newElement = { ...baseProps, width: 100, height: 60, backgroundColor: shapeFill };
        break;
      case 'circle':
        newElement = { ...baseProps, width: 80, height: 80, backgroundColor: shapeFill };
        break;
      default:
        return;
    }
    
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

  // Change opacity
  const changeOpacity = (value: number) => {
    if (!selectedElement) return;
    
    const newElements = elements.map(el => {
      if (el.id !== selectedElement) return el;
      return { ...el, opacity: value };
    });
    setElements(newElements);
  };

  // Save opacity to history when done dragging
  const saveOpacityToHistory = () => {
    saveToHistory(elements);
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
    if (toolMode === 'crop' && elements.find(el => el.id === elementId)?.type === 'image') {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const x = (e.clientX - rect.left) / zoom;
        const y = (e.clientY - rect.top) / zoom;
        setCropStart({ x, y });
        setCropEnd({ x, y });
        setIsCropping(true);
        setSelectedElement(elementId);
      }
      return;
    }
    
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
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    if (isCropping) {
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      setCropEnd({ x, y });
      return;
    }
    
    if (!isDragging || !selectedElement) return;
    
    const newX = (e.clientX - rect.left) / zoom - dragOffset.x;
    const newY = (e.clientY - rect.top) / zoom - dragOffset.y;
    
    setElements(prev => prev.map(el => 
      el.id === selectedElement 
        ? { ...el, x: newX, y: newY }
        : el
    ));
  };

  const handleMouseUp = () => {
    if (isCropping && selectedElement) {
      setShowCropPreview(true);
    }
    if (isDragging) {
      saveToHistory(elements);
    }
    setIsDragging(false);
    setIsCropping(false);
  };

  // Apply crop
  const applyCrop = async () => {
    if (!selectedElement) return;
    
    const element = elements.find(el => el.id === selectedElement);
    if (!element || element.type !== 'image' || !element.src) return;
    
    const minX = Math.min(cropStart.x, cropEnd.x);
    const minY = Math.min(cropStart.y, cropEnd.y);
    const maxX = Math.max(cropStart.x, cropEnd.x);
    const maxY = Math.max(cropStart.y, cropEnd.y);
    
    const cropX = minX - element.x;
    const cropY = minY - element.y;
    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;
    
    if (cropWidth < 10 || cropHeight < 10) {
      setShowCropPreview(false);
      return;
    }
    
    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      const imgSrc = element.originalSrc || element.src || '';
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgSrc;
      });
      
      const scaleX = img.width / (element.width || 100);
      const scaleY = img.height / (element.height || 100);
      
      const canvas = document.createElement('canvas');
      canvas.width = cropWidth * scaleX;
      canvas.height = cropHeight * scaleY;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          img,
          cropX * scaleX, cropY * scaleY,
          cropWidth * scaleX, cropHeight * scaleY,
          0, 0,
          canvas.width, canvas.height
        );
        
        const croppedSrc = canvas.toDataURL('image/png');
        
        const newElements = elements.map(el => {
          if (el.id !== selectedElement) return el;
          return {
            ...el,
            src: croppedSrc,
            x: minX,
            y: minY,
            width: cropWidth,
            height: cropHeight
          };
        });
        setElements(newElements);
        saveToHistory(newElements);
      }
    } catch (error) {
      console.error('Crop error:', error);
    }
    
    setShowCropPreview(false);
    setToolMode('select');
  };

  // Cancel crop
  const cancelCrop = () => {
    setShowCropPreview(false);
    setToolMode('select');
  };

  // Remove background
  const removeBackground = async () => {
    if (!selectedElement) return;
    
    const element = elements.find(el => el.id === selectedElement);
    if (!element || element.type !== 'image' || !element.src) return;
    
    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      const imgSrc = element.src;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imgSrc;
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const threshold = 240;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (r > threshold && g > threshold && b > threshold) {
            data[i + 3] = 0;
          }
        }
        
        ctx.putImageData(imageData, 0, 0);
        const newSrc = canvas.toDataURL('image/png');
        
        const newElements = elements.map(el => {
          if (el.id !== selectedElement) return el;
          return { ...el, src: newSrc };
        });
        setElements(newElements);
        saveToHistory(newElements);
      }
    } catch (error) {
      console.error('Remove background error:', error);
    }
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
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const sortedElements = [...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    for (const el of sortedElements) {
      ctx.save();
      ctx.globalAlpha = (el.opacity ?? 100) / 100;
      
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
    
    const link = document.createElement('a');
    link.download = `design-${productName}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    
    onSave?.(dataUrl);
  };

  const selectedElementData = elements.find(el => el.id === selectedElement);

  if (!isOpen) return null;

  // Toolbar button component
  const ToolButton = ({ 
    onClick, 
    icon: Icon, 
    label, 
    active = false,
    disabled = false,
    danger = false,
    tooltip
  }: { 
    onClick: () => void; 
    icon: any; 
    label: string;
    active?: boolean;
    disabled?: boolean;
    danger?: boolean;
    tooltip?: string;
  }) => (
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

  // Section header component
  const SectionHeader = ({ title, section }: { title: string; section: string }) => (
    <button
      onClick={() => setActiveSection(activeSection === section ? '' : section)}
      className="flex items-center justify-between w-full px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
    >
      {title}
      <ChevronDown className={`w-4 h-4 transition-transform ${activeSection === section ? 'rotate-180' : ''}`} />
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-xl w-full max-w-7xl max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-l from-purple-50 to-white">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">🎨 לוח עיצוב - {productName}</h2>
            <div className="hidden md:flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              <span className="font-medium">Del</span>=מחיקה
              <span className="mx-1">|</span>
              <span className="font-medium">Ctrl+D</span>=שכפול
              <span className="mx-1">|</span>
              <span className="font-medium">Ctrl+Z</span>=בטל
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Right Toolbar - Redesigned */}
          <div className="w-64 bg-gray-50 border-l flex flex-col overflow-hidden">
            {/* Tool Mode Selector */}
            <div className="p-3 border-b bg-white">
              <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setToolMode('select')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                    toolMode === 'select' ? 'bg-white shadow text-purple-700' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <MousePointer className="w-4 h-4" />
                  בחירה וגרירה
                </button>
                <button
                  onClick={() => setToolMode('crop')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
                    toolMode === 'crop' ? 'bg-white shadow text-yellow-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Crop className="w-4 h-4" />
                  חיתוך
                </button>
              </div>
              {toolMode === 'crop' && (
                <p className="text-xs text-yellow-600 mt-2 text-center">
                  ✂️ גרור מלבן על תמונה לחיתוך
                </p>
              )}
            </div>
            
            {/* Scrollable Sections */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Add Elements Section */}
              <div className="bg-white rounded-xl border shadow-sm">
                <SectionHeader title="➕ הוספת אלמנטים" section="add" />
                {activeSection === 'add' && (
                  <div className="p-2 space-y-1 border-t">
                    <ToolButton onClick={() => setShowSearch(true)} icon={ImageIcon} label="🔍 חפש והוסף תמונת מוצר" />
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

              {/* Edit Section */}
              <div className="bg-white rounded-xl border shadow-sm">
                <SectionHeader title="✏️ עריכת אלמנט" section="edit" />
                {activeSection === 'edit' && (
                  <div className="p-2 space-y-1 border-t">
                    {!selectedElement ? (
                      <p className="text-xs text-gray-500 text-center py-4">
                        בחר אלמנט בקנבס לעריכה
                      </p>
                    ) : (
                      <>
                        {selectedElementData?.type === 'image' && (
                          <ToolButton 
                            onClick={removeBackground} 
                            icon={Droplets} 
                            label="🧹 הסר רקע לבן" 
                            tooltip="מסיר רקע לבן/בהיר מהתמונה"
                          />
                        )}
                        <div className="grid grid-cols-2 gap-1">
                          <ToolButton onClick={() => resizeElement(20)} icon={Plus} label="הגדל" />
                          <ToolButton onClick={() => resizeElement(-20)} icon={Minus} label="הקטן" />
                          <ToolButton onClick={() => rotateSelected(15)} icon={RotateCw} label="סובב" />
                          <ToolButton onClick={flipSelected} icon={FlipHorizontal} label="הפוך" />
                        </div>
                        <ToolButton onClick={duplicateSelected} icon={Copy} label="שכפל" />
                        
                        {/* Opacity Slider */}
                        <div className="px-3 py-3 bg-gray-50 rounded-lg mt-2">
                          <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                            <span className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              שקיפות
                            </span>
                            <span className="font-medium">{selectedElementData?.opacity ?? 100}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={selectedElementData?.opacity ?? 100}
                            onChange={(e) => changeOpacity(parseInt(e.target.value))}
                            onMouseUp={saveOpacityToHistory}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Layers Section */}
              <div className="bg-white rounded-xl border shadow-sm">
                <SectionHeader title="📚 שכבות" section="layers" />
                {activeSection === 'layers' && (
                  <div className="p-2 space-y-1 border-t">
                    <div className="grid grid-cols-2 gap-1">
                      <ToolButton onClick={() => moveLayer('up')} icon={ChevronUp} label="קדימה" disabled={!selectedElement} />
                      <ToolButton onClick={() => moveLayer('down')} icon={ChevronDown} label="אחורה" disabled={!selectedElement} />
                    </div>
                    <div className="border-t my-2" />
                    <ToolButton onClick={deleteSelected} icon={Trash2} label="🗑️ מחק אלמנט" disabled={!selectedElement || selectedElement === 'base-product'} danger />
                    <ToolButton onClick={undo} icon={Undo} label="↩️ בטל פעולה" disabled={historyIndex <= 0} />
                  </div>
                )}
              </div>

              {/* Colors Section */}
              <div className="bg-white rounded-xl border shadow-sm">
                <SectionHeader title="🎨 צבעים לצורות" section="colors" />
                {activeSection === 'colors' && (
                  <div className="p-3 space-y-3 border-t">
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={shapeColor}
                        onChange={(e) => setShapeColor(e.target.value)}
                        className="w-12 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                      />
                      <div>
                        <p className="text-sm font-medium">צבע קו</p>
                        <p className="text-xs text-gray-400 font-mono">{shapeColor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={shapeFill === 'transparent' ? '#ffffff' : shapeFill}
                        onChange={(e) => setShapeFill(e.target.value)}
                        className="w-12 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium">צבע מילוי</p>
                        <button
                          onClick={() => setShapeFill('transparent')}
                          className={`text-xs px-2 py-0.5 rounded mt-1 ${shapeFill === 'transparent' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}
                        >
                          ללא מילוי
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Element Info */}
            {selectedElementData && (
              <div className="p-3 border-t bg-purple-50">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                  <span className="font-medium text-purple-800">
                    נבחר: {selectedElementData.type === 'image' ? 'תמונה' : 
                     selectedElementData.type === 'text' ? 'טקסט' :
                     selectedElementData.type === 'arrow' ? 'חץ' :
                     selectedElementData.type === 'rectangle' ? 'מלבן' :
                     selectedElementData.type === 'circle' ? 'עיגול' :
                     selectedElementData.type === 'line' ? 'קו' : selectedElementData.type}
                    {selectedElementData.id === 'base-product' && ' (בסיס)'}
                  </span>
                </div>
              </div>
            )}
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
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: 'linear-gradient(#9ca3af 1px, transparent 1px), linear-gradient(90deg, #9ca3af 1px, transparent 1px)',
                  backgroundSize: `${20 * zoom}px ${20 * zoom}px`
                }}
              />
              
              {/* Render elements */}
              {[...elements].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map(element => (
                <div
                  key={element.id}
                  className={`absolute ${toolMode === 'crop' && element.type === 'image' ? 'cursor-crosshair' : 'cursor-move'} ${
                    selectedElement === element.id 
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
                  
                  {/* Selection handles */}
                  {selectedElement === element.id && element.type === 'image' && (
                    <>
                      <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow" />
                      <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow" />
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow" />
                      <div className="absolute -top-2 -right-2 w-4 h-4 bg-purple-500 rounded-full border-2 border-white shadow" />
                    </>
                  )}
                </div>
              ))}
              
              {/* Crop selection rectangle */}
              {(isCropping || showCropPreview) && (
                <div
                  className="absolute border-2 border-dashed border-yellow-500 bg-yellow-500/20 pointer-events-none"
                  style={{
                    left: Math.min(cropStart.x, cropEnd.x) * zoom,
                    top: Math.min(cropStart.y, cropEnd.y) * zoom,
                    width: Math.abs(cropEnd.x - cropStart.x) * zoom,
                    height: Math.abs(cropEnd.y - cropStart.y) * zoom
                  }}
                >
                  <div className="absolute -top-6 left-0 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded">
                    ✂️ אזור חיתוך
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Left Panel - Search Results */}
          {showSearch && (
            <div className="w-80 bg-white border-r flex flex-col shadow-lg">
              <div className="p-3 border-b bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    חיפוש מוצרים
                  </h3>
                  <button onClick={() => setShowSearch(false)} className="p-1 hover:bg-gray-200 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="הקלד שם מוצר..."
                    className="w-full pr-10 pl-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  💡 חפש מוצר ולחץ עליו להוספה ללוח
                </p>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {isSearching ? (
                  <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2" />
                    מחפש מוצרים...
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    {searchQuery ? (
                      <div>
                        <p className="text-lg mb-2">😕</p>
                        <p>לא נמצאו תוצאות עבור "{searchQuery}"</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg mb-2">🔍</p>
                        <p>הקלד שם מוצר לחיפוש</p>
                        <p className="text-xs mt-1 text-gray-400">לדוגמה: מזנון, כורסא, שולחן</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500 px-1">נמצאו {searchResults.length} תוצאות</p>
                    <div className="grid grid-cols-2 gap-2">
                      {searchResults.map(product => (
                        <button
                          key={product.id}
                          onClick={() => product.image && addImageFromProduct(product.image)}
                          className="p-2 border rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-right group"
                          disabled={!product.image}
                        >
                          {product.image ? (
                            <div className="relative overflow-hidden rounded">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-colors flex items-center justify-center">
                                <Plus className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-full aspect-square bg-gray-100 rounded flex items-center justify-center">
                              <ImageIcon className="w-6 h-6 text-gray-300" />
                            </div>
                          )}
                          <p className="text-xs line-clamp-2 mt-1">{product.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Crop Preview Modal */}
        {showCropPreview && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="bg-white rounded-xl p-5 shadow-xl max-w-sm w-full mx-4">
              <h3 className="font-semibold mb-2 text-center text-lg">✂️ חיתוך תמונה</h3>
              <p className="text-sm text-gray-500 text-center mb-4">לחתוך את האזור המסומן?</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={cancelCrop}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={applyCrop}
                  className="px-5 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2 font-medium transition-colors"
                >
                  <Scissors className="w-4 h-4" />
                  חתוך
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Text Input Modal */}
        {showTextInput && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <div className="bg-white rounded-xl p-5 w-96 shadow-xl mx-4">
              <h3 className="font-semibold mb-3">✏️ הוסף טקסט</h3>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="הקלד טקסט..."
                className="w-full px-4 py-3 border rounded-lg mb-3 focus:ring-2 focus:ring-purple-300 text-lg"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && addText()}
              />
              <div className="flex items-center gap-3 mb-4">
                <label className="text-sm text-gray-600">צבע טקסט:</label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-2"
                />
                <span className="text-xs text-gray-400 font-mono">{textColor}</span>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowTextInput(false)}
                  className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={addText}
                  disabled={!textInput.trim()}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
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
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border">
              <span className="text-sm text-gray-500">זום:</span>
              <button 
                onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm w-12 text-center font-medium">{Math.round(zoom * 100)}%</span>
              <button 
                onClick={() => setZoom(z => Math.min(2, z + 0.1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
            
            <div className="text-sm text-gray-500">
              {elements.length} אלמנטים
              {historyIndex > 0 && ` • ${historyIndex} פעולות`}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              סגור
            </button>
            <button
              onClick={exportAsImage}
              className="px-6 py-2.5 bg-gradient-to-l from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 flex items-center gap-2 font-medium shadow-lg shadow-purple-200 transition-all"
            >
              <Download className="w-4 h-4" />
              שמור והורד תמונה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
