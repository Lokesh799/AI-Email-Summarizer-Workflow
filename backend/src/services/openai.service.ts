import OpenAI from 'openai';
import { z, type ZodIssue } from 'zod';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SummaryResponseSchema = z.object({
  summary: z.string().min(10).describe('A concise 2-3 sentence summary of the email'),
  category: z
    .enum([
      'Meeting',
      'Invoice',
      'Support Request',
      'Newsletter',
      'Promotion',
      'Personal',
      'Work',
      'Other',
    ])
    .describe('The category of the email'),
  keywords: z
    .array(z.string().min(1))
    .min(3)
    .max(15)
    .describe('Key terms or phrases extracted from the email (5-10 keywords)'),
});

type SummaryResponse = z.infer<typeof SummaryResponseSchema>;

export interface EmailData {
  sender: string;
  subject: string;
  body: string;
}

const MAX_BODY_LENGTH = 3000;
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.3;
const DEFAULT_MAX_TOKENS = 500;
const BATCH_SIZE = parseInt(process.env.OPENAI_BATCH_SIZE || '5', 10);
const BATCH_DELAY_MS = parseInt(process.env.OPENAI_BATCH_DELAY_MS || '200', 10);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Creates a well-structured prompt for email summarization
 */
function createSummarizationPrompt(email: EmailData, truncatedBody: string): string {
  return `Analyze the following email and provide a structured summary.

Email Details:
From: ${email.sender}
Subject: ${email.subject}
Body: ${truncatedBody}

Instructions:
1. Create a concise 2-3 sentence summary that captures the main purpose and key information
2. Categorize the email into one of these categories: Meeting, Invoice, Support Request, Newsletter, Promotion, Personal, Work, Other
3. Extract 5-10 relevant keywords or key phrases that best represent the email content

Respond in JSON format with this exact structure:
{
  "summary": "2-3 sentence summary here",
  "category": "one of the categories listed above",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}`;
}

/**
 * Retries a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY_MS
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on validation errors
      if (error instanceof z.ZodError) {
        throw error;
      }
      
      // Don't retry on client errors (4xx)
      if (error instanceof Error && 'status' in error) {
        const status = (error as { status?: number }).status;
        if (status && status >= 400 && status < 500) {
          throw error;
        }
      }
      
      if (attempt < maxRetries) {
        const backoffDelay = delay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
}

export class OpenAIService {
  /**
   * Summarizes a single email using OpenAI API
   */
  async summarizeEmail(email: EmailData): Promise<SummaryResponse> {
    const truncatedBody =
      email.body.length > MAX_BODY_LENGTH
        ? email.body.substring(0, MAX_BODY_LENGTH) + '...'
        : email.body;

    const prompt = createSummarizationPrompt(email, truncatedBody);

    return retryWithBackoff(async () => {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'You are an email analysis assistant. Always respond with valid JSON only, no additional text or markdown formatting.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || String(DEFAULT_TEMPERATURE)),
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || String(DEFAULT_MAX_TOKENS), 10),
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI API');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (parseError) {
        throw new Error(`Failed to parse OpenAI response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }

      return SummaryResponseSchema.parse(parsed);
    }).catch((error) => {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Validation error: ${errorMessages}`);
      }
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      throw new Error('Unknown error occurred while summarizing email');
    });
  }

  /**
   * Summarizes multiple emails in batches with rate limiting
   */
  async batchSummarizeEmails(emails: EmailData[]): Promise<SummaryResponse[]> {
    if (emails.length === 0) {
      return [];
    }

    const results: SummaryResponse[] = [];
    const errors: Array<{ email: EmailData; error: string }> = [];

    // Process emails in batches to avoid rate limits
    for (let i = 0; i < emails.length; i += BATCH_SIZE) {
      const batch = emails.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(emails.length / BATCH_SIZE);

      // Process each email in the batch sequentially
      for (let j = 0; j < batch.length; j++) {
        const email = batch[j];
        const emailNumber = i + j + 1;

        try {
          const result = await this.summarizeEmail(email);
          results.push(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ email, error: errorMessage });
        }

        // Add delay between requests to avoid rate limiting (except for last email)
        if (emailNumber < emails.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
        }
      }

      // Longer delay between batches (except for last batch)
      if (i + BATCH_SIZE < emails.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS * 2));
      }
    }

    if (errors.length > 0) {
      console.error(`Failed to summarize ${errors.length} out of ${emails.length} emails`);
    }

    return results;
  }
}

export const openAIService = new OpenAIService();
