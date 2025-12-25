'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Send, Sparkles, ArrowRight, Tv, Bed, UtensilsCrossed, DoorOpen } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
  isTyping?: boolean;
}

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  slug: string;
}

const quickPrompts = [
  { icon: Tv, text: 'מזנון לסלון', category: 'סלון' },
  { icon: Bed, text: 'מיטה זוגית', category: 'חדר שינה' },
  { icon: UtensilsCrossed, text: 'שולחן אוכל', category: 'פינת אוכל' },
  { icon: DoorOpen, text: 'קונסולה לכניסה', category: 'כניסה' },
];

const WELCOME_TEXT = 'היי! ✨ אני כאן לעזור לכם לעצב את הבית ולמצוא את הרהיטים המושלמים. מה תרצו לחפש?';

export default function DesignAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [displayedWelcome, setDisplayedWelcome] = useState('');
  const [showWelcome, setShowWelcome] = useState(true);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Typing effect for welcome message
  useEffect(() => {
    if (showWelcome && displayedWelcome.length < WELCOME_TEXT.length) {
      const timeout = setTimeout(() => {
        setDisplayedWelcome(WELCOME_TEXT.slice(0, displayedWelcome.length + 1));
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [displayedWelcome, showWelcome]);

  // Scroll only when new messages are added, not on input focus
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;
    
    // Hide welcome message when user sends first message
    if (showWelcome) {
      setShowWelcome(false);
    }

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/design-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          history: messages,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          products: data.products || [],
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'סליחה, משהו השתבש. נסו שוב או פנו אלינו 03-5566696',
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'בעיה בחיבור. פנו אלינו 03-5566696',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Hide main header/footer for this page */}
      <style jsx global>{`
        header, footer, .floating-buttons { display: none !important; }
        main { min-height: auto !important; }
      `}</style>
      
      <div className="fixed inset-0 flex flex-col bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 shrink-0">
          <div className="max-w-2xl mx-auto px-3 py-2 md:py-3 flex items-center justify-between">
            <Link href="/" className="text-slate-400 hover:text-slate-600 p-1">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">עוזר העיצוב</span>
            </div>
            <a href="tel:035566696" className="text-amber-500 text-xs">03-5566696</a>
          </div>
        </div>

        {/* Chat Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-2xl mx-auto p-3 md:p-4 space-y-3">
            {/* Welcome message with typing effect */}
            {showWelcome && (
              <div className="flex justify-end">
                <div className="max-w-[80%] px-3 py-2 rounded-2xl rounded-bl-sm bg-white text-slate-800 shadow-sm text-sm">
                  {displayedWelcome}
                  {displayedWelcome.length < WELCOME_TEXT.length && (
                    <span className="inline-block w-0.5 h-4 bg-amber-500 animate-pulse mr-0.5 align-middle" />
                  )}
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={index}>
                <div className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl whitespace-pre-wrap text-sm ${
                      message.role === 'user'
                        ? 'bg-slate-800 text-white rounded-br-sm'
                        : 'bg-white text-slate-800 rounded-bl-sm shadow-sm'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
                
                {/* Product Recommendations */}
                {message.products && message.products.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-3 md:overflow-visible">
                    {message.products.map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        className="shrink-0 w-28 md:w-auto bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="aspect-square relative bg-slate-100">
                          {product.image && (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="p-2">
                          <h3 className="text-xs font-medium text-slate-800 line-clamp-1">{product.name}</h3>
                          <p className="text-amber-600 font-semibold text-xs">{product.price}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section - with padding for floating buttons */}
        <div className="shrink-0 bg-white border-t border-slate-200 pb-20 md:pb-3">
          <div className="max-w-2xl mx-auto p-3 space-y-2">
            {/* Quick Prompts */}
            {(showWelcome || messages.length <= 2) && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:justify-center">
                {quickPrompts.map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handleSend(prompt.text)}
                    disabled={isLoading}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-700 hover:bg-amber-100 transition-all"
                  >
                    <prompt.icon className="w-3.5 h-3.5 text-amber-500" />
                    {prompt.text}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="מה אתם מחפשים?"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-amber-400 focus:bg-white transition-all"
                style={{ fontSize: '16px' }}
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white rounded-full transition-colors flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
