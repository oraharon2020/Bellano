'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, Maximize2, Minimize2, Phone } from 'lucide-react';

interface ProductInfo {
  name: string;
  description: string;
  price: string;
  categories: string[];
  attributes: Array<{ name: string; options: string[] }>;
  dimensions?: {
    width?: string;
    depth?: string;
    height?: string;
  };
  assemblyIncluded?: boolean;
  availabilityType?: 'in_stock' | 'custom_order';
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ProductAIChatProps {
  product: ProductInfo;
}

export default function ProductAIChat({ product }: ProductAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll only within the messages container, not the whole page
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 100);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `שלום! 👋 איך אוכל לעזור לך עם ${product.name}?`
      }]);
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: textToSend }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/product-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          product,
          history: messages,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'סליחה, משהו השתבש. פנו אלינו בוואטסאפ 054-3323178' 
        }]);
      }
    } catch {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'בעיה בחיבור. פנו אלינו בוואטסאפ 054-3323178' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Resize handle - supports both mouse and touch
  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const startY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const startHeight = container.offsetHeight;
    
    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : (moveEvent as MouseEvent).clientY;
      const deltaY = currentY - startY;
      const newHeight = Math.max(176, Math.min(500, startHeight + deltaY));
      container.style.height = `${newHeight}px`;
    };
    
    const onEnd = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  };

  // Closed state - elegant minimal trigger
  if (!isOpen) {
    return (
      <div className="my-6">
        <button
          onClick={handleOpen}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="group w-full relative overflow-hidden"
        >
          {/* Subtle gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-l from-amber-100 via-orange-50 to-amber-100 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative bg-amber-50/60 hover:bg-white border border-amber-200 rounded-lg py-3.5 px-5 transition-all duration-300 group-hover:border-amber-300 group-hover:shadow-md">
            <div className="flex items-center justify-center gap-3">
              {/* Animated dot indicator */}
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full bg-amber-400 ${isHovered ? 'animate-ping opacity-75' : 'opacity-0'}`} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400 group-hover:bg-amber-500 transition-colors" />
              </span>
              
              <span className="text-amber-800 group-hover:text-amber-900 text-sm font-medium tracking-wide transition-colors">
                יש לי שאלה על המוצר
              </span>
              
              {/* Subtle arrow */}
              <svg 
                className="w-4 h-4 text-amber-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
          </div>
        </button>
      </div>
    );
  }

  // Open state - elegant inline chat
  return (
    <div className="my-6">
      <div className="bg-white border border-slate-200/60 rounded-lg overflow-hidden shadow-sm">
        {/* Minimal header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100/80 bg-slate-50/30">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-xs text-slate-700 tracking-wide">יועץ מוצרים</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
              title={isExpanded ? 'הקטן' : 'הגדל'}
            >
              {isExpanded ? (
                <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-slate-100 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Messages area - grows with messages, expandable */}
        <div 
          ref={messagesContainerRef}
          className={`overflow-y-auto p-3 space-y-2.5 bg-gradient-to-b from-slate-50/20 to-white transition-all duration-300 ${
            isExpanded 
              ? 'h-96' 
              : messages.length > 3 
                ? 'h-56' 
                : 'h-44'
          }`}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  message.role === 'user'
                    ? 'bg-slate-800 text-white rounded-xl rounded-br-sm'
                    : 'bg-white text-slate-900 rounded-xl rounded-bl-sm border border-slate-100 shadow-sm'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-white border border-slate-100 rounded-xl rounded-bl-sm px-3 py-2.5 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Resize handle - supports touch */}
        <div 
          className="flex justify-center py-2 cursor-ns-resize hover:bg-slate-50 active:bg-slate-100 transition-colors border-t border-slate-100/50 touch-none"
          onMouseDown={handleResizeStart}
          onTouchStart={handleResizeStart}
        >
          <div className="w-10 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Input area */}
        {/* Input area */}
        <div className="p-2.5 border-t border-slate-100/80 bg-white">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="מה תרצו לדעת?"
              rows={1}
              className="flex-1 px-3.5 py-2 bg-slate-50/50 border border-slate-200/60 rounded-lg text-base focus:outline-none focus:border-slate-400 focus:bg-white placeholder:text-slate-400 transition-all resize-none min-h-[44px] max-h-[100px]"
              disabled={isLoading}
              style={{ height: 'auto', overflow: 'hidden', fontSize: '16px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 100) + 'px';
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-200 text-white rounded-lg transition-colors h-10"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          
          {/* Contact buttons */}
          <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100/50">
            <a
              href="https://wa.me/97235566696"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md text-xs font-medium transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              וואטסאפ
            </a>
            <a
              href="tel:03-5566696"
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-xs font-medium transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              03-5566696
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
