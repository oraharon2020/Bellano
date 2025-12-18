import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  isHydrated: boolean;
  isCheckingOut: boolean;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  updateItem: (id: string, item: Partial<CartItem>, variationId?: number) => void;
  removeItem: (id: string, variationId?: number) => void;
  updateQuantity: (id: string, quantity: number, variationId?: number) => void;
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

const getItemKey = (id: string, variationId?: number) => {
  return variationId ? `${id}-${variationId}` : id;
};

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
        const itemKey = getItemKey(item.id, item.variation?.id);
        const existingItem = items.find((i) => 
          getItemKey(i.id, i.variation?.id) === itemKey
        );

        if (existingItem) {
          set({
            items: items.map((i) =>
              getItemKey(i.id, i.variation?.id) === itemKey
                ? { ...i, quantity: i.quantity + quantity }
                : i
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity }] });
        }
        get().openCart();
      },

      removeItem: (id, variationId) => {
        const itemKey = getItemKey(id, variationId);
        set({ 
          items: get().items.filter((i) => 
            getItemKey(i.id, i.variation?.id) !== itemKey
          ) 
        });
      },

      updateItem: (id, updates, variationId) => {
        const itemKey = getItemKey(id, variationId);
        set({
          items: get().items.map((i) =>
            getItemKey(i.id, i.variation?.id) === itemKey 
              ? { ...i, ...updates } 
              : i
          ),
        });
      },

      updateQuantity: (id, quantity, variationId) => {
        if (quantity < 1) {
          get().removeItem(id, variationId);
          return;
        }
        const itemKey = getItemKey(id, variationId);
        set({
          items: get().items.map((i) =>
            getItemKey(i.id, i.variation?.id) === itemKey 
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
          const response = await fetch('https://bellano.co.il/wp-json/bellano/v1/checkout-url', {
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
        if (items.length === 0) return 'https://bellano.co.il/checkout';
        
        // For single item
        if (items.length === 1) {
          const item = items[0];
          const productId = item.variation?.id || item.databaseId;
          return `https://bellano.co.il/?add-to-cart=${productId}&quantity=${item.quantity}`;
        }
        
        // For multiple items - encode all items
        const encodedItems = items.map(item => ({
          id: item.variation?.id || item.databaseId,
          qty: item.quantity
        }));
        
        const cartData = btoa(JSON.stringify(encodedItems));
        return `https://bellano.co.il/?bellano_cart=${cartData}`;
      },
    }),
    {
      name: 'bellano-cart',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
      partialize: (state) => ({ items: state.items }),
    }
  )
);
