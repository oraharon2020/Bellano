'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  X, Download, Search, ImageIcon, Loader2, RotateCw, Trash2, Copy, FlipHorizontal, 
  Type, ArrowRight, Square, Circle, Minus, Layers, Lock, Unlock, Eye, EyeOff,
  ChevronUp, ChevronDown, Scissors, Wand2, Clipboard
} from 'lucide-react';
import * as fabric from 'fabric';
import { fixMediaUrl } from '@/config/site';

interface ProductSearchResult {
  id: number;
  name: string;
  image: string;
  price: string;
}

interface LayerItem {
  id: string;
  name: string;
  type: string;
  locked: boolean;
  visible: boolean;
  object: fabric.FabricObject;
}

interface FabricDesignBoardProps {
  isOpen: boolean;
  onClose: () => void;
  productImage?: string;
  productName?: string;
  onSave?: (imageDataUrl: string) => void;
}

export function FabricDesignBoard({
  isOpen,
  onClose,
  productImage,
  productName,
  onSave
}: FabricDesignBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textColor, setTextColor] = useState('#000000');
  const [shapeColor, setShapeColor] = useState('#000000');
  const [hasSelection, setHasSelection] = useState(false);
  
  // New states for advanced features
  const [showLayers, setShowLayers] = useState(true);
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [showCropMode, setShowCropMode] = useState(false);
  const [showMeasurementInput, setShowMeasurementInput] = useState(false);
  const [measurementValue, setMeasurementValue] = useState('100');

  // Generate unique ID for layers
  const generateId = () => `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Get descriptive name for object
  const getObjectName = (obj: fabric.FabricObject, index: number): string => {
    if (obj.type === 'i-text' || obj.type === 'text') {
      const text = (obj as fabric.IText).text || '';
      return `טקסט: ${text.substring(0, 15)}${text.length > 15 ? '...' : ''}`;
    }
    if (obj.type === 'image') return `תמונה ${index + 1}`;
    if (obj.type === 'rect') return `מלבן ${index + 1}`;
    if (obj.type === 'circle') return `עיגול ${index + 1}`;
    if (obj.type === 'line') return `קו ${index + 1}`;
    if (obj.type === 'path') return `חץ/צורה ${index + 1}`;
    return `אלמנט ${index + 1}`;
  };

  // Update layers list from canvas
  const updateLayers = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    const newLayers: LayerItem[] = objects
      .filter((obj: any) => !obj.isCropRect) // Filter out crop rectangles
      .map((obj, index) => ({
        id: (obj as any).layerId || generateId(),
        name: (obj as any).layerName || getObjectName(obj, index),
        type: obj.type || 'object',
        locked: !obj.selectable,
        visible: obj.visible !== false,
        object: obj
      })).reverse();

    // Store IDs on objects for consistency
    newLayers.forEach(layer => {
      (layer.object as any).layerId = layer.id;
      (layer.object as any).layerName = layer.name;
    });

    setLayers(newLayers);
  }, []);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current || fabricRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 900,
      height: 600,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    // Enable controls on objects
    canvas.on('selection:created', (e) => {
      setHasSelection(true);
      const obj = e.selected?.[0];
      if (obj && (obj as any).layerId) {
        setSelectedLayerId((obj as any).layerId);
      }
    });
    canvas.on('selection:updated', (e) => {
      setHasSelection(true);
      const obj = e.selected?.[0];
      if (obj && (obj as any).layerId) {
        setSelectedLayerId((obj as any).layerId);
      }
    });
    canvas.on('selection:cleared', () => {
      setHasSelection(false);
      setSelectedLayerId(null);
    });

    // Update layers when objects change
    canvas.on('object:added', () => setTimeout(updateLayers, 50));
    canvas.on('object:removed', () => setTimeout(updateLayers, 50));

    fabricRef.current = canvas;

    // Load initial product image directly here
    if (productImage) {
      const loadInitialImage = async () => {
        try {
          const fixedSrc = fixMediaUrl(productImage);
          // Use proxy to avoid CORS issues
          const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(fixedSrc)}`;
          console.log('Loading initial product image via proxy:', proxyUrl);
          const img = await fabric.FabricImage.fromURL(proxyUrl, { crossOrigin: 'anonymous' });
          
          // Scale if too large
          const maxSize = 500;
          const scale = Math.min(maxSize / img.width!, maxSize / img.height!, 1);
          
          img.set({
            left: 50,
            top: 50,
            scaleX: scale,
            scaleY: scale,
            cornerStyle: 'circle',
            cornerColor: '#7c3aed',
            cornerStrokeColor: '#7c3aed',
            borderColor: '#7c3aed',
            transparentCorners: false,
          });

          canvas.add(img);
          canvas.renderAll();
          setTimeout(updateLayers, 100);
        } catch (error) {
          console.error('Error loading initial image:', error);
        }
      };
      loadInitialImage();
    }

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [isOpen, productImage, updateLayers]);

  // Paste from clipboard
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const blob = item.getAsFile();
          if (!blob) continue;

          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              await addImageToCanvas(dataUrl, false);
            }
          };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      // Delete key
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        deleteSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Search products
  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.products || []);
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
      if (searchQuery) searchProducts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchProducts]);

  // Add image to canvas
  const addImageToCanvas = async (src: string, isInitial = false) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    try {
      // Fix the media URL and use proxy to avoid CORS
      const fixedSrc = fixMediaUrl(src);
      // Only use proxy for admin.bellano.co.il images, not for data URLs (pasted images)
      const imageUrl = fixedSrc.startsWith('data:') 
        ? fixedSrc 
        : `/api/proxy-image?url=${encodeURIComponent(fixedSrc)}`;
      const img = await fabric.FabricImage.fromURL(imageUrl, { crossOrigin: 'anonymous' });
      
      // Scale if too large
      const maxSize = isInitial ? 500 : 300;
      const scale = Math.min(maxSize / img.width!, maxSize / img.height!, 1);
      
      img.set({
        left: isInitial ? 50 : 200 + Math.random() * 100,
        top: isInitial ? 50 : 100 + Math.random() * 100,
        scaleX: scale,
        scaleY: scale,
        cornerStyle: 'circle',
        cornerColor: '#7c3aed',
        cornerStrokeColor: '#7c3aed',
        borderColor: '#7c3aed',
        transparentCorners: false,
      });

      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      updateLayers();
    } catch (error) {
      console.error('Error adding image:', error);
    }
  };

  // Remove background from selected image
  const removeBackground = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') {
      alert('בחר תמונה להסרת רקע');
      return;
    }

    setIsRemovingBackground(true);

    try {
      // Dynamic import for background removal
      const { removeBackground: removeBg } = await import('@imgly/background-removal');
      
      const fabricImage = activeObject as fabric.FabricImage;
      const element = fabricImage.getElement() as HTMLImageElement;
      
      // Get image source
      let imageSrc = element.src;
      
      // If it's a data URL, convert to blob
      let imageBlob: Blob;
      if (imageSrc.startsWith('data:')) {
        const response = await fetch(imageSrc);
        imageBlob = await response.blob();
      } else {
        // Fetch the image and convert to blob
        const response = await fetch(imageSrc);
        imageBlob = await response.blob();
      }

      // Remove background
      const resultBlob = await removeBg(imageBlob, {
        progress: (key, current, total) => {
          console.log(`Processing: ${key} - ${Math.round((current / total) * 100)}%`);
        }
      });

      // Convert result to data URL
      const reader = new FileReader();
      reader.onload = async (e) => {
        const newDataUrl = e.target?.result as string;
        
        // Create new image with removed background
        const newImg = await fabric.FabricImage.fromURL(newDataUrl);
        
        // Copy properties from original
        newImg.set({
          left: fabricImage.left,
          top: fabricImage.top,
          scaleX: fabricImage.scaleX,
          scaleY: fabricImage.scaleY,
          angle: fabricImage.angle,
          flipX: fabricImage.flipX,
          flipY: fabricImage.flipY,
          cornerStyle: 'circle',
          cornerColor: '#7c3aed',
          cornerStrokeColor: '#7c3aed',
          borderColor: '#7c3aed',
          transparentCorners: false,
        });

        // Replace old image with new one
        canvas.remove(fabricImage);
        canvas.add(newImg);
        canvas.setActiveObject(newImg);
        canvas.renderAll();
        updateLayers();
        setIsRemovingBackground(false);
      };
      reader.readAsDataURL(resultBlob);

    } catch (error) {
      console.error('Background removal error:', error);
      alert('שגיאה בהסרת הרקע. נסה שוב.');
      setIsRemovingBackground(false);
    }
  };

  // Add text
  const addText = () => {
    const canvas = fabricRef.current;
    if (!canvas || !textInput.trim()) return;

    const text = new fabric.IText(textInput, {
      left: 200,
      top: 200,
      fontSize: 32,
      fill: textColor,
      fontFamily: 'Arial',
      cornerStyle: 'circle',
      cornerColor: '#7c3aed',
      borderColor: '#7c3aed',
      transparentCorners: false,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setTextInput('');
    setShowTextInput(false);
    updateLayers();
  };

  // Add shape
  const addShape = (type: 'rectangle' | 'circle' | 'line' | 'arrow') => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    let shape: fabric.FabricObject;

    switch (type) {
      case 'rectangle':
        shape = new fabric.Rect({
          left: 200,
          top: 200,
          width: 100,
          height: 60,
          fill: 'transparent',
          stroke: shapeColor,
          strokeWidth: 2,
        });
        break;
      case 'circle':
        shape = new fabric.Circle({
          left: 200,
          top: 200,
          radius: 40,
          fill: 'transparent',
          stroke: shapeColor,
          strokeWidth: 2,
        });
        break;
      case 'line':
        shape = new fabric.Line([0, 0, 150, 0], {
          left: 200,
          top: 200,
          stroke: shapeColor,
          strokeWidth: 2,
        });
        break;
      case 'arrow':
        shape = new fabric.Path('M 0 10 L 80 10 L 80 0 L 100 15 L 80 30 L 80 20 L 0 20 Z', {
          left: 200,
          top: 200,
          fill: shapeColor,
          scaleX: 1.5,
          scaleY: 1,
          lockScalingY: true, // Prevent vertical scaling
        });
        break;
      default:
        return;
    }

    shape.set({
      cornerStyle: 'circle',
      cornerColor: '#7c3aed',
      borderColor: '#7c3aed',
      transparentCorners: false,
    });

    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
    updateLayers();
  };

  // Add measurement ruler - creates a line with arrows and separate text
  const addMeasurementRuler = (dimension: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const lineWidth = 200;
    const startX = 200;
    const startY = 200;

    // Create main line with arrow markers using a simple approach
    // Left arrow head (triangle pointing left)
    const leftArrow = new fabric.Polygon(
      [
        { x: 0, y: 0 },
        { x: 12, y: -6 },
        { x: 12, y: 6 },
      ],
      {
        left: startX,
        top: startY,
        fill: shapeColor,
        originX: 'left',
        originY: 'center',
        selectable: false,
        evented: false,
      }
    );

    // Main line
    const line = new fabric.Line([12, 0, lineWidth - 12, 0], {
      left: startX + 12,
      top: startY,
      stroke: shapeColor,
      strokeWidth: 2,
      originY: 'center',
      selectable: false,
      evented: false,
    });

    // Right arrow head (triangle pointing right)
    const rightArrow = new fabric.Polygon(
      [
        { x: 0, y: 0 },
        { x: -12, y: -6 },
        { x: -12, y: 6 },
      ],
      {
        left: startX + lineWidth,
        top: startY,
        fill: shapeColor,
        originX: 'right',
        originY: 'center',
        selectable: false,
        evented: false,
      }
    );

    // Group only the arrow elements (not stretchable)
    const arrowGroup = new fabric.Group([leftArrow, line, rightArrow], {
      left: startX,
      top: startY,
      cornerStyle: 'circle',
      cornerColor: '#7c3aed',
      borderColor: '#7c3aed',
      transparentCorners: false,
      lockScalingX: true,
      lockScalingY: true,
    });

    // Create dimension text as separate editable element
    const dimensionText = new fabric.IText(`${dimension} ס"מ`, {
      left: startX + lineWidth / 2,
      top: startY - 25,
      fontSize: 18,
      fill: shapeColor,
      fontFamily: 'Arial',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      cornerStyle: 'circle',
      cornerColor: '#7c3aed',
      borderColor: '#7c3aed',
      transparentCorners: false,
    });

    canvas.add(arrowGroup);
    canvas.add(dimensionText);
    canvas.setActiveObject(dimensionText);
    canvas.renderAll();
    updateLayers();
    
    setShowMeasurementInput(false);
    setMeasurementValue('100');
  };

  // Add quick text template
  const addTextTemplate = (template: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const text = new fabric.IText(template, {
      left: 200,
      top: 200,
      fontSize: 24,
      fill: textColor,
      fontFamily: 'Arial',
      cornerStyle: 'circle',
      cornerColor: '#7c3aed',
      borderColor: '#7c3aed',
      transparentCorners: false,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    updateLayers();
  };

  // Delete selected
  const deleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach(obj => {
      if (obj.selectable !== false) {
        canvas.remove(obj);
      }
    });
    canvas.discardActiveObject();
    canvas.renderAll();
    updateLayers();
  };

  // Duplicate selected
  const duplicateSelected = async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    const cloned = await activeObject.clone();
    cloned.set({
      left: (activeObject.left || 0) + 20,
      top: (activeObject.top || 0) + 20,
    });
    canvas.add(cloned);
    canvas.setActiveObject(cloned);
    canvas.renderAll();
    updateLayers();
  };

  // Rotate selected
  const rotateSelected = (degrees: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.rotate((activeObject.angle || 0) + degrees);
    canvas.renderAll();
  };

  // Flip selected
  const flipSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.set('flipX', !activeObject.flipX);
    canvas.renderAll();
  };

  // Layer management functions
  const toggleLayerLock = (layerId: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    const newLocked = !layer.locked;
    layer.object.set({
      selectable: !newLocked,
      evented: !newLocked,
    });
    
    if (newLocked) {
      canvas.discardActiveObject();
    }
    
    canvas.renderAll();
    updateLayers();
  };

  const toggleLayerVisibility = (layerId: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    layer.object.set('visible', !layer.visible);
    canvas.renderAll();
    updateLayers();
  };

  const selectLayer = (layerId: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.locked) return;

    canvas.setActiveObject(layer.object);
    canvas.renderAll();
    setSelectedLayerId(layerId);
  };

  const moveLayerUp = (layerId: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    canvas.bringObjectForward(layer.object);
    canvas.renderAll();
    updateLayers();
  };

  const moveLayerDown = (layerId: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const layer = layers.find(l => l.id === layerId);
    if (!layer) return;

    canvas.sendObjectBackwards(layer.object);
    canvas.renderAll();
    updateLayers();
  };

  // Crop selected image
  const cropSelectedImage = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (!activeObject || activeObject.type !== 'image') {
      alert('בחר תמונה לחיתוך');
      return;
    }

    // Enable cropping mode
    setShowCropMode(true);
    
    // Create crop rectangle overlay
    const fabricImage = activeObject as fabric.FabricImage;
    const imgWidth = fabricImage.width! * fabricImage.scaleX!;
    const imgHeight = fabricImage.height! * fabricImage.scaleY!;
    
    const cropRect = new fabric.Rect({
      left: fabricImage.left,
      top: fabricImage.top,
      width: imgWidth * 0.8,
      height: imgHeight * 0.8,
      fill: 'rgba(123, 58, 237, 0.2)',
      stroke: '#7c3aed',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      cornerStyle: 'circle',
      cornerColor: '#7c3aed',
      borderColor: '#7c3aed',
      transparentCorners: false,
    });

    // Add custom properties
    (cropRect as any).isCropRect = true;
    (cropRect as any).targetImage = fabricImage;

    canvas.add(cropRect);
    canvas.setActiveObject(cropRect);
    canvas.renderAll();
  };

  const applyCrop = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const cropRect = canvas.getObjects().find((obj: any) => obj.isCropRect) as fabric.Rect & { targetImage: fabric.FabricImage };
    if (!cropRect || !cropRect.targetImage) {
      setShowCropMode(false);
      return;
    }

    const targetImage = cropRect.targetImage;
    
    // Calculate crop area relative to image
    const imgLeft = targetImage.left!;
    const imgTop = targetImage.top!;
    const scaleX = targetImage.scaleX!;
    const scaleY = targetImage.scaleY!;
    
    const cropLeft = (cropRect.left! - imgLeft) / scaleX;
    const cropTop = (cropRect.top! - imgTop) / scaleY;
    const cropWidth = (cropRect.width! * cropRect.scaleX!) / scaleX;
    const cropHeight = (cropRect.height! * cropRect.scaleY!) / scaleY;

    // Apply crop using clipPath
    targetImage.set({
      cropX: Math.max(0, cropLeft),
      cropY: Math.max(0, cropTop),
      width: Math.min(cropWidth, targetImage.width! - cropLeft),
      height: Math.min(cropHeight, targetImage.height! - cropTop),
    });

    // Remove crop rectangle
    canvas.remove(cropRect);
    canvas.setActiveObject(targetImage);
    canvas.renderAll();
    setShowCropMode(false);
    updateLayers();
  };

  const cancelCrop = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const cropRect = canvas.getObjects().find((obj: any) => obj.isCropRect);
    if (cropRect) {
      canvas.remove(cropRect);
      canvas.renderAll();
    }
    setShowCropMode(false);
  };

  // Export canvas
  const handleExport = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Hide crop rect if visible
    const cropRect = canvas.getObjects().find((obj: any) => obj.isCropRect);
    if (cropRect) cropRect.set('visible', false);

    canvas.discardActiveObject();
    canvas.renderAll();

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    // Restore crop rect
    if (cropRect) {
      cropRect.set('visible', true);
      canvas.renderAll();
    }

    // Download only - don't save to cart/admin fields
    const link = document.createElement('a');
    link.download = `design-${productName || 'bellano'}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  };

  // Share to WhatsApp
  const shareToWhatsApp = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Hide crop rect if visible
    const cropRect = canvas.getObjects().find((obj: any) => obj.isCropRect);
    if (cropRect) cropRect.set('visible', false);

    canvas.discardActiveObject();
    canvas.renderAll();

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 2,
    });

    // Restore crop rect
    if (cropRect) {
      cropRect.set('visible', true);
      canvas.renderAll();
    }

    // Create message text
    const productText = productName ? `עיצוב ללקוח - ${productName}` : 'עיצוב ללקוח';
    
    // For mobile/web: Open WhatsApp with text (user will manually attach the image)
    const message = encodeURIComponent(`${productText}\n\nצילום מסך של העיצוב מצורף 👆`);
    const whatsappUrl = `https://wa.me/?text=${message}`;
    
    // Download image first for user to attach manually
    const link = document.createElement('a');
    link.download = `design-${productName || 'bellano'}-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
    
    // Open WhatsApp after a small delay
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 500);
  };

  // Add product from search
  const addProductImage = (imageSrc: string) => {
    addImageToCanvas(imageSrc, false);
    setShowSearch(false);
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-xl w-full h-full max-w-[98vw] max-h-[98vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b bg-gradient-to-l from-purple-50 to-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-800">🎨 לוח עיצוב - {productName}</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Ctrl+V להדבקת תמונה</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm"
            >
              <Search className="w-4 h-4" />
              הוסף מוצר
            </button>
            <button
              onClick={() => setShowLayers(!showLayers)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors text-sm ${showLayers ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
            >
              <Layers className="w-4 h-4" />
              שכבות
            </button>
            <button
              onClick={shareToWhatsApp}
              className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              שתף בוואטסאפ
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              ייצוא
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar */}
          <div className="w-52 bg-gray-50 border-l p-3 flex flex-col gap-3 overflow-y-auto flex-shrink-0">
            {/* Paste hint */}
            <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-700 flex items-center gap-2">
              <Clipboard className="w-4 h-4" />
              <span>הדבק צילום מסך עם Ctrl+V</span>
            </div>

            {/* Background Removal */}
            <div className="bg-white rounded-xl border p-3 space-y-2">
              <h3 className="font-bold text-sm text-gray-700 mb-2">🪄 כלים מתקדמים</h3>
              <button
                onClick={removeBackground}
                disabled={!hasSelection || isRemovingBackground}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isRemovingBackground ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    מסיר רקע...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    הסר רקע מתמונה
                  </>
                )}
              </button>
              {showCropMode ? (
                <div className="flex gap-2">
                  <button
                    onClick={applyCrop}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    אשר חיתוך
                  </button>
                  <button
                    onClick={cancelCrop}
                    className="flex-1 px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                  >
                    בטל
                  </button>
                </div>
              ) : (
                <button
                  onClick={cropSelectedImage}
                  disabled={!hasSelection}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm disabled:opacity-50"
                >
                  <Scissors className="w-4 h-4" />
                  חיתוך תמונה
                </button>
              )}
            </div>

            {/* Add Elements */}
            <div className="bg-white rounded-xl border p-3 space-y-2">
              <h3 className="font-bold text-sm text-gray-700 mb-2">➕ הוספת אלמנטים</h3>
              <button
                onClick={() => setShowTextInput(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
              >
                <Type className="w-4 h-4" />
                טקסט חופשי
              </button>
              
              {/* Quick Text Templates */}
              <div className="bg-purple-50 rounded-lg p-2 space-y-1">
                <p className="text-xs text-purple-700 font-medium mb-1">תבניות טקסט מהיר:</p>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => addTextTemplate('מידות:')}
                    className="px-2 py-1 bg-white hover:bg-purple-100 rounded text-xs"
                  >
                    מידות:
                  </button>
                  <button
                    onClick={() => addTextTemplate('צבע:')}
                    className="px-2 py-1 bg-white hover:bg-purple-100 rounded text-xs"
                  >
                    צבע:
                  </button>
                  <button
                    onClick={() => addTextTemplate('הערות:')}
                    className="px-2 py-1 bg-white hover:bg-purple-100 rounded text-xs"
                  >
                    הערות:
                  </button>
                  <button
                    onClick={() => addTextTemplate('שם לקוח:')}
                    className="px-2 py-1 bg-white hover:bg-purple-100 rounded text-xs"
                  >
                    שם לקוח:
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowMeasurementInput(true)}
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700"
              >
                <Minus className="w-4 h-4" />
                סרגל מידות
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addShape('arrow')}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  חץ
                </button>
                <button
                  onClick={() => addShape('line')}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
                >
                  <Minus className="w-4 h-4" />
                  קו
                </button>
                <button
                  onClick={() => addShape('rectangle')}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
                >
                  <Square className="w-4 h-4" />
                  מלבן
                </button>
                <button
                  onClick={() => addShape('circle')}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm"
                >
                  <Circle className="w-4 h-4" />
                  עיגול
                </button>
              </div>
            </div>

            {/* Edit */}
            <div className="bg-white rounded-xl border p-3 space-y-2">
              <h3 className="font-bold text-sm text-gray-700 mb-2">✏️ עריכה</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => rotateSelected(15)}
                  disabled={!hasSelection}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm disabled:opacity-50"
                >
                  <RotateCw className="w-4 h-4" />
                  סובב
                </button>
                <button
                  onClick={flipSelected}
                  disabled={!hasSelection}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm disabled:opacity-50"
                >
                  <FlipHorizontal className="w-4 h-4" />
                  הפוך
                </button>
                <button
                  onClick={duplicateSelected}
                  disabled={!hasSelection}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm disabled:opacity-50"
                >
                  <Copy className="w-4 h-4" />
                  שכפל
                </button>
                <button
                  onClick={deleteSelected}
                  disabled={!hasSelection}
                  className="flex items-center justify-center gap-1 px-2 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  מחק
                </button>
              </div>
            </div>

            {/* Colors */}
            <div className="bg-white rounded-xl border p-3 space-y-3">
              <h3 className="font-bold text-sm text-gray-700 mb-2">🎨 צבעים</h3>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={shapeColor}
                  onChange={(e) => setShapeColor(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border-2"
                />
                <span className="text-xs text-gray-600">צבע צורות</span>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 bg-gray-200 p-4 overflow-auto flex items-center justify-center">
            <div className="shadow-xl rounded-lg overflow-hidden">
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* Layers Panel */}
          {showLayers && (
            <div className="w-64 border-r bg-gray-50 flex flex-col flex-shrink-0">
              <div className="p-3 border-b bg-white flex items-center justify-between">
                <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  שכבות ({layers.length})
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2">
                {layers.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">אין שכבות</p>
                ) : (
                  <div className="space-y-1">
                    {layers.map((layer, index) => (
                      <div
                        key={layer.id}
                        onClick={() => selectLayer(layer.id)}
                        className={`group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedLayerId === layer.id 
                            ? 'bg-purple-100 border border-purple-300' 
                            : 'bg-white border border-gray-200 hover:bg-gray-50'
                        } ${layer.locked ? 'opacity-60' : ''}`}
                      >
                        {/* Layer icon */}
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs">
                          {layer.type === 'image' && <ImageIcon className="w-4 h-4 text-gray-500" />}
                          {(layer.type === 'i-text' || layer.type === 'text') && <Type className="w-4 h-4 text-gray-500" />}
                          {layer.type === 'rect' && <Square className="w-4 h-4 text-gray-500" />}
                          {layer.type === 'circle' && <Circle className="w-4 h-4 text-gray-500" />}
                          {(layer.type === 'line' || layer.type === 'path') && <Minus className="w-4 h-4 text-gray-500" />}
                        </div>
                        
                        {/* Layer name */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{layer.name}</p>
                        </div>

                        {/* Layer controls */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); moveLayerUp(layer.id); }}
                            disabled={index === 0}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            title="הזז למעלה"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); moveLayerDown(layer.id); }}
                            disabled={index === layers.length - 1}
                            className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"
                            title="הזז למטה"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
                            className="p-1 hover:bg-gray-200 rounded"
                            title={layer.visible ? 'הסתר' : 'הצג'}
                          >
                            {layer.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-gray-400" />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer.id); }}
                            className="p-1 hover:bg-gray-200 rounded"
                            title={layer.locked ? 'בטל נעילה' : 'נעל'}
                          >
                            {layer.locked ? <Lock className="w-3 h-3 text-orange-500" /> : <Unlock className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Layer tips */}
              <div className="p-3 border-t bg-purple-50">
                <p className="text-xs text-purple-700">
                  💡 נעל שכבות כדי למנוע זזה בטעות
                </p>
              </div>
            </div>
          )}

          {/* Search Panel */}
          {showSearch && (
            <div className="w-72 border-r bg-gray-50 flex flex-col flex-shrink-0">
              <div className="p-3 border-b bg-white">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפש מוצר..."
                    className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addProductImage(product.image)}
                        className="group relative aspect-square rounded-lg overflow-hidden bg-white border hover:border-purple-500 transition-colors"
                      >
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <ImageIcon className="w-6 h-6 text-gray-300" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs p-1.5 line-clamp-2">
                          {product.name}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <p className="text-center text-gray-500 py-8 text-sm">לא נמצאו תוצאות</p>
                ) : (
                  <p className="text-center text-gray-500 py-8 text-sm">הקלד שם מוצר לחיפוש</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Text Input Modal */}
        {showTextInput && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
              <h3 className="font-bold text-lg mb-4">הוסף טקסט</h3>
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="הקלד טקסט..."
                className="w-full px-4 py-2 border rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && addText()}
              />
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm">צבע:</span>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border"
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
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  הוסף
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Measurement Ruler Input Modal */}
        {showMeasurementInput && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
              <h3 className="font-bold text-lg mb-4">📏 הוסף סרגל מידות</h3>
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="number"
                  value={measurementValue}
                  onChange={(e) => setMeasurementValue(e.target.value)}
                  placeholder="הקלד מידה..."
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && addMeasurementRuler(measurementValue)}
                />
                <span className="text-gray-600 font-medium">ס"מ</span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                💡 הטקסט ניתן לעריכה גם אחרי ההוספה
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowMeasurementInput(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  ביטול
                </button>
                <button
                  onClick={() => addMeasurementRuler(measurementValue)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  הוסף סרגל
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Background removal loading overlay */}
        {isRemovingBackground && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-8 shadow-xl text-center">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
              <h3 className="font-bold text-lg mb-2">מסיר רקע...</h3>
              <p className="text-gray-500 text-sm">התהליך עשוי לקחת כמה שניות</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
