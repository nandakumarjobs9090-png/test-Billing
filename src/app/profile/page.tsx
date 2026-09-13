"use client";

import { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Save, Store, MapPin, Phone, Mail, FileText, Loader2, 
  Landmark, Upload, Quote, ShieldCheck, Globe
} from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ShopProfile } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const fortuneFileRef = useRef<HTMLInputElement>(null);
  
  const shopRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'settings', 'shop');
  }, [db, user]);
  
  const { data: shopData, isLoading } = useDoc<ShopProfile>(shopRef);
  
  const [formData, setFormData] = useState<any>({
    shopName: '',
    address: '',
    phone: '',
    email: '',
    billFooter: 'Thank you for your business!',
    gstEnabled: false,
    gstNumber: '',
    gstPercentage: 0,
    gstIncluded: false,
    fssaiEnabled: false,
    fssaiNumber: '',
    fortunes: [],
    nextFortuneIndex: 0,
    printerType: 'pdf',
    zomatoApiKey: '',
    swiggyApiKey: '',
    aggregatorsEnabled: false
  });

  const [pastedJson, setPastedJson] = useState('');

  useEffect(() => {
    if (shopData) {
      setFormData({ ...formData, ...shopData });
      if (shopData.fortunes) {
        setPastedJson(JSON.stringify(shopData.fortunes, null, 2));
      }
    }
  }, [shopData]);

  const handleSave = () => {
    if (!db || !shopRef) return;
    
    if (!formData.shopName) {
      toast({ title: "Validation Error", description: "Shop Name is required.", variant: "destructive" });
      return;
    }

    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== undefined)
    );

    setDocumentNonBlocking(shopRef, cleanData, { merge: true });
    toast({ title: "Profile Updated", description: "Your shop details have been saved successfully." });
  };

  const validateAndSetFortunes = (data: any) => {
    if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
      setFormData((prev: any) => ({ ...prev, fortunes: data, nextFortuneIndex: 0 }));
      setPastedJson(JSON.stringify(data, null, 2));
      return true;
    }
    return false;
  };

  const handleFortuneUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (validateAndSetFortunes(json)) {
          toast({ title: "Fortunes Loaded", description: `Successfully loaded ${json.length} fortunes.` });
        } else {
          throw new Error("Invalid format");
        }
      } catch (err) {
        toast({ title: "Upload Failed", description: "Please upload a valid JSON file (array of strings).", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fortuneFileRef.current) fortuneFileRef.current.value = '';
  };

  const handleApplyPastedJson = () => {
    try {
      const json = JSON.parse(pastedJson);
      if (validateAndSetFortunes(json)) {
        toast({ title: "JSON Applied", description: `Ready to save ${json.length} fortunes.` });
      } else {
        throw new Error("Invalid format");
      }
    } catch (err) {
      toast({ title: "Invalid JSON", description: "Please enter a valid JSON array of strings.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
      <Sidebar />
      <MobileNav />
      <main className="p-6 md:p-8 max-w-2xl mx-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-headline font-bold">Shop Profile</h2>
          <p className="text-muted-foreground">Manage the details that appear on your bills and reports.</p>
        </header>

        {isLoading || !user ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 pb-20">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                  <Store className="w-5 h-5 text-primary" />
                  Business Information
                </CardTitle>
                <CardDescription>This information will be used for bill generation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="shopName">Shop Name</Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="shopName" 
                        placeholder="e.g. Traditional Tea Stall" 
                        className="pl-10"
                        value={formData.shopName}
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="address">Physical Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Textarea 
                        id="address" 
                        placeholder="Shop No. 12, Main Street, MG Road..." 
                        className="pl-10 min-h-[100px]"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Contact Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          placeholder="+91 98765 43210" 
                          className="pl-10"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          type="email" 
                          placeholder="hello@shop.com" 
                          className="pl-10"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="footer">Bill Footer Message</Label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Textarea 
                        id="footer" 
                        placeholder="Thank you for visiting! Come again." 
                        className="pl-10"
                        value={formData.billFooter}
                        onChange={(e) => setFormData({ ...formData, billFooter: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 font-headline">
                      <Globe className="w-5 h-5 text-primary" />
                      Online Aggregators
                    </CardTitle>
                    <CardDescription>Integrate Zomato and Swiggy APIs.</CardDescription>
                  </div>
                  <Switch 
                    checked={formData.aggregatorsEnabled} 
                    onCheckedChange={(checked) => setFormData({ ...formData, aggregatorsEnabled: checked })} 
                  />
                </div>
              </CardHeader>
              {formData.aggregatorsEnabled && (
                <CardContent className="pt-4 space-y-4">
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Zomato API Key</Label>
                      <Input 
                        type="password"
                        placeholder="Enter Zomato Merchant API Key" 
                        value={formData.zomatoApiKey} 
                        onChange={(e) => setFormData({ ...formData, zomatoApiKey: e.target.value })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Swiggy API Key</Label>
                      <Input 
                        type="password"
                        placeholder="Enter Swiggy Merchant API Key" 
                        value={formData.swiggyApiKey} 
                        onChange={(e) => setFormData({ ...formData, swiggyApiKey: e.target.value })} 
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">
                      Note: Integration requires an active merchant account and stable internet connection.
                    </p>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline">
                  <Quote className="w-5 h-5 text-primary" />
                  Bill Fortunes
                </CardTitle>
                <CardDescription>Cycle through fortunes on your bills.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Button variant="outline" size="sm" onClick={() => fortuneFileRef.current?.click()} className="gap-2">
                      <Upload className="w-4 h-4" /> Upload File
                    </Button>
                    <input type="file" ref={fortuneFileRef} className="hidden" accept=".json" onChange={handleFortuneUpload} />
                    {formData.fortunes && formData.fortunes.length > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {formData.fortunes.length} Fortunes Active
                      </Badge>
                    )}
                  </div>
                  <Textarea 
                    placeholder='["May your tea be hot", "Happiness is brewing..."]'
                    className="font-code text-xs min-h-[120px] bg-muted/30"
                    value={pastedJson}
                    onChange={(e) => setPastedJson(e.target.value)}
                  />
                  <Button variant="secondary" size="sm" className="w-full" onClick={handleApplyPastedJson}>
                    Verify & Apply
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 font-headline">
                      <Landmark className="w-5 h-5 text-primary" /> GST Configuration
                    </CardTitle>
                  </div>
                  <Switch 
                    checked={formData.gstEnabled} 
                    onCheckedChange={(checked) => setFormData({ ...formData, gstEnabled: checked })} 
                  />
                </div>
              </CardHeader>
              {formData.gstEnabled && (
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>GST Number</Label>
                      <Input 
                        placeholder="GST Number" 
                        value={formData.gstNumber} 
                        onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Percentage (%)</Label>
                      <Input 
                        type="number" 
                        placeholder="Percentage (%)" 
                        value={formData.gstPercentage} 
                        onChange={(e) => setFormData({ ...formData, gstPercentage: Number(e.target.value) })} 
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                      id="gstIncluded" 
                      checked={formData.gstIncluded} 
                      onCheckedChange={(checked) => setFormData({ ...formData, gstIncluded: !!checked })} 
                    />
                    <Label htmlFor="gstIncluded" className="text-sm font-medium leading-none cursor-pointer">
                      GST is included in product prices
                    </Label>
                  </div>
                </CardContent>
              )}
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 font-headline">
                      <ShieldCheck className="w-5 h-5 text-primary" /> FSSAI Configuration
                    </CardTitle>
                  </div>
                  <Switch 
                    checked={formData.fssaiEnabled} 
                    onCheckedChange={(checked) => setFormData({ ...formData, fssaiEnabled: checked })} 
                  />
                </div>
              </CardHeader>
              {formData.fssaiEnabled && (
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <Label>FSSAI License Number</Label>
                    <Input 
                      placeholder="Enter 14-digit FSSAI Number" 
                      value={formData.fssaiNumber} 
                      onChange={(e) => setFormData({ ...formData, fssaiNumber: e.target.value })} 
                    />
                  </div>
                </CardContent>
              )}
            </Card>

            <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-bold shadow-lg">
              <Save className="w-5 h-5 mr-2" /> Save All Profile Settings
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
