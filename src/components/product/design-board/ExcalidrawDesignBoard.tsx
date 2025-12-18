'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { X, Download, Search, ImageIcon, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic import for Excalidraw (it requires window)
const Excalidraw = dynamic(
  async () => {
    const mod = await import('@excalidraw/excalidraw');
    return mod.Excalidraw;
  },
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div> }
);

// Dynamic import for exportToBlob
const getExportFunctions = async () => {
  const mod = await import('@excalidraw/excalidraw');
  return {
    exportToBlob: mod.exportToBlob,
    exportToSvg: mod.exportToSvg,
  };
};

interface ProductSearchResult {
  id: number;
  name: string;
  image: string;
  price: string;
}

interface ExcalidrawDesignBoardProps {
  isOpen: boolean;
  onClose: () => void;
  productImage?: string;
  productName?: string;
  onSave?: (imageDataUrl: string) => void;
}

export function ExcalidrawDesignBoard({
  isOpen,
  onClose,
  productImage,
  productName,
  onSave
}: ExcalidrawDesignBoardProps) {
  const excalidrawRef = useRef<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

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
  const addImageToCanvas = async (src: string) => {
    if (!excalidrawRef.current) return;

    try {
      // Get current API
      const api = excalidrawRef.current;
      
      // Load image to get dimensions and create data URL
      const response = await fetch(src);
      const blob = await response.blob();
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // Get dimensions
      const img = new Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = dataUrl;
      });

      // Scale if too large
      let width = img.width;
      let height = img.height;
      const maxSize = 400;
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width *= scale;
        height *= scale;
      }

      // Create file ID
      const fileId = `file-${Date.now()}` as any;

      // Add file to Excalidraw
      const files = {
        [fileId]: {
          id: fileId,
          dataURL: dataUrl,
          mimeType: blob.type || 'image/jpeg',
          created: Date.now(),
        }
      };

      // Create image element
      const imageElement = {
        id: `img-${Date.now()}`,
        type: 'image' as const,
        x: 100 + Math.random() * 100,
        y: 100 + Math.random() * 100,
        width,
        height,
        fileId,
        status: 'saved' as const,
        scale: [1, 1] as [number, number],
      };

      // Get current elements and add new one
      const currentElements = api.getSceneElements() || [];
      const currentFiles = api.getFiles() || {};

      api.updateScene({
        elements: [...currentElements, imageElement],
      });
      
      api.addFiles(Object.values({ ...currentFiles, ...files }));

    } catch (error) {
      console.error('Error adding image:', error);
    }
  };

  // Load initial product image
  useEffect(() => {
    if (excalidrawRef.current && productImage && isOpen && !initialDataLoaded) {
      // Small delay to ensure Excalidraw is ready
      setTimeout(() => {
        addImageToCanvas(productImage);
        setInitialDataLoaded(true);
      }, 500);
    }
  }, [excalidrawRef.current, productImage, isOpen, initialDataLoaded]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setInitialDataLoaded(false);
    }
  }, [isOpen]);

  // Export canvas
  const handleExport = async () => {
    if (!excalidrawRef.current) return;

    try {
      const api = excalidrawRef.current;
      const elements = api.getSceneElements();
      const files = api.getFiles();

      if (!elements || elements.length === 0) {
        alert('אין אלמנטים לייצוא');
        return;
      }

      const { exportToBlob } = await getExportFunctions();
      
      const blob = await exportToBlob({
        elements,
        files,
        getDimensions: () => ({ width: 1200, height: 800, scale: 2 }),
        exportBackground: true,
        appState: {
          exportBackground: true,
          viewBackgroundColor: '#ffffff',
        },
      });

      // Convert to data URL
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        
        // Download
        const link = document.createElement('a');
        link.download = `design-${productName || 'bellano'}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        // Callback
        onSave?.(dataUrl);
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  // Add product from search
  const addProductImage = (imageSrc: string) => {
    addImageToCanvas(imageSrc);
    setShowSearch(false);
    setSearchQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-l from-purple-50 to-white">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">🎨 לוח עיצוב - {productName}</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Excalidraw - עורך מקצועי
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Search className="w-4 h-4" />
              הוסף מוצר
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              ייצוא
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Excalidraw Canvas */}
          <div className="flex-1 relative" dir="ltr">
            <Excalidraw
              excalidrawAPI={(api: any) => { excalidrawRef.current = api; }}
              theme="light"
              langCode="en"
              UIOptions={{
                canvasActions: {
                  saveToActiveFile: false,
                  loadScene: false,
                  export: false,
                  saveAsImage: false,
                },
              }}
            />
          </div>

          {/* Search Panel */}
          {showSearch && (
            <div className="w-80 border-r bg-gray-50 flex flex-col" dir="rtl">
              <div className="p-4 border-b bg-white">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="חפש מוצר..."
                    className="w-full pr-10 pl-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {isSearching ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
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
                            <ImageIcon className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 text-white text-xs p-2 line-clamp-2">
                          {product.name}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <p className="text-center text-gray-500 py-8">לא נמצאו תוצאות</p>
                ) : (
                  <p className="text-center text-gray-500 py-8">הקלד שם מוצר לחיפוש</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
          💡 טיפ: השתמש בכלים בסרגל הכלים לציור, טקסט, צורות וחיצים. גרור תמונות לשינוי גודל וסיבוב.
        </div>
      </div>
    </div>
  );
}
