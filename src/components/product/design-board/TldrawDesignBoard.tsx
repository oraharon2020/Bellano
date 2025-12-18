'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  Tldraw, 
  Editor,
  createShapeId,
  AssetRecordType
} from 'tldraw';
import 'tldraw/tldraw.css';
import { X, Download, Search, ImageIcon, Loader2 } from 'lucide-react';

interface ProductSearchResult {
  id: number;
  name: string;
  image: string;
  price: string;
}

interface TldrawDesignBoardProps {
  isOpen: boolean;
  onClose: () => void;
  productImage?: string;
  productName?: string;
  onSave?: (imageDataUrl: string) => void;
}

export function TldrawDesignBoard({
  isOpen,
  onClose,
  productImage,
  productName,
  onSave
}: TldrawDesignBoardProps) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  // Load initial product image
  useEffect(() => {
    if (editor && productImage && isOpen) {
      addImageToCanvas(productImage, true);
    }
  }, [editor, productImage, isOpen]);

  // Add image to canvas
  const addImageToCanvas = async (src: string, isInitial = false) => {
    if (!editor) return;

    try {
      // Create asset
      const assetId = AssetRecordType.createId();
      
      // Load image to get dimensions
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = src;
      });

      const w = img.naturalWidth;
      const h = img.naturalHeight;
      
      // Scale down if too large
      const maxSize = 400;
      let width = w;
      let height = h;
      if (w > maxSize || h > maxSize) {
        const scale = maxSize / Math.max(w, h);
        width = w * scale;
        height = h * scale;
      }

      // Create asset record
      editor.createAssets([{
        id: assetId,
        type: 'image',
        typeName: 'asset',
        props: {
          name: productName || 'image',
          src: src,
          w,
          h,
          mimeType: 'image/jpeg',
          isAnimated: false,
        },
        meta: {},
      }]);

      // Create image shape
      const shapeId = createShapeId();
      editor.createShape({
        id: shapeId,
        type: 'image',
        x: isInitial ? 100 : 200 + Math.random() * 100,
        y: isInitial ? 100 : 200 + Math.random() * 100,
        props: {
          assetId,
          w: width,
          h: height,
        },
      });

      // Select the new shape
      editor.select(shapeId);
      
      // If initial, zoom to fit
      if (isInitial) {
        setTimeout(() => {
          editor.zoomToFit();
        }, 100);
      }
    } catch (error) {
      console.error('Error adding image:', error);
    }
  };

  // Export canvas using editor's built-in export
  const handleExport = async () => {
    if (!editor) return;

    try {
      const shapeIds = editor.getCurrentPageShapeIds();
      if (shapeIds.size === 0) {
        alert('אין אלמנטים לייצוא');
        return;
      }

      // Use editor's getSvgString method and convert to PNG
      const svg = await editor.getSvgString([...shapeIds], {
        background: true,
        padding: 20,
      });

      if (!svg) {
        alert('שגיאה בייצוא');
        return;
      }

      // Convert SVG to PNG using canvas
      const img = new Image();
      const svgBlob = new Blob([svg.svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = svg.width;
        canvas.height = svg.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          
          const dataUrl = canvas.toDataURL('image/png');
          
          // Download
          const link = document.createElement('a');
          link.download = `design-${productName || 'bellano'}-${Date.now()}.png`;
          link.href = dataUrl;
          link.click();

          // Callback
          onSave?.(dataUrl);
        }
        
        URL.revokeObjectURL(url);
      };
      
      img.src = url;
    } catch (error) {
      console.error('Export error:', error);
    }
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
      <div className="bg-white rounded-xl w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-l from-purple-50 to-white">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">🎨 לוח עיצוב - {productName}</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              tldraw - עורך מקצועי
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
          {/* Tldraw Canvas */}
          <div className="flex-1 relative" dir="ltr">
            <Tldraw
              onMount={(editor) => {
                setEditor(editor);
              }}
              inferDarkMode={false}
            />
          </div>

          {/* Search Panel */}
          {showSearch && (
            <div className="w-80 border-r bg-gray-50 flex flex-col">
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
