'use client';

import { Search, X, Plus, ImageIcon } from 'lucide-react';
import { ProductSearchResult } from './types';

interface ProductSearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchResults: ProductSearchResult[];
  isSearching: boolean;
  onSelectProduct: (imageUrl: string) => void;
}

export function ProductSearchPanel({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  searchResults,
  isSearching,
  onSelectProduct
}: ProductSearchPanelProps) {
  if (!isOpen) return null;
  
  return (
    <div className="w-80 bg-white border-r flex flex-col shadow-lg">
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Search className="w-4 h-4" />
            חיפוש מוצרים
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
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
                  onClick={() => product.image && onSelectProduct(product.image)}
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
  );
}
