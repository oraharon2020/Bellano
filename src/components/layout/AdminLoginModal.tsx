'use client';

import { useState, useEffect } from 'react';
import { User, X, Loader2 } from 'lucide-react';
import { useAdminStore } from '@/lib/store/admin';
import { getApiEndpoint } from '@/config/site';

type Mode = 'sms' | 'password';
type SmsStep = 'phone' | 'code';

/**
 * Sales-rep login. A code by SMS to the phone on the rep's WordPress profile is
 * the default; user name + password is the fallback.
 *
 * The code steps call WordPress straight from the browser, unlike the password
 * (which goes through /api/auth/check-admin): the server limits codes per
 * address, and through a Vercel function every rep would share Vercel's.
 */
export function AdminLoginModal() {
  const { showLoginModal, closeLoginModal, setAdmin } = useAdminStore();
  // null while asking the server whether the code login is on.
  const [mode, setMode] = useState<Mode | null>(null);
  const [smsAvailable, setSmsAvailable] = useState(false);
  const [smsStep, setSmsStep] = useState<SmsStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });

  // Reset the form when the modal opens, and open on the code only where the
  // server says it can send one — a shop with no SMS gateway set up, or a
  // server without the route yet, opens straight on the password.
  useEffect(() => {
    if (!showLoginModal) return;
    setMode(null);
    setSmsStep('phone');
    setPhone('');
    setCode('');
    setLoginData({ username: '', password: '' });
    setLoginError('');

    let cancelled = false;
    fetch(getApiEndpoint('admin-login/sms'), { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((data) => {
        if (cancelled) return;
        const available = data?.available === true;
        setSmsAvailable(available);
        setMode(available ? 'sms' : 'password');
      });
    return () => {
      cancelled = true;
    };
  }, [showLoginModal]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setSmsStep('phone');
    setCode('');
    setLoginError('');
  };

  const postToWordPress = async (endpoint: string, body: Record<string, string>) => {
    const response = await fetch(getApiEndpoint(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, data };
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { ok, status, data } = await postToWordPress('admin-login/sms', { phone });
      if (ok && data?.success) {
        setCode('');
        setSmsStep('code');
      } else if (status === 503) {
        // The gateway is down: the password form, with the server's explanation.
        setSmsAvailable(false);
        setMode('password');
        setLoginError(data?.message || 'הכניסה בקוד אינה זמינה כרגע. היכנסו עם שם משתמש וסיסמה.');
      } else {
        setLoginError(data?.message || 'לא הצלחנו לשלוח קוד. נסו שוב.');
      }
    } catch {
      setLoginError('אין חיבור לשרת. נסו שוב.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const { ok, data } = await postToWordPress('admin-login/sms/verify', { phone, code });
      if (ok && data?.success) {
        setAdmin(true, data.userName, data.token, data.upgrades || []);
        closeLoginModal();
      } else {
        setLoginError(data?.message || 'הקוד שגוי או שפג תוקפו.');
      }
    } catch {
      setLoginError('אין חיבור לשרת. נסו שוב.');
    } finally {
      setLoginLoading(false);
    }
  };

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
    } catch {
      setLoginError('שגיאה בהתחברות');
    } finally {
      setLoginLoading(false);
    }
  };

  if (!showLoginModal) return null;

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent';
  const submitClass = 'w-full bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2';
  const linkClass = 'text-sm text-gray-600 underline hover:text-black disabled:opacity-50';

  const submitLabel = (idle: string, busy: string) =>
    loginLoading ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        {busy}
      </>
    ) : (
      idle
    );

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

        {mode === null && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {mode === 'sms' && smsStep === 'phone' && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div>
              <label htmlFor="admin-login-phone" className="block text-sm font-medium text-gray-700 mb-1">
                מספר הנייד שלך
              </label>
              <input
                id="admin-login-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`${inputClass} text-left`}
                placeholder="050-1234567"
                autoFocus
                required
              />
            </div>

            {loginError && <p className="text-sm text-red-500">{loginError}</p>}

            <button type="submit" disabled={loginLoading} className={submitClass}>
              {submitLabel('שלחו לי קוד', 'שולח...')}
            </button>
          </form>
        )}

        {mode === 'sms' && smsStep === 'code' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <p className="text-sm text-gray-600">
              אם <bdi dir="ltr">{phone}</bdi> רשום כמספר של מנהל באתר, נשלח אליו עכשיו קוד ב־SMS. הקוד תקף לעשר דקות.
            </p>
            <div>
              <label htmlFor="admin-login-code" className="block text-sm font-medium text-gray-700 mb-1">
                הקוד מה־SMS
              </label>
              <input
                id="admin-login-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className={`${inputClass} text-center text-2xl tracking-[0.4em]`}
                autoFocus
                required
              />
            </div>

            {loginError && <p className="text-sm text-red-500">{loginError}</p>}

            <button type="submit" disabled={loginLoading || code.length !== 6} className={submitClass}>
              {submitLabel('כניסה', 'מתחבר...')}
            </button>

            <div className="flex justify-between">
              <button type="button" onClick={() => handleSendCode()} disabled={loginLoading} className={linkClass}>
                שלחו שוב
              </button>
              <button type="button" onClick={() => switchMode('sms')} disabled={loginLoading} className={linkClass}>
                מספר אחר
              </button>
            </div>
          </form>
        )}

        {mode === 'password' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                שם משתמש
              </label>
              <input
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
                className={inputClass}
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
                className={inputClass}
                placeholder="סיסמה"
                required
              />
            </div>

            {loginError && (
              <p className="text-sm text-red-500">{loginError}</p>
            )}

            <button type="submit" disabled={loginLoading} className={submitClass}>
              {submitLabel('התחבר', 'מתחבר...')}
            </button>
          </form>
        )}

        {mode !== null && smsAvailable && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={() => switchMode(mode === 'sms' ? 'password' : 'sms')}
              disabled={loginLoading}
              className={linkClass}
            >
              {mode === 'sms' ? 'כניסה עם שם משתמש וסיסמה' : 'כניסה עם קוד ב־SMS'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
