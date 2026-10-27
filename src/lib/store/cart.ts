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
  glassProductId?: number;
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
  bundleDiscount?: number; // Discount percentage if part of a bundle
  originalPrice?: string; // Original price before bundle discount
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  isHydrated: boolean;
  isCheckingOut: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  /** Lines are addressed by cartLineKey(item). */
  updateItem: (lineKey: string, item: Partial<CartItem>) => void;
  removeItem: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
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

/** JSON with sorted keys and empty values left out, so equal choices always give equal text. */
const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== false)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
};

/**
 * A cart line's identity. Adding to the cart raises the quantity of an existing
 * line only when everything about the new piece is the same: product, variation,
 * the chosen attribute values, formula dimensions, every option and rep field
 * (including the rep's custom width/depth/height), and price.
 *
 * The variation id is not enough. Many variations leave a size attribute on
 * "any" (depth 35 or 40 at one price, say), so a different size lands on the
 * same variation id. Keyed on the id alone, the second piece was folded into the
 * first line as quantity 2 and its size was lost — the order went out with the
 * first size twice (united, found 2026-10-28).
 */
export const cartLineKey = (
  item: Pick<CartItem, 'id' | 'price' | 'variation' | 'adminFields' | 'formulaFields'>
): string =>
  stableJson({
    id: item.id,
    variation: item.variation?.id,
    attributes: (item.variation?.attributes || [])
      .map((a) => `${a.name}=${a.value}`)
      .sort(),
    price: parseFloat((item.price || '0').replace(/[^\d.]/g, '')) || 0,
    dimensions: item.formulaFields?.dimensions,
    options: item.adminFields,
  });

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
        const lineKey = cartLineKey(item);
        const existingItem = items.find((i) => cartLineKey(i) === lineKey);

        if (existingItem) {
          set({
            items: items.map((i) =>
              i === existingItem ? { ...i, quantity: i.quantity + quantity } : i
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity }] });
        }
        get().openCart();
      },

      removeItem: (lineKey) => {
        set({
          items: get().items.filter((i) => cartLineKey(i) !== lineKey),
        });
      },

      updateItem: (lineKey, updates) => {
        set({
          items: get().items.map((i) =>
            cartLineKey(i) === lineKey ? { ...i, ...updates } : i
          ),
        });
        get().openCart();
      },

      updateQuantity: (lineKey, quantity) => {
        if (quantity < 1) {
          get().removeItem(lineKey);
          return;
        }
        set({
          items: get().items.map((i) =>
            cartLineKey(i) === lineKey ? { ...i, quantity } : i
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
          const glass = item.adminFields?.glassOption ? (item.adminFields.glassPrice || 0) : 0;
          return total + (price + glass) * item.quantity;
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
