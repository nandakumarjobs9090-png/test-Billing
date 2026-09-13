"use client";

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import {
  Key, Sparkles, Check, Loader2, RefreshCw, ExternalLink,
  Cpu, Send, ShieldCheck, Zap
} from 'lucide-react';
import {
  getOpenRouterApiKey,
  setOpenRouterApiKey,
  getSelectedFreeModel,
  setSelectedFreeModel,
  DEFAULT_FREE_MODELS,
  fetchFreeOpenRouterModels,
  generateOpenRouterCompletion,
  OpenRouterModel
} from '@/lib/openrouter';

export default function ApiSettingsPage() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>(DEFAULT_FREE_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  // Test playground state
  const [testPrompt, setTestPrompt] = useState('Suggest 3 popular tea specials for a coffee shop menu.');
  const [testResult, setTestResult] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const key = getOpenRouterApiKey();
    const model = getSelectedFreeModel();
    setApiKey(key);
    setSelectedModel(model);

    loadModels(key);
  }, []);

  const loadModels = async (key?: string) => {
    setIsLoadingModels(true);
    try {
      const fetched = await fetchFreeOpenRouterModels(key);
      setModels(fetched);
    } catch (e) {
      console.warn('Failed to fetch models:', e);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setOpenRouterApiKey(apiKey);
    setSelectedFreeModel(selectedModel);
    
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "API Settings Saved",
        description: "Your OpenRouter API Key and AI model preferences have been saved.",
      });
    }, 300);
  };

  const handleTestKeyAndModel = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an OpenRouter API key before running a test.",
        variant: "destructive",
      });
      return;
    }

    if (!testPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please type a prompt to test.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult('');

    try {
      setOpenRouterApiKey(apiKey);
      setSelectedFreeModel(selectedModel);

      const response = await generateOpenRouterCompletion(testPrompt, selectedModel, apiKey);
      setTestResult(response);

      toast({
        title: "AI Call Successful!",
        description: `Successfully received response using ${selectedModel}`,
      });
    } catch (err: any) {
      toast({
        title: "API Error",
        description: err.message || "Failed to complete request.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 md:pl-64">
      <Sidebar />
      <MobileNav />
      <main className="p-6 md:p-8 max-w-3xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
              <Key className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-3xl font-headline font-bold">API & AI Settings</h2>
              <p className="text-muted-foreground">Manage your OpenRouter API Key and select free AI models.</p>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {/* API Key Configuration Card */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 font-headline">
                    <Key className="w-5 h-5 text-primary" />
                    OpenRouter API Key
                  </CardTitle>
                  <CardDescription>
                    Enter your OpenRouter key to enable AI features (Product Descriptions & Image Prompts).
                  </CardDescription>
                </div>
                {apiKey ? (
                  <Badge className="bg-green-100 text-green-700 border-none font-bold">Configured</Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-600 border-amber-300 font-bold">No Key</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key-input" className="font-bold text-sm">
                  API Key
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key-input"
                    type="password"
                    placeholder="sk-or-v1-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => loadModels(apiKey)} 
                    disabled={isLoadingModels}
                    className="gap-1.5 shrink-0"
                  >
                    {isLoadingModels ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Refresh Models
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Your key is stored securely in your browser's local storage.</span>
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline flex items-center gap-0.5 font-bold"
                  >
                    Get Free Key <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Model Selection Card */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2 font-headline">
                <Cpu className="w-5 h-5 text-primary" />
                Select AI Model (Free Models Only)
              </CardTitle>
              <CardDescription>
                Choose from available free models on OpenRouter with zero token cost.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="model-select" className="font-bold text-sm">
                  Active Free Model
                </Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger id="model-select" className="h-11">
                    <SelectValue placeholder="Select a free model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selected Model ID: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-foreground">{selectedModel}</code>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {DEFAULT_FREE_MODELS.map((item) => {
                  const isSelected = selectedModel === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedModel(item.id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "border-border hover:border-primary/40 bg-card"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="font-bold text-xs">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{item.id}</p>
                      </div>
                      <Badge variant={isSelected ? "default" : "secondary"} className="text-[9px] uppercase h-5">
                        {isSelected ? "Active" : "Free"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t p-4 flex justify-between items-center">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-4 h-4 text-green-600" /> Free models require 0 OpenRouter credits.
              </span>
              <Button onClick={handleSave} disabled={isSaving} className="font-bold gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Save API Settings
              </Button>
            </CardFooter>
          </Card>

          {/* AI Playground & Live Test */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2 font-headline">
                <Zap className="w-5 h-5 text-primary" />
                Live AI Model Test
              </CardTitle>
              <CardDescription>
                Test your API key and active free model directly inside the app.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-prompt" className="font-bold text-sm">
                  Test Prompt
                </Label>
                <Textarea
                  id="test-prompt"
                  rows={2}
                  placeholder="Type a test prompt..."
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                />
              </div>

              <Button
                onClick={handleTestKeyAndModel}
                disabled={isTesting}
                className="w-full gap-2 font-bold"
              >
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Run Live Test API Call
              </Button>

              {testResult && (
                <div className="p-4 bg-muted/40 rounded-xl border border-primary/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-primary">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Model Output
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">{selectedModel}</Badge>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                    {testResult}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
