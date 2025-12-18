'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Calculator, Upload, Settings, LogIn, LogOut, User, X, FileText, Image as ImageIcon, Loader2, Palette } from 'lucide-react';
import { ExcalidrawDesignBoard } from './design-board';

interface AdminFieldsData {
  width: string;
  depth: string;
  height: string;
  additionalFee: string;
  additionalFeeReason: string;
  discountType: 'percent' | 'fixed';
  discountValue: string;
  freeComments: string;
  uploadedFile: string;
  uploadedFileName: string;
}

interface Upgrade {
  name: string;
  price: number;
}

interface AdminFieldsProps {
  basePrice: number;
  variationPrice?: number;
  productImage?: string;
  productName?: string;
  onPriceChange?: (newPrice: number, data: AdminFieldsData) => void;
  onDataChange?: (data: AdminFieldsData) => void;
}

// Helper to get/set admin token from localStorage
const getAdminToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('bellano_admin_token');
};

const setAdminToken = (token: string, userName: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('bellano_admin_token', token);
  localStorage.setItem('bellano_admin_name', userName);
};

const clearAdminToken = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('bellano_admin_token');
  localStorage.removeItem('bellano_admin_name');
};

const getAdminName = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('bellano_admin_name') || '';
};

export function AdminProductFields({ 
  basePrice, 
  variationPrice, 
  productImage,
  productName,
  onPriceChange,
  onDataChange 
}: AdminFieldsProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([]);
  const [selectedUpgrades, setSelectedUpgrades] = useState<Record<number, number>>({});
  const [showUpgradesPopup, setShowUpgradesPopup] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [showDesignBoard, setShowDesignBoard] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<AdminFieldsData>({
    width: '',
    depth: '',
    height: '',
    additionalFee: '',
    additionalFeeReason: '',
    discountType: 'percent',
    discountValue: '',
    freeComments: '',
    uploadedFile: '',
    uploadedFileName: '',
  });

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const token = getAdminToken();
        const headers: Record<string, string> = {};
        
        if (token) {
          headers['x-admin-token'] = token;
        }
        
        const response = await fetch('/api/auth/check-admin', {
          credentials: 'include',
          headers,
        });
        const data = await response.json();
        setIsAdmin(data.isAdmin);
        
        if (data.isAdmin) {
          setAdminName(data.userName || getAdminName());
          if (data.upgrades) {
            setUpgrades(data.upgrades);
          }
        } else {
          // Token might be invalid, clear it
          if (token) {
            clearAdminToken();
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdmin();
  }, []);

  // Handle login
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
        setAdminToken(data.token, data.userName);
        setIsAdmin(true);
        setAdminName(data.userName);
        setUpgrades(data.upgrades || []);
        setShowLoginForm(false);
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
  
  // Handle logout
  const handleLogout = () => {
    clearAdminToken();
    setIsAdmin(false);
    setAdminName('');
    setUpgrades([]);
  };
  
  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('adminToken', getAdminToken() || '');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });
      
      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          uploadedFile: data.url,
          uploadedFileName: file.name,
        }));
      } else {
        alert(data.message || 'שגיאה בהעלאת הקובץ');
      }
    } catch (error) {
      alert('שגיאה בהעלאת הקובץ');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Remove uploaded file
  const handleRemoveFile = () => {
    setFormData(prev => ({
      ...prev,
      uploadedFile: '',
      uploadedFileName: '',
    }));
  };

  // Calculate total price
  const currentBasePrice = variationPrice || basePrice;
  
  const calculateTotalPrice = () => {
    let price = currentBasePrice;
    
    // Add upgrades
    Object.entries(selectedUpgrades).forEach(([index, quantity]) => {
      const upgrade = upgrades[parseInt(index)];
      if (upgrade && quantity > 0) {
        price += upgrade.price * quantity;
      }
    });
    
    // Add additional fee
    const additionalFee = parseFloat(formData.additionalFee) || 0;
    price += additionalFee;
    
    // Apply discount
    const discountValue = parseFloat(formData.discountValue) || 0;
    if (formData.discountType === 'percent' && discountValue > 0) {
      price = price * (1 - Math.min(100, discountValue) / 100);
    } else if (formData.discountType === 'fixed' && discountValue > 0) {
      price = discountValue;
    }
    
    return Math.max(0, price);
  };

  const totalPrice = calculateTotalPrice();
  const discountPercent = currentBasePrice > 0 
    ? ((currentBasePrice - totalPrice) / currentBasePrice) * 100 
    : 0;

  // Notify parent of changes
  useEffect(() => {
    onPriceChange?.(totalPrice, formData);
    onDataChange?.(formData);
  }, [totalPrice, formData, onPriceChange, onDataChange]);

  const handleInputChange = (field: keyof AdminFieldsData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUpgradeQuantityChange = (index: number, quantity: number) => {
    setSelectedUpgrades(prev => ({
      ...prev,
      [index]: Math.max(0, quantity),
    }));
  };

  const upgradesTotal = Object.entries(selectedUpgrades).reduce((sum, [index, qty]) => {
    const upgrade = upgrades[parseInt(index)];
    return sum + (upgrade ? upgrade.price * qty : 0);
  }, 0);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (isLoading) return null;
  
  // Show login button if not admin
  if (!isAdmin) {
    return (
      <>
        <button
          onClick={() => setShowLoginForm(true)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <LogIn className="w-4 h-4" />
          <span>כניסת נציג מכירות</span>
        </button>
        
        {/* Login Modal */}
        {showLoginForm && (
          <>
            <div 
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setShowLoginForm(false)}
            />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-sm p-6">
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
                  <p className="text-red-500 text-sm">{loginError}</p>
                )}
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
                  >
                    {loginLoading ? 'מתחבר...' : 'התחבר'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowLoginForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <div className="border border-gray-300 rounded-lg bg-gray-50 overflow-hidden mb-4">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <span className="font-bold text-gray-800">שינוי נתונים - למנהלים</span>
            {adminName && (
              <span className="text-sm text-gray-500">({adminName})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              יציאה
            </button>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </div>
        </button>

        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Dimensions Row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">רוחב</label>
                <input
                  type="number"
                  value={formData.width}
                  onChange={(e) => handleInputChange('width', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="ס״מ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">עומק</label>
                <input
                  type="number"
                  value={formData.depth}
                  onChange={(e) => handleInputChange('depth', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="ס״מ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">גובה</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="ס״מ"
                />
              </div>
            </div>

            {/* Additional Fee Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תוספת מחיר</label>
                <input
                  type="number"
                  min="0"
                  value={formData.additionalFee}
                  onChange={(e) => handleInputChange('additionalFee', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="₪"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סיבה לתוספת</label>
                <input
                  type="text"
                  value={formData.additionalFeeReason}
                  onChange={(e) => handleInputChange('additionalFeeReason', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder="למשל: מידה מיוחדת"
                />
              </div>
            </div>

            {/* Discount Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">סוג הנחה</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => handleInputChange('discountType', e.target.value as 'percent' | 'fixed')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="percent">אחוזי הנחה</option>
                  <option value="fixed">מחיר חדש</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.discountType === 'percent' ? 'אחוז הנחה' : 'מחיר חדש'}
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) => handleInputChange('discountValue', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                  placeholder={formData.discountType === 'percent' ? '%' : '₪'}
                />
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
              <textarea
                value={formData.freeComments}
                onChange={(e) => handleInputChange('freeComments', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent"
                rows={2}
                placeholder="הערות לגבי ההזמנה..."
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">העלאת שרטוט/קובץ</label>
              
              {formData.uploadedFile ? (
                <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  {formData.uploadedFile.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                    <ImageIcon className="w-5 h-5 text-green-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-green-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-800 truncate">
                      {formData.uploadedFileName}
                    </p>
                    <a 
                      href={formData.uploadedFile} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline"
                    >
                      פתח קובץ
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                    className="hidden"
                    disabled={isUploading}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-gray-400 hover:bg-gray-50 transition-colors w-full justify-center disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>מעלה...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>העלה שרטוט או קובץ</span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-1 text-center">
                    תמונות, PDF או Word (עד 10MB)
                  </p>
                </div>
              )}
            </div>

            {/* Upgrades Button */}
            {upgrades.length > 0 && (
              <button
                type="button"
                onClick={() => setShowUpgradesPopup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Calculator className="w-4 h-4" />
                בחר שדרוגים
                {upgradesTotal > 0 && (
                  <span className="bg-white text-blue-600 px-2 py-0.5 rounded text-sm font-bold">
                    +{formatPrice(upgradesTotal)}
                  </span>
                )}
              </button>
            )}

            {/* Design Board Button */}
            {productImage && (
              <button
                type="button"
                onClick={() => setShowDesignBoard(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                <Palette className="w-4 h-4" />
                לוח עיצוב / סקיצה
              </button>
            )}

            {/* Price Summary */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>מחיר בסיס:</span>
                <span>{formatPrice(currentBasePrice)}</span>
              </div>
              {upgradesTotal > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>שדרוגים:</span>
                  <span>+{formatPrice(upgradesTotal)}</span>
                </div>
              )}
              {parseFloat(formData.additionalFee) > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>תוספת מחיר:</span>
                  <span>+{formatPrice(parseFloat(formData.additionalFee))}</span>
                </div>
              )}
              {discountPercent > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>הנחה:</span>
                  <span>-{discountPercent.toFixed(1)}%</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>מחיר סופי:</span>
                <span className="text-blue-600">{formatPrice(totalPrice)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upgrades Popup */}
      {showUpgradesPopup && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowUpgradesPopup(false)}
          />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-50 w-full max-w-md max-h-[80vh] overflow-auto p-6">
            <h3 className="text-lg font-bold mb-4">שדרוגים זמינים</h3>
            
            <div className="space-y-3">
              {upgrades.map((upgrade, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium">{upgrade.name}</span>
                    <span className="text-gray-500 text-sm mr-2">
                      (+{formatPrice(upgrade.price)})
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={selectedUpgrades[index] || 0}
                    onChange={(e) => handleUpgradeQuantityChange(index, parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-center"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between font-bold mb-4">
                <span>סה״כ תוספת שדרוגים:</span>
                <span className="text-blue-600">{formatPrice(upgradesTotal)}</span>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => setShowUpgradesPopup(false)}
                  className="flex-1 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                >
                  החל שדרוגים
                </button>
                <button
                  onClick={() => setShowUpgradesPopup(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Design Board Modal - Using Excalidraw */}
      <ExcalidrawDesignBoard
        isOpen={showDesignBoard}
        onClose={() => setShowDesignBoard(false)}
        productImage={productImage || ''}
        productName={productName || 'מוצר'}
        onSave={(imageDataUrl: string) => {
          // Save design to formData as uploaded file
          setFormData(prev => ({
            ...prev,
            uploadedFile: imageDataUrl,
            uploadedFileName: `design-${Date.now()}.png`,
          }));
        }}
      />
    </>
  );
}
