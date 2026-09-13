
"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, Loader2, Printer, Layers } from 'lucide-react';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ShopProfile } from '@/lib/types';

export default function PrinterPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const shopRef = useMemoFirebase(() => {
    if (!db || !user) return null;
    return doc(db, 'users', user.uid, 'settings', 'shop');
  }, [db, user]);
  
  const { data: shopData, isLoading } = useDoc<ShopProfile>(shopRef);
  
  const [formData, setFormData] = useState<ShopProfile>({
    shopName: '',
    printerType: 'pdf',
    paperWidth: '80mm',
    autoPrintEnabled: false,
    connectedPrinterName: ''
  });

  useEffect(() => {
    if (shopData) {
      setFormData(prev => ({
        ...prev,
        ...shopData,
        printerType: shopData.printerType || 'pdf',
        paperWidth: shopData.paperWidth || '80mm'
      }));
    }
  }, [shopData]);

  const handleSave = () => {
    if (!db || !shopRef) return;
    
    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(([_, v]) => v !== undefined)
    );
    
    setDocumentNonBlocking(shopRef, cleanData, { merge: true });
    toast({
      title: "Settings Updated",
      description: "Printer and system configuration has been saved."
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
      <Sidebar />
      <MobileNav />
      <main className="p-6 md:p-8 max-w-2xl mx-auto">
        <header className="mb-8">
          <h2 className="text-3xl font-headline font-bold">System & Printer</h2>
          <p className="text-muted-foreground">Manage printing preferences and billing settings.</p>
        </header>

        {isLoading || !user ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2 font-headline">
                  <Printer className="w-5 h-5 text-primary" />
                  Print Method
                </CardTitle>
                <CardDescription>Choose how you want to generate and send bills.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <RadioGroup 
                  value={formData.printerType} 
                  onValueChange={(val: any) => setFormData({...formData, printerType: val})}
                  className="grid gap-4"
                >
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="browser" id="browser" />
                    <Label htmlFor="browser" className="flex flex-col cursor-pointer">
                      <span className="font-bold">Browser Print Dialog (Thermal Mode)</span>
                      <span className="text-xs text-muted-foreground">Uses the system print engine. Best for thermal printers with drivers installed.</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="pdf" id="pdf" />
                    <Label htmlFor="pdf" className="flex flex-col cursor-pointer">
                      <span className="font-bold">Download PDF</span>
                      <span className="text-xs text-muted-foreground">Generates a thermal-styled PDF document for manual printing.</span>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2 font-headline">
                  <Layers className="w-5 h-5 text-primary" />
                  Paper Size
                </CardTitle>
                <CardDescription>Configure the width of your thermal paper.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <RadioGroup 
                  value={formData.paperWidth} 
                  onValueChange={(val: any) => setFormData({...formData, paperWidth: val})}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                >
                  <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="58mm" id="w58" />
                    <Label htmlFor="w58" className="font-bold cursor-pointer">58mm</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="80mm" id="w80" />
                    <Label htmlFor="w80" className="font-bold cursor-pointer">80mm</Label>
                  </div>
                  <div className="flex items-center space-x-2 border p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="110mm" id="w110" />
                    <Label htmlFor="w110" className="font-bold cursor-pointer">110mm</Label>
                  </div>
                </RadioGroup>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                  Note: 80mm is standard for most counter printers. 58mm is used for handheld/mobile devices.
                </p>
              </CardContent>
            </Card>

            <Button onClick={handleSave} className="w-full bg-primary hover:bg-primary/90 h-12 text-lg font-bold shadow-lg">
              <Save className="w-5 h-5 mr-2" />
              Save System Settings
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
