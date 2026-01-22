'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Search, X, Loader2 } from 'lucide-react';
import { searchProductsAction, SearchResult } from '@/app/actions/search';
import { analytics } from '@/lib/analytics';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Debounced search
  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const searchResults = await searchProductsAction(searchQuery);
      setResults(searchResults);
      
      // Track search - Vercel Analytics
      analytics.search(searchQuery, searchResults.length);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Search Panel */}
      <div className="fixed top-0 left-0 right-0 bg-white z-50 shadow-xl animate-in slide-in-from-top duration-200">
        {/* Search Input */}
        <div className="border-b">
          <div className="container mx-auto px-4">
            <div className="flex items-center h-16 gap-3">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                placeholder="חיפוש מוצרים..."
                className="flex-1 h-full text-lg outline-none bg-transparent"
                autoComplete="off"
                aria-label="חיפוש מוצרים"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    setHasSearched(false);
                    inputRef.current?.focus();
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                  aria-label="נקה חיפוש"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="סגור חיפוש"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="container mx-auto px-4 max-h-[70vh] overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>לא נמצאו תוצאות עבור "{query}"</p>
              <p className="text-sm mt-2">נסו לחפש מונח אחר</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="py-4">
              <p className="text-xs text-gray-500 mb-3">{results.length} תוצאות</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {results.map((product) => (
                  <Link
                    key={product.id}
                    href={`/product/${product.slug}`}
                    onClick={onClose}
                    className="group"
                  >
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-2 relative">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Search className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-medium line-clamp-2 group-hover:text-gray-600">
                      {product.name}
                    </h4>
                    {product.category && (
                      <p className="text-xs text-gray-400 mt-0.5">{product.category}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-1">{product.price}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!isLoading && !hasSearched && (
            <div className="py-8 text-center text-gray-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>הקלידו לפחות 2 תווים לחיפוש</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
