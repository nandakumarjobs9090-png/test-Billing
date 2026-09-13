
"use client";

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Plus, Tag, Trash2, Edit2, Loader2, Inbox, 
  Percent, DollarSign, Package, BadgePercent, CheckCircle2, XCircle
} from 'lucide-react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { DiscountRule, Product } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function DiscountsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const discountsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'discounts');
  }, [db, user]);

  const productsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'products');
  }, [db, user]);

  const { data: discounts, loading } = useCollection<DiscountRule>(discountsRef);
  const { data: products } = useCollection<Product>(productsRef);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<DiscountRule>>({
    name: '',
    type: 'total_amount',
    valueType: 'percentage',
    value: 0,
    minAmount: 0,
    productId: '',
    code: '',
    isActive: true
  });

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'total_amount',
      valueType: 'percentage',
      value: 0,
      minAmount: 0,
      productId: '',
      code: '',
      isActive: true
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (rule: DiscountRule) => {
    setEditingId(rule.id!);
    setFormData({ ...rule });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!db || !discountsRef || !user) return;
    if (!formData.name || !formData.type || formData.value === undefined) {
      toast({ title: "Validation Error", description: "Name, type and value are required.", variant: "destructive" });
      return;
    }

    if (editingId) {
      const docRef = doc(db, 'users', user.uid, 'discounts', editingId);
      updateDocumentNonBlocking(docRef, formData);
      toast({ title: "Rule Updated", description: "Discount rule has been modified." });
    } else {
      addDocumentNonBlocking(discountsRef, formData);
      toast({ title: "Rule Added", description: "New discount rule created." });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!db || !user) return;
    const docRef = doc(db, 'users', user.uid, 'discounts', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Deleted", description: "Discount rule removed." });
  };

  const toggleStatus = (rule: DiscountRule) => {
    if (!db || !user || !rule.id) return;
    const docRef = doc(db, 'users', user.uid, 'discounts', rule.id);
    updateDocumentNonBlocking(docRef, { isActive: !rule.isActive });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
      <Sidebar />
      <MobileNav />
      <main className="p-6 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-headline font-bold">Discounts & Offers</h2>
            <p className="text-muted-foreground">Configure total bill discounts, product deals, and promo codes.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Discount Rule
          </Button>
        </header>

        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !discounts || discounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
            <Tag className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">No discount rules found.</p>
            <p className="text-sm">Apply automatic discounts to increase sales.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {discounts.map((rule) => (
              <Card key={rule.id} className="border-none shadow-sm overflow-hidden group">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={rule.isActive ? 'default' : 'secondary'} className="gap-1">
                      {rule.isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {rule.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(rule)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(rule.id!)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <CardTitle className="text-xl font-headline mt-2">{rule.name}</CardTitle>
                  <CardDescription>
                    {rule.type === 'total_amount' && `Min. Bill: Rs.${rule.minAmount}`}
                    {rule.type === 'product' && `Item: ${products?.find(p => p.id === rule.productId)?.name || 'Unknown'}`}
                    {rule.type === 'promo_code' && `Code: ${rule.code}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        {rule.valueType === 'percentage' ? <Percent className="w-5 h-5" /> : <BadgePercent className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-2xl">
                          {rule.valueType === 'percentage' ? `${rule.value}%` : `Rs.${rule.value}`}
                        </p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Discount Value</p>
                      </div>
                    </div>
                    <Switch checked={rule.isActive} onCheckedChange={() => toggleStatus(rule)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-headline">{editingId ? 'Edit Discount' : 'New Discount'}</DialogTitle>
              <DialogDescription>Setup rules to reward your customers.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Rule Name</Label>
                <Input placeholder="e.g. Festival Offer" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Discount Type</Label>
                  <Select value={formData.type} onValueChange={(val: any) => setFormData({...formData, type: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total_amount">Total Bill Amount</SelectItem>
                      <SelectItem value="product">Specific Product</SelectItem>
                      <SelectItem value="promo_code">Promo Code</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Value Type</Label>
                  <Select value={formData.valueType} onValueChange={(val: any) => setFormData({...formData, valueType: val})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Discount Value</Label>
                <Input type="number" value={formData.value} onChange={e => setFormData({...formData, value: Number(e.target.value)})} />
              </div>

              {formData.type === 'total_amount' && (
                <div className="grid gap-2">
                  <Label>Minimum Bill Amount (Rs.)</Label>
                  <Input type="number" value={formData.minAmount} onChange={e => setFormData({...formData, minAmount: Number(e.target.value)})} />
                </div>
              )}

              {formData.type === 'product' && (
                <div className="grid gap-2">
                  <Label>Select Product</Label>
                  <Select value={formData.productId} onValueChange={(val) => setFormData({...formData, productId: val})}>
                    <SelectTrigger><SelectValue placeholder="Choose product..." /></SelectTrigger>
                    <SelectContent>
                      {products?.map(p => (
                        <SelectItem key={p.id} value={p.id!}>{p.name} (Rs.{p.price})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.type === 'promo_code' && (
                <div className="grid gap-2">
                  <Label>Promo Code</Label>
                  <Input placeholder="e.g. WELCOME50" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button className="w-full" onClick={handleSave}>Save Discount Rule</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
