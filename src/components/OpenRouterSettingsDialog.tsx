"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Key, Sparkles, Check, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import {
  getOpenRouterApiKey,
  setOpenRouterApiKey,
  getSelectedFreeModel,
  setSelectedFreeModel,
  DEFAULT_FREE_MODELS,
  fetchFreeOpenRouterModels,
  generateOpenRouterCompletion,
  OpenRouterModel
} from "@/lib/openrouter";

interface OpenRouterSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenRouterSettingsDialog({ open, onOpenChange }: OpenRouterSettingsDialogProps) {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [models, setModels] = useState<OpenRouterModel[]>(DEFAULT_FREE_MODELS);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const currentKey = getOpenRouterApiKey();
      const currentModel = getSelectedFreeModel();
      setApiKey(currentKey);
      setSelectedModel(currentModel);
      setTestResult(null);

      // Load free models
      setIsLoadingModels(true);
      fetchFreeOpenRouterModels(currentKey)
        .then((fetched) => setModels(fetched))
        .finally(() => setIsLoadingModels(false));
    }
  }, [open]);

  const handleSave = () => {
    setOpenRouterApiKey(apiKey);
    setSelectedFreeModel(selectedModel);
    toast({
      title: "Settings Saved",
      description: "Your OpenRouter API Key and Free Model settings have been updated.",
    });
    onOpenChange(false);
  };

  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter an OpenRouter API key to test.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    try {
      setOpenRouterApiKey(apiKey);
      const res = await generateOpenRouterCompletion("Say 'OpenRouter free model connected successfully!' in 5 words.", selectedModel, apiKey);
      setTestResult(res);
      toast({
        title: "Connection Successful!",
        description: "Connected to OpenRouter free models.",
      });
    } catch (err: any) {
      toast({
        title: "Test Failed",
        description: err.message || "Failed to connect to OpenRouter.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card text-card-foreground">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <DialogTitle>OpenRouter AI Settings (Free Models)</DialogTitle>
          </div>
          <DialogDescription>
            Configure your OpenRouter API key to use free AI models for product descriptions and image prompts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="openrouter-key" className="flex items-center gap-2 font-bold text-sm">
              <Key className="w-4 h-4 text-muted-foreground" />
              OpenRouter API Key
            </Label>
            <div className="flex gap-2">
              <Input
                id="openrouter-key"
                type="password"
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test Key"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Don't have a key? Get a free API key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline inline-flex items-center gap-0.5"
              >
                openrouter.ai/keys <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="free-model-select" className="font-bold text-sm">
              Select Free AI Model
            </Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="free-model-select">
                <SelectValue placeholder="Select a free model" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name || model.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Only free models ending with <code>:free</code> or zero cost prompt/completion are shown.
            </p>
          </div>

          {testResult && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-xs flex items-start gap-2">
              <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Test Output:</span> {testResult}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Check className="w-4 h-4" /> Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
