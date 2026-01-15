import OpenAI from 'openai';
import { z, type ZodIssue } from 'zod';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is not set');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SummaryResponseSchema = z.object({
  summary: z.string().describe('A concise 2-3 sentence summary of the email'),
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
    .array(z.string())
    .describe('Key terms or phrases extracted from the email (5-10 keywords)'),
});

type SummaryResponse = z.infer<typeof SummaryResponseSchema>;

interface EmailData {
  sender: string;
  subject: string;
  body: string;
}

export class OpenAIService {
  async summarizeEmail(email: EmailData): Promise<SummaryResponse> {
    try {
      console.log('🤖 [OpenAI] Starting email summarization...');
      console.log('📧 [OpenAI] Email data:', {
        sender: email.sender,
        subject: email.subject,
        bodyLength: email.body.length,
      });

      // Truncate body if too long to avoid token limits
      const maxBodyLength = 3000;
      const truncatedBody = email.body.length > maxBodyLength 
        ? email.body.substring(0, maxBodyLength) + '...' 
        : email.body;

      if (email.body.length > maxBodyLength) {
        console.log(`⚠️ [OpenAI] Email body truncated from ${email.body.length} to ${truncatedBody.length} characters`);
      }

      const prompt = `Analyze the following email and provide:
1. A concise 2-3 sentence summary
2. A category from: Meeting, Invoice, Support Request, Newsletter, Promotion, Personal, Work, Other
3. 5-10 key terms or phrases extracted from the email

Email Details:
From: ${email.sender}
Subject: ${email.subject}
Body: ${truncatedBody}

Respond in JSON format with the following structure:
{
  "summary": "2-3 sentence summary here",
  "category": "one of the categories listed above",
  "keywords": ["keyword1", "keyword2", ...]
}`;

      console.log('📤 [OpenAI] Sending request to OpenAI API...');
      console.log('⚙️ [OpenAI] Model:', process.env.OPENAI_MODEL || 'gpt-4o-mini');
      console.log('⚙️ [OpenAI] Temperature:', process.env.OPENAI_TEMPERATURE || '0.3');
      console.log('⚙️ [OpenAI] Max tokens:', process.env.OPENAI_MAX_TOKENS || '500');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an email analysis assistant. Always respond with valid JSON only, no additional text.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '500', 10),
      });

      console.log('✅ [OpenAI] Received response from OpenAI API');
      console.log('📊 [OpenAI] Response metadata:', {
        model: completion.model,
        usage: completion.usage,
        finishReason: completion.choices[0]?.finish_reason,
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.error('❌ [OpenAI] No content in OpenAI response');
        throw new Error('No response from OpenAI');
      }

      console.log('📥 [OpenAI] Raw response content:', content.substring(0, 200) + '...');

      const parsed = JSON.parse(content);
      console.log('🔍 [OpenAI] Parsed JSON:', JSON.stringify(parsed, null, 2));

      const validated = SummaryResponseSchema.parse(parsed);
      console.log('✅ [OpenAI] Validation passed');
      console.log('📋 [OpenAI] Final summary data:', {
        summaryLength: validated.summary.length,
        category: validated.category,
        keywordsCount: validated.keywords.length,
        keywords: validated.keywords,
      });

      return validated;
    } catch (error) {
      console.error('❌ [OpenAI] Error during summarization:', error);
      
      if (error instanceof z.ZodError) {
        console.error('❌ [OpenAI] Validation errors:', error.errors);
        throw new Error(`Validation error: ${error.errors.map((e: ZodIssue) => e.message).join(', ')}`);
      }
      if (error instanceof Error) {
        console.error('❌ [OpenAI] Error message:', error.message);
        console.error('❌ [OpenAI] Error stack:', error.stack);
        throw new Error(`OpenAI API error: ${error.message}`);
      }
      console.error('❌ [OpenAI] Unknown error type:', typeof error);
      throw new Error('Unknown error occurred while summarizing email');
    }
  }

  async batchSummarizeEmails(emails: EmailData[]): Promise<SummaryResponse[]> {
    console.log('🔄 [OpenAI] Starting batch summarization...');
    console.log('📊 [OpenAI] Total emails to process:', emails.length);
    
    const results: SummaryResponse[] = [];
    const errors: Array<{ email: EmailData; error: string }> = [];
    const batchSize = parseInt(process.env.OPENAI_BATCH_SIZE || '5', 10);
    const delay = parseInt(process.env.OPENAI_BATCH_DELAY_MS || '200', 10);

    console.log('⚙️ [OpenAI] Batch settings:', { batchSize, delay });

    // Process emails in smaller batches to avoid rate limits
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      console.log(`📦 [OpenAI] Processing batch ${Math.floor(i / batchSize) + 1} (emails ${i + 1}-${Math.min(i + batchSize, emails.length)})`);
      
      for (let j = 0; j < batch.length; j++) {
        const email = batch[j];
        const emailNumber = i + j + 1;
        console.log(`\n📧 [OpenAI] Processing email ${emailNumber}/${emails.length}: ${email.sender} - ${email.subject}`);
        
        try {
          const result = await this.summarizeEmail(email);
          results.push(result);
          console.log(`✅ [OpenAI] Email ${emailNumber} summarized successfully`);
          
          // Add delay between requests to avoid rate limiting
          if (emailNumber < emails.length) {
            console.log(`⏳ [OpenAI] Waiting ${delay}ms before next request...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ email, error: errorMessage });
          console.error(`❌ [OpenAI] Failed to summarize email ${emailNumber} from ${email.sender}:`, errorMessage);
        }
      }

      // Longer delay between batches
      if (i + batchSize < emails.length) {
        const batchDelay = delay * 2;
        console.log(`⏳ [OpenAI] Batch complete. Waiting ${batchDelay}ms before next batch...`);
        await new Promise((resolve) => setTimeout(resolve, batchDelay));
      }
    }

    console.log('\n📊 [OpenAI] Batch summarization complete!');
    console.log(`✅ [OpenAI] Successfully summarized: ${results.length}/${emails.length} emails`);
    
    if (errors.length > 0) {
      console.warn(`⚠️ [OpenAI] Failed to summarize ${errors.length} out of ${emails.length} emails`);
      console.warn('❌ [OpenAI] Errors:', errors.map(e => ({ sender: e.email.sender, error: e.error })));
    }

    return results;
  }
}

export const openAIService = new OpenAIService();
