
export type Category = string;

export interface Product {
  id?: string;
  name: string;
  price: number;
  stock: number;
  category: Category;
  description?: string;
  imageUrl?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  serialNumber: string;
  date: string;
  items: CartItem[];
  total: number;
  gstAmount: number;
  discount: number;
  finalAmount: number;
  paymentStatus: 'Paid' | 'Pending' | 'Cancelled';
  paymentMethod: 'Cash' | 'UPI' | 'Card';
  cancellationReason?: string;
  isReprinted?: boolean;
  reprintReason?: string;
  fortune?: string;
  timestamp?: any;
}

export interface Expense {
  id?: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt?: any;
}

export interface ShopProfile {
  id?: string;
  shopName: string;
  address?: string;
  phone?: string;
  email?: string;
  billFooter?: string;
  gstEnabled?: boolean;
  gstNumber?: string;
  gstPercentage?: number;
  gstIncluded?: boolean;
  fssaiEnabled?: boolean;
  fssaiNumber?: string;
  fortunes?: string[];
  nextFortuneIndex?: number;
  printerType?: 'pdf' | 'browser';
  paperWidth?: '58mm' | '80mm' | '110mm';
  autoPrintEnabled?: boolean;
  connectedPrinterName?: string;
  aggregatorsEnabled?: boolean;
  zomatoApiKey?: string;
  swiggyApiKey?: string;
}

export interface DiscountRule {
  id?: string;
  name: string;
  type: 'total_amount' | 'product' | 'promo_code';
  valueType: 'percentage' | 'fixed';
  value: number;
  minAmount?: number;
  productId?: string;
  code?: string;
  isActive: boolean;
}
