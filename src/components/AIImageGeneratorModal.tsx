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
import { useToast } from "@/hooks/use-toast";
import { Sparkles, RefreshCw, Check, Loader2, Image as ImageIcon, Key } from "lucide-react";
import Image from "next/image";
import {
  generateProductImages,
  GeneratedImageOption,
  getOpenRouterApiKey,
  generateOpenRouterCompletion
} from "@/lib/openrouter";

interface AIImageGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  onSelectImage: (imageUrl: string) => void;
  onOpenSettings: () => void;
}

export function AIImageGeneratorModal({
  open,
  onOpenChange,
  productName,
  onSelectImage,
  onOpenSettings,
}: AIImageGeneratorModalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState(productName || '');
  const [candidates, setCandidates] = useState<GeneratedImageOption[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<GeneratedImageOption | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiRefinedKeywords, setAiRefinedKeywords] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const term = productName.trim() || 'Cold Coffee';
      setSearchTerm(term);
      handleGenerateImages(term);
    }
  }, [open, productName]);

  const handleGenerateImages = async (queryTerm: string) => {
    if (!queryTerm.trim()) {
      toast({
        title: "Product Name Required",
        description: "Please type a product name to search or generate images.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setSelectedCandidate(null);
    setAiRefinedKeywords(null);

    try {
      // Check if OpenRouter key exists, optionally refine term with OpenRouter
      const hasKey = !!getOpenRouterApiKey();
      let activeQuery = queryTerm;

      if (hasKey) {
        try {
          const prompt = `Give me 3 precise visual descriptors/keywords for a product named "${queryTerm}" suitable for product photography search. Reply with only the keywords separated by spaces.`;
          const refined = await generateOpenRouterCompletion(prompt);
          if (refined && refined.length < 50) {
            setAiRefinedKeywords(refined.trim());
            activeQuery = `${queryTerm} ${refined.trim()}`;
          }
        } catch (e) {
          // Fallback gracefully if key error
          console.warn("OpenRouter prompt refinement skipped:", e);
        }
      }

      const results = await generateProductImages(activeQuery);
      setCandidates(results);
      if (results.length > 0) {
        setSelectedCandidate(results[0]);
      }
    } catch (err: any) {
      toast({
        title: "Generation Error",
        description: err.message || "Failed to generate images.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!selectedCandidate) {
      toast({
        title: "No Image Selected",
        description: "Please click on an image candidate to select it.",
        variant: "destructive",
      });
      return;
    }
    onSelectImage(selectedCandidate.url);
    toast({
      title: "Product Image Set",
      description: `Applied image option: ${selectedCandidate.label}`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-card text-card-foreground">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <DialogTitle>AI Product Image Generator & Search</DialogTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenSettings}
              className="gap-1.5 text-xs h-8"
            >
              <Key className="w-3.5 h-3.5" />
              OpenRouter Key
            </Button>
          </div>
          <DialogDescription>
            Search internet stock photos or generate 4 distinct AI product image styles for your catalog item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Search bar input */}
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="image-prompt" className="text-xs font-bold">
                Product Search Name / Prompt
              </Label>
              <Input
                id="image-prompt"
                placeholder="e.g., Masala Chai, Samosa, Cold Coffee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateImages(searchTerm);
                }}
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => handleGenerateImages(searchTerm)}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Generate
              </Button>
            </div>
          </div>

          {aiRefinedKeywords && (
            <div className="text-[11px] text-muted-foreground bg-accent/10 px-3 py-1.5 rounded-md flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>
                <strong>OpenRouter Refined Keywords:</strong> {aiRefinedKeywords}
              </span>
            </div>
          )}

          {/* Grid of 4 to 5 candidate images */}
          {isGenerating ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-[260px] items-center justify-center p-6 bg-muted/30 rounded-xl border border-dashed">
              <div className="col-span-full flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-medium">Generating 4 distinct product image options...</p>
              </div>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[220px] text-muted-foreground bg-muted/20 rounded-xl border border-dashed p-6 text-center">
              <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Type a product name above and click Generate.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto p-1">
              {candidates.map((cand) => {
                const isSelected = selectedCandidate?.id === cand.id;
                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedCandidate(cand)}
                    className={`relative group h-36 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary ring-2 ring-primary/30 shadow-md scale-[1.02]"
                        : "border-border hover:border-primary/50 hover:shadow-sm"
                    }`}
                  >
                    <Image
                      src={cand.url}
                      alt={cand.label}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {cand.label}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground p-1 rounded-full shadow-md">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-white text-[10px] truncate">
                      {cand.source}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={!selectedCandidate || isGenerating}
            className="gap-2"
          >
            <Check className="w-4 h-4" />
            Apply Selected Image
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
