'use client';

import { useState } from 'react';
import { Send, AlertCircle } from 'lucide-react';
import { getApiEndpoint } from '@/config/site';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch(getApiEndpoint('contact'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'שגיאה בשליחת ההודעה');
      }
    } catch {
      setError('שגיאה בשליחת ההודעה. אנא נסו שנית.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 md:p-8">
      <h2 className="text-xl font-bold mb-2">שלחו לנו הודעה</h2>
      <p className="text-gray-500 text-sm mb-6">נחזור אליכם בהקדם האפשרי</p>
      
      {submitted ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-medium mb-2">ההודעה נשלחה בהצלחה!</h3>
          <p className="text-gray-500">נחזור אליכם בהקדם</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">שם מלא *</label>
              <input 
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="השם שלכם"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">טלפון *</label>
              <input 
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                placeholder="מספר טלפון"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">אימייל</label>
            <input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="כתובת אימייל"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">נושא</label>
            <input 
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({...formData, subject: e.target.value})}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="נושא הפנייה"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5">הודעה *</label>
            <textarea 
              required
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
              className="w-full min-h-[120px] px-4 py-2.5 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="כתבו את ההודעה שלכם..."
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'שולח...' : 'שליחת הודעה'}
          </button>
        </form>
      )}
    </div>
  );
}
