
"use client";

import { useState, useMemo, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Plus, Minus, Trash2, Receipt, Search, ShoppingBag, 
  Inbox, Loader2, ImageIcon, Printer, Save, Tag, Ticket,
  RefreshCw, Wallet, Banknote, AlertCircle, Check
} from 'lucide-react';
import { Product, CartItem, ShopProfile, DiscountRule } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, useDoc, useUser } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import Image from 'next/image';
import { format } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function BillingPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'UPI' | null>(null);
  const [printingData, setPrintingData] = useState<{
    transaction: any;
    profile: ShopProfile | null;
  } | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<DiscountRule | null>(null);

  const productsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'products');
  }, [db, user]);
  
  const { data, loading } = useCollection<Product>(productsRef);
  const products = data || [];

  const discountsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'discounts');
  }, [db, user]);
  const { data: discountRules } = useCollection<DiscountRule>(discountsRef);

  const shopRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'settings', 'shop');
  }, [db, user]);
  const { data: shopProfile } = useDoc<ShopProfile>(shopRef);
  
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => 
      prev.map((item) => {
        if (item.id === productId) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  
  const discountDetails = useMemo(() => {
    let totalDiscount = 0;
    const activeRules = discountRules?.filter(r => r.isActive) || [];

    cart.forEach(item => {
      const productRules = activeRules.filter(r => r.type === 'product' && r.productId === item.id);
      productRules.forEach(rule => {
        if (rule.valueType === 'percentage') {
          totalDiscount += (item.price * item.quantity * rule.value) / 100;
        } else {
          totalDiscount += rule.value * item.quantity;
        }
      });
    });

    const amountRules = activeRules
      .filter(r => r.type === 'total_amount' && cartSubtotal >= (r.minAmount || 0))
      .sort((a, b) => {
        const valA = a.valueType === 'fixed' ? a.value : (cartSubtotal * a.value) / 100;
        const valB = b.valueType === 'fixed' ? b.value : (cartSubtotal * b.value) / 100;
        return valB - valA;
      });
    
    if (amountRules.length > 0) {
      const bestRule = amountRules[0];
      if (bestRule.valueType === 'percentage') {
        totalDiscount += (cartSubtotal * bestRule.value) / 100;
      } else {
        totalDiscount += bestRule.value;
      }
    }

    if (appliedPromoCode) {
      if (appliedPromoCode.valueType === 'percentage') {
        totalDiscount += (cartSubtotal * appliedPromoCode.value) / 100;
      } else {
        totalDiscount += appliedPromoCode.value;
      }
    }

    return totalDiscount;
  }, [cart, cartSubtotal, discountRules, appliedPromoCode]);

  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (!code) return;

    const rule = discountRules?.find(r => r.isActive && r.type === 'promo_code' && r.code === code);
    if (rule) {
      setAppliedPromoCode(rule);
      setPromoCodeInput('');
      toast({ title: "Promo Applied", description: `${rule.name} discount activated.` });
    } else {
      toast({ title: "Invalid Code", description: "This promo code is not active or incorrect.", variant: "destructive" });
    }
  };

  const handleSyncOrders = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast({
        title: "Sync Simulation Complete",
        description: "Checked Zomato & Swiggy. No new digital orders to pull.",
      });
    }, 2000);
  };

  const { subtotal, gstAmount, total } = useMemo(() => {
    const percentage = shopProfile?.gstPercentage || 0;
    const isEnabled = !!shopProfile?.gstEnabled;
    const isIncluded = !!shopProfile?.gstIncluded;
    const baseAmount = Math.max(0, cartSubtotal - discountDetails);

    if (!isEnabled || percentage === 0) {
      return { subtotal: baseAmount, gstAmount: 0, total: baseAmount };
    }

    if (isIncluded) {
      const gstAmt = baseAmount - (baseAmount / (1 + (percentage / 100)));
      return {
        subtotal: baseAmount - gstAmt,
        gstAmount: gstAmt,
        total: baseAmount
      };
    } else {
      const gstAmt = (baseAmount * percentage) / 100;
      return {
        subtotal: baseAmount,
        gstAmount: gstAmt,
        total: baseAmount + gstAmt
      };
    }
  }, [cartSubtotal, discountDetails, shopProfile]);

  const generateSerialNumber = () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const sequence = Math.floor(1000 + Math.random() * 9000); 
    return `${yy}${mm}${dd}${sequence}`;
  };

  const handleCheckout = async (print: boolean) => {
    if (cart.length === 0 || !db || !user || !paymentMethod) {
      if (!paymentMethod) {
        toast({ 
          title: "Payment Method Required", 
          description: "Please select Cash or UPI before saving.", 
          variant: "destructive" 
        });
      }
      return;
    }
    
    const serialNumber = generateSerialNumber();
    
    const currentFortune = shopProfile?.fortunes && shopProfile.fortunes.length > 0
      ? shopProfile.fortunes[shopProfile.nextFortuneIndex ?? 0]
      : null;

    const transactionData = {
      serialNumber,
      date: new Date().toISOString(),
      timestamp: serverTimestamp(),
      items: cart.map(item => ({ 
        id: item.id || '', 
        name: item.name, 
        price: item.price, 
        quantity: item.quantity 
      })),
      total: subtotal,
      gstAmount: gstAmount,
      discount: discountDetails,
      finalAmount: total,
      paymentMethod: paymentMethod,
      paymentStatus: 'Paid' as const,
      fortune: currentFortune ?? null // Ensure no undefined values are sent to Firestore
    };

    if (print) {
      setIsPrinting(true);
      setPrintingData({ transaction: transactionData, profile: shopProfile || null });
      await new Promise(resolve => setTimeout(resolve, 500));

      const paperW = shopProfile?.paperWidth || '80mm';
      const pdfW = parseInt(paperW);

      if (shopProfile?.printerType === 'browser') {
        window.print();
      } else {
        try {
          const { default: jsPDF } = await import('jspdf');
          const { default: html2canvas } = await import('html2canvas');
          if (printRef.current) {
            const canvas = await html2canvas(printRef.current, { scale: 3, useCORS: true, logging: false, backgroundColor: '#ffffff', removeContainer: true });
            const imgData = canvas.toDataURL('image/png');
            const pdfHeight = (canvas.height * pdfW) / canvas.width;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfW, pdfHeight] });
            pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfHeight);
            pdf.save(`bill-${serialNumber}.pdf`);
          }
        } catch (err) {
          window.print();
        }
      }
      setTimeout(() => { setIsPrinting(false); setPrintingData(null); }, 500);
    }

    const transactionsRef = collection(db, 'users', user.uid, 'transactions');
    addDocumentNonBlocking(transactionsRef, transactionData)
      .then(() => {
        if (shopProfile?.fortunes && shopProfile.fortunes.length > 0 && shopRef) {
          const nextIdx = ((shopProfile.nextFortuneIndex ?? 0) + 1) % shopProfile.fortunes.length;
          updateDocumentNonBlocking(shopRef, { nextFortuneIndex: nextIdx });
        }
        toast({ title: "Transaction Saved", description: `Bill ${serialNumber} recorded as ${paymentMethod}.` });
        setCart([]);
        setAppliedPromoCode(null);
        setPaymentMethod(null);
      })
      .catch(async () => {
        const permissionError = new FirestorePermissionError({ path: `users/${user.uid}/transactions`, operation: 'create', requestResourceData: transactionData });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64 flex flex-col">
      <div className="print:hidden">
        <Sidebar />
        <MobileNav />
      </div>
      <main className="flex-1 flex flex-col md:flex-row h-screen print:hidden overflow-hidden">
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          <header className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold">New Sale</h2>
              <div className="flex items-center gap-3">
                {shopProfile?.aggregatorsEnabled && (
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex h-9 gap-2 font-bold text-xs shadow-md" 
                    onClick={handleSyncOrders}
                    disabled={isSyncing}
                  >
                    {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                    Sync Online
                    <Badge variant="secondary" className="ml-1 px-1 h-4 text-[8px] bg-white/20 text-white border-none">SIM</Badge>
                  </Button>
                )}
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search products..." 
                    className="pl-9 bg-card border-none shadow-sm h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button 
                variant={selectedCategory === 'All' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('All')}
                className="rounded-full"
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button 
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="rounded-full whitespace-nowrap"
                >
                  {cat}
                </Button>
              ))}
            </div>
          </header>

          {loading ? (
            <div className="flex justify-center p-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-muted-foreground opacity-50">
              <Inbox className="w-12 h-12 mb-4" />
              <p>No products available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id} 
                  className="group hover:shadow-md transition-all border-none bg-card cursor-pointer overflow-hidden active:scale-95"
                  onClick={() => addToCart(product)}
                >
                  <div className="h-28 bg-muted relative overflow-hidden">
                    {product.imageUrl ? (
                      <Image 
                        src={product.imageUrl} 
                        alt={product.name} 
                        fill 
                        className="object-cover group-hover:scale-110 transition-transform" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-6 h-6 opacity-20" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-primary font-bold shadow-sm">Rs.{product.price}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <h4 className="font-bold text-sm truncate">{product.name}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{product.category}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="w-full md:w-96 bg-card border-l border-border flex flex-col shadow-xl">
          <CardHeader className="border-b border-border bg-muted/20">
            <CardTitle className="flex items-center justify-between font-headline">
              Current Bill
              <ShoppingBag className="w-5 h-5 text-primary" />
            </CardTitle>
          </CardHeader>
          
          <div className="relative flex-1 min-h-0 flex flex-col">
            <ScrollArea ref={scrollAreaRef} className="flex-1 w-full">
              <div className="p-4 space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-20">
                    <Receipt className="w-12 h-12 mb-4" />
                    <p>No items added yet</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg animate-in fade-in slide-in-from-right-2">
                      <div className="w-10 h-10 rounded-md overflow-hidden relative flex-shrink-0 bg-muted">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 opacity-20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">Rs.{item.price} x {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => updateQuantity(item.id!, -1)}
                          className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-muted"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id!, 1)}
                          className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center hover:bg-muted"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => removeFromCart(item.id!)}
                          className="ml-2 text-destructive hover:opacity-70"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <ScrollBar orientation="vertical" className="bg-muted/50 opacity-100" />
            </ScrollArea>
          </div>

          <div className="p-6 border-t border-border bg-muted/10 space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Payment Method</Label>
                {!paymentMethod && cart.length > 0 && (
                  <Badge variant="destructive" className="h-4 text-[8px] animate-pulse">Select Required</Badge>
                )}
              </div>
              <RadioGroup 
                value={paymentMethod || ''} 
                onValueChange={(val: any) => setPaymentMethod(val)}
                className="grid grid-cols-2 gap-3"
              >
                <div className={cn(
                  "flex items-center space-x-2 bg-background p-3 rounded-lg border-2 transition-all relative overflow-hidden cursor-pointer",
                  paymentMethod === 'Cash' 
                    ? "border-primary bg-primary/10 shadow-md scale-[1.02]" 
                    : "border-border hover:border-primary/30"
                )}>
                  <RadioGroupItem value="Cash" id="cash" className="sr-only" />
                  <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer w-full text-sm font-bold justify-center">
                    <Banknote className={cn("w-4 h-4", paymentMethod === 'Cash' ? "text-primary" : "text-muted-foreground")} /> 
                    Cash
                    {paymentMethod === 'Cash' && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </Label>
                </div>
                <div className={cn(
                  "flex items-center space-x-2 bg-background p-3 rounded-lg border-2 transition-all relative overflow-hidden cursor-pointer",
                  paymentMethod === 'UPI' 
                    ? "border-primary bg-primary/10 shadow-md scale-[1.02]" 
                    : "border-border hover:border-primary/30"
                )}>
                  <RadioGroupItem value="UPI" id="upi" className="sr-only" />
                  <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer w-full text-sm font-bold justify-center">
                    <Wallet className={cn("w-4 h-4", paymentMethod === 'UPI' ? "text-primary" : "text-muted-foreground")} /> 
                    UPI
                    {paymentMethod === 'UPI' && <Check className="w-3 h-3 text-primary ml-auto" />}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Ticket className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Enter promo..." 
                    className="pl-9 h-8 text-xs bg-background"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value)}
                  />
                </div>
                <Button size="sm" variant="outline" className="h-8" onClick={handleApplyPromo}>Apply</Button>
              </div>
              {appliedPromoCode && (
                <div className="flex items-center justify-between bg-primary/5 p-2 rounded border border-primary/20 animate-in slide-in-from-top-2">
                  <span className="text-xs font-bold text-primary flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {appliedPromoCode.code}
                  </span>
                  <button onClick={() => setAppliedPromoCode(null)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs.{cartSubtotal.toFixed(2)}</span>
              </div>
              {discountDetails > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Discount</span>
                  <span className="text-green-600">-Rs.{discountDetails.toFixed(2)}</span>
                </div>
              )}
              {gstAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST ({shopProfile?.gstPercentage}%)</span>
                  <span>{shopProfile?.gstIncluded ? '(Incl.)' : '+'}Rs.{gstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-border pt-2">
                <span className="font-headline">Total</span>
                <span className="text-accent">Rs.{total.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="w-full" onClick={() => { setCart([]); setAppliedPromoCode(null); setPaymentMethod(null); }}>
                  Clear
                </Button>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90" 
                  onClick={() => handleCheckout(false)} 
                  disabled={cart.length === 0 || !paymentMethod}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
              <Button 
                className="w-full bg-accent hover:bg-accent/90" 
                onClick={() => handleCheckout(true)} 
                disabled={cart.length === 0 || isPrinting || !paymentMethod}
              >
                {isPrinting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="w-4 h-4 mr-2" />
                )}
                Print Bill
              </Button>
              {!paymentMethod && cart.length > 0 && (
                <div className="flex items-center justify-center gap-1 text-[10px] text-destructive font-bold uppercase tracking-tighter">
                  <AlertCircle className="w-3 h-3" /> Select payment method to proceed
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="fixed -left-[5000px] top-0 overflow-hidden bg-white print:static print:left-0 print:block print:w-full print:bg-white">
        {printingData && (
          <div 
            ref={printRef}
            className="bg-white text-black p-6 font-mono leading-relaxed print:p-0" 
            style={{ width: printingData.profile?.paperWidth || '80mm', minHeight: 'auto', display: 'block' }}
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold uppercase text-black mb-1">{printingData.profile?.shopName || 'BUSINESS NAME'}</h1>
              {printingData.profile?.address && <p className="text-[11px] text-black px-4">{printingData.profile.address}</p>}
              {printingData.profile?.phone && <p className="text-[11px] text-black">Ph: {printingData.profile.phone}</p>}
              {printingData.profile?.gstEnabled && printingData.profile?.gstNumber && (
                <p className="text-[11px] text-black">GST: {printingData.profile.gstNumber}</p>
              )}
              {printingData.profile?.fssaiEnabled && printingData.profile?.fssaiNumber && (
                <p className="text-[11px] text-black italic">FSSAI Lic No: {printingData.profile.fssaiNumber}</p>
              )}
            </div>
            <div className="border-b border-dashed border-black mb-4"></div>
            <div className="space-y-1 mb-4 px-1">
              {printingData.transaction.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-[12px] text-black">
                  <span className="flex-1 pr-4">{item.name} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                  <span className="whitespace-nowrap font-bold">Rs.{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-b border-dashed border-black mb-4"></div>
            <div className="space-y-1 text-[12px] text-black px-1">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span>Rs.{printingData.transaction.total.toFixed(2)}</span>
              </div>
              {printingData.transaction.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-Rs.{printingData.transaction.discount.toFixed(2)}</span>
                </div>
              )}
              {printingData.transaction.gstAmount > 0 && (
                <div className="flex justify-between">
                  <span>GST ({printingData.profile?.gstPercentage}%) {printingData.profile?.gstIncluded ? '(Incl.)' : ''}</span>
                  <span>Rs.{printingData.transaction.gstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t border-dotted border-black">
                <span>TOTAL</span>
                <span>Rs.{printingData.transaction.finalAmount.toFixed(2)}</span>
              </div>
              <div className="text-center font-bold text-[10px] mt-1 uppercase">Paid via {printingData.transaction.paymentMethod}</div>
            </div>
            <div className="border-b border-dashed border-black my-6"></div>
            <div className="text-[10px] space-y-2 text-black text-center">
              {printingData.profile?.billFooter && <p className="font-bold text-sm">{printingData.profile.billFooter}</p>}
              {printingData.transaction.fortune && (
                <div className="border-y border-black py-2 my-2">
                  <p className="italic text-[11px]">"{printingData.transaction.fortune}"</p>
                </div>
              )}
              <p>Date: {format(new Date(), 'MM/dd/yyyy HH:mm')}</p>
              <p>ID: {printingData.transaction.serialNumber}</p>
            </div>
            <div className="h-8"></div>
          </div>
        )}
      </div>
    </div>
  );
}
