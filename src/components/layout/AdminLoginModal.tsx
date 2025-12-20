'use client';

import { useState, useEffect } from 'react';
import { User, X, Loader2 } from 'lucide-react';
import { useAdminStore } from '@/lib/store/admin';

export function AdminLoginModal() {
  const { showLoginModal, closeLoginModal, setAdmin } = useAdminStore();
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // Reset form when modal opens
  useEffect(() => {
    if (showLoginModal) {
      setLoginData({ username: '', password: '' });
      setLoginError('');
    }
  }, [showLoginModal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    
    try {
      const response = await fetch('/api/auth/check-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setAdmin(true, data.userName, data.token, data.upgrades || []);
        closeLoginModal();
        setLoginData({ username: '', password: '' });
      } else {
        setLoginError(data.message || 'שגיאה בהתחברות');
      }
    } catch (error) {
      setLoginError('שגיאה בהתחברות');
    } finally {
      setLoginLoading(false);
    }
  };

  if (!showLoginModal) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-50"
        onClick={closeLoginModal}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-sm p-6">
        <button
          onClick={closeLoginModal}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          כניסת נציג מכירות
        </h3>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              שם משתמש
            </label>
            <input
              type="text"
              value={loginData.username}
              onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="שם משתמש ב-WordPress"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              סיסמה
            </label>
            <input
              type="password"
              value={loginData.password}
              onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
              placeholder="סיסמה"
              required
            />
          </div>
          
          {loginError && (
            <p className="text-sm text-red-500">{loginError}</p>
          )}
          
          <button
            type="submit"
            disabled={loginLoading}
            className="w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loginLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                מתחבר...
              </>
            ) : (
              'התחבר'
            )}
          </button>
        </form>
      </div>
    </>
  );
}
