export interface DesignElement {
  id: string;
  type: 'image' | 'text' | 'arrow' | 'rectangle' | 'circle' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  content?: string;
  src?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  flipX?: boolean;
  flipY?: boolean;
  zIndex?: number;
  opacity?: number;
  originalSrc?: string;
}

export interface ProductSearchResult {
  id: number;
  name: string;
  image: string;
  slug: string;
}

export type ToolMode = 'select' | 'crop';

export interface ProductDesignBoardProps {
  isOpen: boolean;
  onClose: () => void;
  productImage: string;
  productName: string;
  onSave?: (imageDataUrl: string) => void;
}

export interface CropState {
  isCropping: boolean;
  cropStart: { x: number; y: number };
  cropEnd: { x: number; y: number };
  showCropPreview: boolean;
}
