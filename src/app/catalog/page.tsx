"use client";

import { useState, useMemo, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Search, Edit2, Trash2, Inbox, Loader2, ImageIcon, Upload, Link as LinkIcon } from 'lucide-react';
import { Product } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import Image from 'next/image';

const DEFAULT_CATEGORIES = ['Tea', 'Snacks', 'Beverages', 'Combos'];

export default function CatalogPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const productsRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return collection(db, 'users', user.uid, 'products');
  }, [db, user]);
  
  const { data, loading } = useCollection<Product>(productsRef);
  const products = data || [];
  
  const uniqueCategories = useMemo(() => {
    const cats = new Set(DEFAULT_CATEGORIES);
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).sort();
  }, [products]);

  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    category: 'Beverages',
    newCategory: '',
    imageUrl: ''
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({ name: '', price: '', stock: '', category: 'Beverages', newCategory: '', imageUrl: '' });
    setIsAddingNewCategory(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingId(product.id || null);
    setFormData({
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      category: product.category,
      newCategory: '',
      imageUrl: product.imageUrl || ''
    });
    setIsAddingNewCategory(false);
    setIsDialogOpen(true);
  };

  const handleSaveProduct = () => {
    if (!db || !productsRef || !user) return;
    if (!formData.name || !formData.price) {
      toast({ title: "Validation Error", description: "Name and Price are required.", variant: "destructive" });
      return;
    }

    const finalCategory = isAddingNewCategory && formData.newCategory 
      ? formData.newCategory.trim() 
      : formData.category;

    const productPayload = {
      name: formData.name.trim(),
      price: parseFloat(formData.price) || 0,
      stock: parseInt(formData.stock) || 0,
      category: finalCategory,
      imageUrl: formData.imageUrl.trim()
    };

    if (editingId) {
      const docRef = doc(db, 'users', user.uid, 'products', editingId);
      updateDocumentNonBlocking(docRef, productPayload);
      toast({ title: "Product Updated", description: `${formData.name} was successfully updated.` });
    } else {
      addDocumentNonBlocking(productsRef, productPayload);
      toast({ title: "Product Saved", description: `${formData.name} was added to your catalog.` });
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (!db || !user) return;
    const docRef = doc(db, 'users', user.uid, 'products', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Product Deleted", description: "The product was removed from catalog." });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Please upload an image smaller than 2MB.", variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
      <Sidebar />
      <MobileNav />
      <main className="p-6 md:p-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-3xl font-headline font-bold">Product Catalog</h2>
            <p className="text-muted-foreground">Manage your product offerings, prices, and stock inventory.</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90 font-bold gap-2" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4" />
            Add New Product
          </Button>

          {/* Add / Edit Product Modal */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-headline text-2xl">
                  {editingId ? 'Edit Product' : 'Add New Product'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid gap-2">
                  <Label htmlFor="name" className="font-bold">Product Name</Label>
                  <Input 
                    id="name" 
                    placeholder="e.g. Masala Chai, Cold Coffee, Samosa" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="price" className="font-bold">Price (Rs.)</Label>
                    <Input 
                      id="price" 
                      type="number" 
                      placeholder="40" 
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="stock" className="font-bold">Stock Level</Label>
                    <Input 
                      id="stock" 
                      type="number" 
                      placeholder="100" 
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label className="font-bold">Category</Label>
                  {isAddingNewCategory ? (
                    <div className="flex gap-2">
                      <Input 
                        placeholder="New category name"
                        value={formData.newCategory}
                        onChange={(e) => setFormData({...formData, newCategory: e.target.value})}
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        onClick={() => setIsAddingNewCategory(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Select 
                      value={formData.category} 
                      onValueChange={(val) => {
                        if (val === 'ADD_NEW_CATEGORY') {
                          setIsAddingNewCategory(true);
                        } else {
                          setFormData({...formData, category: val});
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="ADD_NEW_CATEGORY" className="font-bold text-primary">
                          + Add New Category...
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                
                {/* Product Image Section with Paste URL & Device Upload */}
                <div className="grid gap-3 border-t pt-4 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="imageUrl" className="text-sm font-bold flex items-center gap-1.5">
                      <LinkIcon className="w-4 h-4 text-primary" />
                      Paste Image URL / Web Link
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="imageUrl"
                        type="url"
                        placeholder="https://images.unsplash.com/photo-..."
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                        className="text-xs"
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="h-10 text-xs gap-1.5 shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Upload File
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Paste any web image URL or click Upload File to select an image from your computer.
                    </p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileChange}
                    />
                  </div>

                  {formData.imageUrl && (
                    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-muted border group shadow-inner">
                      <Image 
                        src={formData.imageUrl} 
                        alt="Preview" 
                        fill 
                        className="object-contain" 
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="gap-2 font-bold"
                          onClick={handleRemoveImage}
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove Image
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSaveProduct} className="w-full font-bold">
                  {editingId ? 'Update Product' : 'Save Product'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search products in catalog..." 
            className="pl-10 max-w-md bg-card border-none shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-muted-foreground bg-card rounded-xl border-2 border-dashed border-border">
            <Inbox className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">Your catalog is empty.</p>
            <p className="text-sm">Click "Add New Product" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="border-none shadow-sm bg-card hover:shadow-md transition-all overflow-hidden group">
                <div className="relative h-36 bg-muted overflow-hidden">
                  {product.imageUrl ? (
                    <Image 
                      src={product.imageUrl} 
                      alt={product.name} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-300" 
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-8 h-8 opacity-20" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-8 w-8 bg-white/90 backdrop-blur-sm shadow-sm"
                      onClick={() => handleOpenEdit(product)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8 shadow-sm"
                      onClick={() => handleDelete(product.id!)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg truncate">{product.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">{product.category}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed pt-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Price</p>
                      <p className="font-bold text-primary">Rs.{product.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Stock</p>
                      <p className="font-bold">{product.stock}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
