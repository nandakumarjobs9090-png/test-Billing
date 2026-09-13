"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  UserCircle, Mail, Monitor, LogOut, 
  Loader2, CheckCircle2, Fingerprint, Globe, Sparkles, Key
} from 'lucide-react';
import { useUser, useFirebaseApp } from '@/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { OpenRouterSettingsDialog } from '@/components/OpenRouterSettingsDialog';
import { getOpenRouterApiKey, getSelectedFreeModel } from '@/lib/openrouter';

export default function AccountPage() {
  const { user, isUserLoading } = useUser();
  const app = useFirebaseApp();
  const auth = getAuth(app);
  const { toast } = useToast();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isOpenRouterOpen, setIsOpenRouterOpen] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [deviceInfo, setDeviceInfo] = useState({ os: 'Unknown OS', browser: 'Unknown Browser' });

  useEffect(() => {
    // Client-side info check
    const ua = window.navigator.userAgent;
    let os = "Unknown OS";
    if (ua.indexOf("Win") !== -1) os = "Windows";
    if (ua.indexOf("Mac") !== -1) os = "MacOS";
    if (ua.indexOf("Linux") !== -1) os = "Linux";
    if (ua.indexOf("Android") !== -1) os = "Android";
    if (ua.indexOf("like Mac") !== -1) os = "iOS";

    let browser = "Unknown Browser";
    if (ua.indexOf("Chrome") !== -1) browser = "Google Chrome";
    else if (ua.indexOf("Firefox") !== -1) browser = "Mozilla Firefox";
    else if (ua.indexOf("Safari") !== -1) browser = "Apple Safari";
    else if (ua.indexOf("Edge") !== -1) browser = "Microsoft Edge";

    setDeviceInfo({ os, browser });
    setOpenRouterKey(getOpenRouterApiKey());
    setSelectedModel(getSelectedFreeModel());
  }, []);

  const handleRemoveDevice = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      toast({
        title: "Device Removed",
        description: "You have been logged out from this device successfully.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoggingOut(false);
    }
  };

  const getSignInProvider = () => {
    if (!user) return 'Unknown';
    const provider = user.providerData[0]?.providerId;
    if (provider === 'google.com') return 'Google Account';
    if (provider === 'password') return 'Email & Password';
    if (user.isAnonymous) return 'Guest Session';
    return provider || 'Custom Provider';
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
      <Sidebar />
      <MobileNav />
      <main className="p-6 md:p-8 max-w-2xl mx-auto">
        <header className="mb-8 text-center md:text-left">
          <h2 className="text-3xl font-headline font-bold">Account Settings</h2>
          <p className="text-muted-foreground">Manage your credentials, AI integration keys, and active sessions.</p>
        </header>

        {isUserLoading || !user ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* OpenRouter AI Settings Card */}
            <Card className="border-none shadow-sm overflow-hidden border-l-4 border-l-primary">
              <CardHeader className="bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 font-headline">
                      <Sparkles className="w-5 h-5 text-primary" />
                      OpenRouter Free AI Key
                    </CardTitle>
                    <CardDescription>Configure OpenRouter API key to access free AI models.</CardDescription>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="gap-2 font-bold text-xs"
                    onClick={() => setIsOpenRouterOpen(true)}
                  >
                    <Key className="w-4 h-4 text-primary" />
                    Configure Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                  <div>
                    <p className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Key Status</p>
                    <p className="font-bold text-sm">
                      {openRouterKey ? "Key Configured (••••••••)" : "No Key Configured"}
                    </p>
                  </div>
                  {openRouterKey ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Ready</Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">Free Models Only</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="font-bold">Active Free Model:</span>
                  <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">{selectedModel}</code>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2 font-headline">
                  <UserCircle className="w-5 h-5 text-primary" />
                  User Profile
                </CardTitle>
                <CardDescription>Details about your current identity.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="grid gap-4">
                  <div className="grid gap-1">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Login Email</Label>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                      <Mail className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{user.email || 'No email (Guest)'}</span>
                      {user.emailVerified && (
                        <Badge variant="secondary" className="ml-auto bg-green-100 text-green-700 hover:bg-green-100 h-5 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-1">
                    <Label className="text-xs uppercase font-bold text-muted-foreground tracking-widest">Auth Method</Label>
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border">
                      <Fingerprint className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{getSignInProvider()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5">
                <CardTitle className="flex items-center gap-2 font-headline">
                  <Monitor className="w-5 h-5 text-primary" />
                  Logged in Device
                </CardTitle>
                <CardDescription>Manage your current active session on this device.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/20 rounded-xl border border-dashed border-primary/20">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <Monitor className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="font-bold text-sm">Current Session</p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 bg-background px-2 py-0.5 rounded border">
                        <Globe className="w-3 h-3" /> {deviceInfo.browser}
                      </span>
                      <span className="flex items-center gap-1 bg-background px-2 py-0.5 rounded border">
                        {deviceInfo.os}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter pt-1">
                      Last used: {user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Active</Badge>
                </div>

                <div className="pt-2">
                  <Button 
                    variant="destructive" 
                    className="w-full gap-2 font-bold"
                    onClick={handleRemoveDevice}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Remove Device
                  </Button>
                  <p className="text-[10px] text-center text-muted-foreground mt-3 uppercase tracking-widest leading-relaxed">
                    Clicking remove device will immediately end your session<br/>and require you to log in again.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <OpenRouterSettingsDialog
        open={isOpenRouterOpen}
        onOpenChange={(isOpen) => {
          setIsOpenRouterOpen(isOpen);
          if (!isOpen) {
            setOpenRouterKey(getOpenRouterApiKey());
            setSelectedModel(getSelectedFreeModel());
          }
        }}
      />
    </div>
  );
}
