'use client';

import { useState, useCallback } from 'react';
import { DesignElement } from './types';

export function useHistory(initialElements: DesignElement[] = []) {
  const [history, setHistory] = useState<DesignElement[][]>([initialElements]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const saveToHistory = useCallback((newElements: DesignElement[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newElements]);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      return history[historyIndex - 1];
    }
    return null;
  }, [history, historyIndex]);

  const canUndo = historyIndex > 0;

  return { saveToHistory, undo, canUndo, historyIndex };
}

export function useProductSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const searchProducts = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const url = `/api/products/search?q=${encodeURIComponent(query)}&per_page=20`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.products && Array.isArray(data.products)) {
        setSearchResults(data.products.map((p: any) => ({
          id: p.id,
          name: p.name,
          image: p.image || '',
          slug: p.slug
        })));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchProducts
  };
}
