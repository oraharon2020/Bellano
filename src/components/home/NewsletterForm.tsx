'use client';

import { useState } from 'react';

export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('נא להזין כתובת אימייל תקינה');
      return;
    }

    setStatus('loading');
    
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage' }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('success');
        setMessage(data.message);
        setEmail('');
      } else {
        setStatus('error');
        setMessage(data.message);
      }
    } catch {
      setStatus('error');
      setMessage('שגיאה בהרשמה. נא לנסות שוב.');
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-green-500/20 border border-green-500/30 text-green-400 px-6 py-4 rounded-lg max-w-lg mx-auto">
        <p className="text-lg font-medium">✓ {message}</p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="הזינו את האימייל שלכם"
          className="flex-1 px-6 py-4 bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="px-8 py-4 bg-white text-black font-medium hover:bg-gray-100 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          {status === 'loading' ? 'שולח...' : 'הרשמה'}
        </button>
      </form>
      
      {status === 'error' && (
        <p className="text-red-400 text-sm mt-4">{message}</p>
      )}
    </>
  );
}
