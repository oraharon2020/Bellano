// Product Types
export interface ProductImage {
  sourceUrl: string;
  altText?: string;
}

export interface ProductCategory {
  name: string;
  slug: string;
}

export interface ProductAttribute {
  name: string;
  options?: string[];
  value?: string;
}

export interface ProductVariation {
  id: string;
  databaseId?: number;
  name?: string;
  colorName?: string;
  price?: string;
  regularPrice?: string;
  salePrice?: string;
  attributes?: {
    nodes: ProductAttribute[];
  };
  image?: ProductImage;
}

export interface Product {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  price: string;
  regularPrice?: string;
  salePrice?: string;
  onSale: boolean;
  sku?: string;
  image?: ProductImage;
  galleryImages?: ProductImage[];
  productCategories?: {
    nodes: ProductCategory[];
  };
  attributes?: {
    nodes: ProductAttribute[];
  };
  variations?: ProductVariation[];
  related?: {
    nodes: Product[];
  };
}

// Category Types
export interface Category {
  id: string;
  databaseId: number;
  name: string;
  slug: string;
  description?: string;
  image?: ProductImage;
  count?: number;
}

// API Response Types
export interface ProductsResponse {
  products: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
    nodes: Product[];
  };
}

export interface CategoriesResponse {
  productCategories: {
    nodes: Category[];
  };
}

export interface SingleProductResponse {
  product: Product;
}
