'use server';
/**
 * @fileOverview A GenAI tool to generate appealing and aromatic descriptions for new tea blends or food items.
 *
 * - generateMenuItemDescription - A function that handles the menu item description generation process.
 * - GenerateMenuItemDescriptionInput - The input type for the generateMenuItemDescription function.
 * - GenerateMenuItemDescriptionOutput - The return type for the generateMenuItemDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMenuItemDescriptionInputSchema = z.object({
  itemName: z
    .string()
    .describe('The name of the menu item (e.g., Masala Chai, Samosa).'),
  ingredients: z
    .string()
    .describe('A comma-separated list of key ingredients (e.g., black tea, ginger, cardamom, cloves).'),
  flavorProfile: z
    .string()
    .describe('A description of the desired flavor profile (e.g., spicy, robust, warming, sweet, tangy).'),
  descriptionLength: z
    .enum(['short', 'medium', 'long'])
    .describe('The desired length of the description (short, medium, or long).'),
});
export type GenerateMenuItemDescriptionInput = z.infer<
  typeof GenerateMenuItemDescriptionInputSchema
>;

const GenerateMenuItemDescriptionOutputSchema = z.object({
  description: z.string().describe('An appealing and aromatic description for the menu item.'),
});
export type GenerateMenuItemDescriptionOutput = z.infer<
  typeof GenerateMenuItemDescriptionOutputSchema
>;

export async function generateMenuItemDescription(
  input: GenerateMenuItemDescriptionInput
): Promise<GenerateMenuItemDescriptionOutput> {
  return generateMenuItemDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMenuItemDescriptionPrompt',
  input: {schema: GenerateMenuItemDescriptionInputSchema},
  output: {schema: GenerateMenuItemDescriptionOutputSchema},
  prompt: `You are an expert copywriter for an Indian tea shop, skilled at crafting appealing and aromatic descriptions for menu items.
Your task is to create a captivating description for a menu item based on its name, ingredients, and flavor profile.
The description should evoke warmth, comfort, and the unique experience of enjoying the item.

Item Name: {{{itemName}}}
Key Ingredients: {{{ingredients}}}
Flavor Profile: {{{flavorProfile}}}
Desired Length: {{{descriptionLength}}}

Craft a description that is enticing and makes customers want to try this item.`,
});

const generateMenuItemDescriptionFlow = ai.defineFlow(
  {
    name: 'generateMenuItemDescriptionFlow',
    inputSchema: GenerateMenuItemDescriptionInputSchema,
    outputSchema: GenerateMenuItemDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
