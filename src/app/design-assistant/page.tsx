'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Send, Sparkles, ArrowRight, Home, Sofa, Bed, UtensilsCrossed } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  products?: Product[];
}

interface Product {
  id: string;
  name: string;
  price: string;
  image: string;
  slug: string;
}

const quickPrompts = [
  { icon: Home, text: 'אני מחפש מזנון לסלון מודרני', category: 'סלון' },
  { icon: Bed, text: 'מיטה זוגית בסגנון מודרני', category: 'חדר שינה' },
  { icon: UtensilsCrossed, text: 'שולחן אוכל ל-6 סועדים', category: 'פינת אוכל' },
  { icon: Sofa, text: 'קונסולה לכניסה לבית', category: 'כניסה' },
];

export default function DesignAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'שלום! 👋 אני העוזר האישי שלך לעיצוב הבית.\n\nספר/י לי על החדר שאת/ה מעצב/ת - מה הגודל? איזה סגנון אתם אוהבים? מה התקציב?\n\nאני אעזור לך למצוא את הרהיטים המושלמים! ✨'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scroll only when new messages are added, not on input focus
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-slate-500 hover:text-slate-700 flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              חזרה לאתר
            </Link>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h1 className="text-lg font-medium">עוזר העיצוב של בלאנו</h1>
            </div>
            <div className="w-20" /> {/* Spacer */}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Chat Messages */}
        <div 
          ref={messagesContainerRef}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-4 min-h-[60vh] max-h-[65vh] overflow-y-auto"
        >
          <div className="p-6 space-y-6">
            {messages.map((message, index) => (
              <div key={index}>
                <div className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl whitespace-pre-wrap ${
                      message.role === 'user'
                        ? 'bg-slate-800 text-white rounded-br-sm'
                        : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
                
                {/* Product Recommendations */}
                {message.products && message.products.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {message.products.map((product) => (
                      <Link
                        key={product.id}
                        href={`/product/${product.slug}`}
                        className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all"
                      >
                        <div className="aspect-square relative bg-slate-100">
                          {product.image && (
                            <Image
                              src={product.image}
                              alt={product.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm font-medium text-slate-800 line-clamp-2">{product.name}</h3>
                          <p className="text-amber-600 font-semibold mt-1">{product.price}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-end">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Prompts */}
        {messages.length <= 2 && (
          <div className="mb-4">
            <p className="text-sm text-slate-500 mb-3 text-center">או התחילו מכאן:</p>
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(prompt.text)}
                  disabled={isLoading}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-all text-right"
                >
                  <prompt.icon className="w-5 h-5 text-amber-500 shrink-0" />
                  <span className="text-sm text-slate-700">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="ספרו לי על החדר שאתם מעצבים..."
              rows={2}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:border-amber-400 focus:bg-white transition-all text-base"
              style={{ fontSize: '16px' }}
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="px-5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 text-white rounded-xl transition-colors self-end h-12"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-xs mt-4">
          העוזר מבוסס AI ועשוי לטעות. לייעוץ מקצועי פנו אלינו 03-5566696
        </p>
      </div>
    </div>
  );
}
