import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { siteConfig, getApiEndpoint } from '@/config/site';
import type { FormulaFieldsData } from '@/lib/formula-pricing';

export interface AdminFieldsData {
  width?: string;
  depth?: string;
  height?: string;
  additionalFee?: string;
  additionalFeeReason?: string;
  discountType?: 'percent' | 'fixed';
  discountValue?: string;
  freeComments?: string;
  uploadedFile?: string;
  uploadedFileName?: string;
  originalPrice?: string;
  finalPrice?: string;
  tambourColor?: string;
  tambourPrice?: number;
  glassOption?: boolean;
  glassLabel?: string;
  glassPrice?: number;
}

export interface StudioFieldsData {
  productId: number;
  variationId: number;
  dimensions: { width?: number; depth?: number; height?: number };
  selections: Record<string, string | string[]>;
  labels: Record<string, string[]>;
  price: number;
}

export interface CartItem {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  price: string;
  quantity: number;
  image?: {
    sourceUrl: string;
    altText?: string;
  };
  variation?: {
    id: number;
    name: string;
    attributes: { name: string; value: string }[];
  };
  adminFields?: AdminFieldsData;
  formulaFields?: FormulaFieldsData; // Custom dimensions + formula-calculated price
  studioFields?: StudioFieldsData; // Bellano Studio configuration, re-validated server-side
  bundleDiscount?: number; // Discount percentage if part of a bundle
  originalPrice?: string; // Original price before bundle discount
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  isHydrated: boolean;
  isCheckingOut: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  updateItem: (id: string, item: Partial<CartItem>, variationId?: number, formulaKey?: string) => void;
  removeItem: (id: string, variationId?: number, formulaKey?: string) => void;
  updateQuantity: (id: string, quantity: number, variationId?: number, formulaKey?: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  checkout: () => Promise<void>;
  getFallbackCheckoutUrl: () => string;
  setHydrated: () => void;
}

/**
 * Stable key fragment for formula dimensions (e.g. "w240-d35-h30") so the
 * same variation with different custom dimensions stays a separate cart line.
 */
export const getFormulaKey = (formulaFields?: FormulaFieldsData): string | undefined => {
  if (!formulaFields?.dimensions) return undefined;
  const parts: string[] = [];
  (['width', 'depth', 'height'] as const).forEach((dim) => {
    const value = formulaFields.dimensions[dim];
    if (value != null) parts.push(`${dim[0]}${value}`);
  });
  return parts.length > 0 ? parts.join('-') : undefined;
};

const getItemKey = (id: string, variationId?: number, formulaKey?: string) => {
  const base = variationId ? `${id}-${variationId}` : id;
  return formulaKey ? `${base}-${formulaKey}` : base;
};

const cartItemKey = (item: Pick<CartItem, 'id' | 'variation' | 'formulaFields' | 'studioFields'>) =>
  getItemKey(item.id, item.variation?.id, getFormulaKey(item.formulaFields));

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isHydrated: false,
      isCheckingOut: false,

      setHydrated: () => set({ isHydrated: true }),

      addItem: (item, quantity = 1) => {
        const items = get().items;
        const itemKey = cartItemKey(item);
        const existingItem = items.find((i) => cartItemKey(i) === itemKey);

        if (existingItem) {
          set({
            items: items.map((i) =>
              cartItemKey(i) === itemKey
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity }] });
        }
        get().openCart();
      },

      removeItem: (id, variationId, formulaKey) => {
        const itemKey = getItemKey(id, variationId, formulaKey);
        set({
          items: get().items.filter((i) =>
            getItemKey(i.id, i.variation?.id, getFormulaKey(i.formulaFields)) !== itemKey
          )
        });
      },

      updateItem: (id, updates, variationId, formulaKey) => {
        const itemKey = getItemKey(id, variationId, formulaKey);
        set({
          items: get().items.map((i) =>
            getItemKey(i.id, i.variation?.id, getFormulaKey(i.formulaFields)) === itemKey
              ? { ...i, ...updates }
              : i
          ),
        });
        get().openCart();
      },

      updateQuantity: (id, quantity, variationId, formulaKey) => {
        if (quantity < 1) {
          get().removeItem(id, variationId, formulaKey);
          return;
        }
        const itemKey = getItemKey(id, variationId, formulaKey);
        set({
          items: get().items.map((i) =>
            getItemKey(i.id, i.variation?.id, getFormulaKey(i.formulaFields)) === itemKey
              ? { ...i, quantity }
              : i
          ),
        });
      },

      clearCart: () => set({ items: [] }),

      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      getTotal: () => {
        return get().items.reduce((total, item) => {
          const price = parseFloat(item.price.replace(/[^\d.]/g, '')) || 0;
          return total + price * item.quantity;
        }, 0);
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      checkout: async () => {
        const items = get().items;
        if (items.length === 0) return;

        set({ isCheckingOut: true });

        try {
          // Prepare items for WooCommerce
          const cartItems = items.map(item => ({
            product_id: item.databaseId,
            variation_id: item.variation?.id || 0,
            quantity: item.quantity
          }));

          // Get checkout URL from WordPress
          const response = await fetch(getApiEndpoint('checkout-url'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(cartItems),
          });

          const data = await response.json();

          if (data.success && data.checkout_url) {
            // Clear local cart
            get().clearCart();
            // Redirect to checkout
            window.location.href = data.checkout_url;
          } else {
            // Fallback to simple URL method
            const fallbackUrl = get().getFallbackCheckoutUrl();
            window.location.href = fallbackUrl;
          }
        } catch (error) {
          console.error('Checkout error:', error);
          // Fallback to simple URL method
          const fallbackUrl = get().getFallbackCheckoutUrl();
          window.location.href = fallbackUrl;
        } finally {
          set({ isCheckingOut: false });
        }
      },

      getFallbackCheckoutUrl: () => {
        const items = get().items;
        if (items.length === 0) return `${siteConfig.wordpressUrl}/checkout`;
        
        // For single item
        if (items.length === 1) {
          const item = items[0];
          const productId = item.variation?.id || item.databaseId;
          return `${siteConfig.wordpressUrl}/?add-to-cart=${productId}&quantity=${item.quantity}`;
        }
        
        // For multiple items - encode all items
        const encodedItems = items.map(item => ({
          id: item.variation?.id || item.databaseId,
          qty: item.quantity
        }));
        
        const cartData = btoa(JSON.stringify(encodedItems));
        return `${siteConfig.wordpressUrl}/?${siteConfig.prefix}_cart=${cartData}`;
      },
    }),
    {
      name: `${siteConfig.prefix}-cart`,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
      partialize: (state) => ({ items: state.items }),
    }
  )
);
