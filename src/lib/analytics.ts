import { track } from '@vercel/analytics';

// Vercel Analytics Custom Events
export const analytics = {
  // E-commerce Events
  addToCart: (data: {
    productId: number;
    productName: string;
    price: number;
    quantity: number;
    category?: string;
  }) => {
    track('add_to_cart', {
      product_id: data.productId,
      product_name: data.productName,
      price: data.price,
      quantity: data.quantity,
      value: data.price * data.quantity,
      category: data.category || '',
    });
  },

  viewProduct: (data: {
    productId: number;
    productName: string;
    price: number;
    category?: string;
  }) => {
    track('view_item', {
      product_id: data.productId,
      product_name: data.productName,
      price: data.price,
      category: data.category || '',
    });
  },

  purchase: (data: {
    orderId: string;
    value: number;
    itemCount: number;
    isPhoneOrder?: boolean;
  }) => {
    track('purchase', {
      order_id: data.orderId,
      value: data.value,
      item_count: data.itemCount,
      is_phone_order: data.isPhoneOrder || false,
    });
  },

  // Contact Events
  clickWhatsapp: (source: string = 'floating_button') => {
    track('click_whatsapp', { source });
  },

  clickPhone: (source: string = 'floating_button') => {
    track('click_phone', { source });
  },

  // Search Events
  search: (query: string, resultsCount: number) => {
    track('search', {
      query,
      results_count: resultsCount,
    });
  },

  // Navigation Events
  viewCategory: (categoryName: string, categorySlug: string) => {
    track('view_category', {
      category_name: categoryName,
      category_slug: categorySlug,
    });
  },

  // Checkout Events
  beginCheckout: (value: number, itemCount: number) => {
    track('begin_checkout', {
      value,
      item_count: itemCount,
    });
  },

  // Design Board Events
  useDesignBoard: (productName: string) => {
    track('use_design_board', {
      product_name: productName,
    });
  },

  shareProduct: (productName: string, platform: string) => {
    track('share_product', {
      product_name: productName,
      platform,
    });
  },
};
