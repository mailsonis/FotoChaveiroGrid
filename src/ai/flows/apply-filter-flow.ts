
'use server';
/**
 * @fileOverview An AI flow for applying filters to images.
 *
 * - applyFilter - A function that applies a filter to an image.
 * - ApplyFilterInput - The input type for the applyFilter function.
 * - ApplyFilterOutput - The return type for the applyFilter function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ApplyFilterInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a plant, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  filterPrompt: z.string().describe('The description of the filter to apply.'),
});
export type ApplyFilterInput = z.infer<typeof ApplyFilterInputSchema>;

const ApplyFilterOutputSchema = z.object({
  imageDataUri: z.string().describe('The data URI of the filtered image.'),
});
export type ApplyFilterOutput = z.infer<typeof ApplyFilterOutputSchema>;

export async function applyFilter(input: ApplyFilterInput): Promise<ApplyFilterOutput> {
  return applyFilterFlow(input);
}

const applyFilterFlow = ai.defineFlow(
  {
    name: 'applyFilterFlow',
    inputSchema: ApplyFilterInputSchema,
    outputSchema: ApplyFilterOutputSchema,
  },
  async ({ imageDataUri, filterPrompt }) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-preview-image-generation',
      prompt: [
        { media: { url: imageDataUri } },
        { text: `Apply a ${filterPrompt} filter to this image.` },
      ],
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Failed to generate filtered image.');
    }

    return { imageDataUri: media.url };
  }
);
