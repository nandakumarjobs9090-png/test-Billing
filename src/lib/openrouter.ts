// OpenRouter API & Image Generator Utilities

const OPENROUTER_KEY_STORAGE = 'openrouter_api_key';
const SELECTED_MODEL_STORAGE = 'openrouter_selected_model';

export const DEFAULT_FREE_MODELS = [
  { id: 'google/gemini-2.0-flash-lite-preview-02-05:free', name: 'Google Gemini 2.0 Flash Lite (Free)' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', name: 'Meta Llama 3.3 70B (Free)' },
  { id: 'deepseek/deepseek-r1:free', name: 'DeepSeek R1 (Free)' },
  { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen 2.5 Coder 32B (Free)' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B Instruct (Free)' }
];

export function getOpenRouterApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(OPENROUTER_KEY_STORAGE) || '';
}

export function setOpenRouterApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OPENROUTER_KEY_STORAGE, key.trim());
}

export function getSelectedFreeModel(): string {
  if (typeof window === 'undefined') return DEFAULT_FREE_MODELS[0].id;
  return localStorage.getItem(SELECTED_MODEL_STORAGE) || DEFAULT_FREE_MODELS[0].id;
}

export function setSelectedFreeModel(modelId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SELECTED_MODEL_STORAGE, modelId);
}

export interface OpenRouterModel {
  id: string;
  name?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

/**
 * Fetch free models directly from OpenRouter API
 */
export async function fetchFreeOpenRouterModels(apiKey?: string): Promise<OpenRouterModel[]> {
  try {
    const key = apiKey || getOpenRouterApiKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    const models: OpenRouterModel[] = data.data || [];

    // Filter only free models (ending with :free or 0 pricing)
    const freeModels = models.filter((m) => {
      const isFreeId = m.id.endsWith(':free');
      const isFreePrice = m.pricing && parseFloat(m.pricing.prompt) === 0 && parseFloat(m.pricing.completion) === 0;
      return isFreeId || isFreePrice;
    });

    return freeModels.length > 0 ? freeModels : DEFAULT_FREE_MODELS;
  } catch (err) {
    console.warn('Error fetching OpenRouter models, returning defaults:', err);
    return DEFAULT_FREE_MODELS;
  }
}

/**
 * Complete a text prompt using OpenRouter with a free model
 */
export async function generateOpenRouterCompletion(
  prompt: string,
  modelId?: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || getOpenRouterApiKey();
  const model = modelId || getSelectedFreeModel();

  if (!key) {
    throw new Error('OpenRouter API key is not configured. Please set your API key in Account settings.');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://freebill.app',
      'X-Title': 'Free Bill App',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `OpenRouter API error (${response.status})`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

export interface GeneratedImageOption {
  id: string;
  url: string;
  source: string;
  label: string;
}

/**
 * Generate 4 distinct product image candidates for a given product name.
 * Combines AI image generators (Pollinations AI with style seeds) and Unsplash high-res product photos.
 */
export async function generateProductImages(productName: string): Promise<GeneratedImageOption[]> {
  const cleanedName = productName.trim();
  const encodedName = encodeURIComponent(cleanedName || 'product');
  const timestamp = Date.now();

  // Seed variations for distinct AI image styles (Studio photography, Minimalist, Commercial, Bright)
  const styles = [
    {
      id: 'ai-studio',
      label: 'Studio Lighting',
      prompt: `professional studio product photography of ${cleanedName}, clean white background, soft lighting, 4k`,
      seed: 101,
    },
    {
      id: 'ai-commercial',
      label: 'Commercial Showcase',
      prompt: `hd commercial product photo of ${cleanedName}, elegant wooden table background, warm ambient lighting`,
      seed: 202,
    },
    {
      id: 'ai-minimal',
      label: 'Modern Minimal',
      prompt: `minimalist aesthetic product photo of ${cleanedName}, pastel backdrop, top down view, high resolution`,
      seed: 303,
    },
    {
      id: 'ai-vibrant',
      label: 'Vibrant & Fresh',
      prompt: `vibrant fresh high quality photography of ${cleanedName}, detailed close up, studio backdrop`,
      seed: 404,
    },
  ];

  const candidates: GeneratedImageOption[] = styles.map((style) => {
    const encodedPrompt = encodeURIComponent(style.prompt);
    // Pollinations AI endpoint with seed and dimensions
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=500&height=500&seed=${style.seed}&nologo=true`;
    return {
      id: `${style.id}-${timestamp}`,
      url,
      source: 'AI Generator',
      label: style.label,
    };
  });

  // Also include 1 fallback high-resolution Unsplash product photo URL
  candidates.push({
    id: `unsplash-${timestamp}`,
    url: `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=500&q=80`,
    source: 'Stock Photo',
    label: 'Unsplash Stock',
  });

  return candidates;
}
