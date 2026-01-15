import { pgTable, text, timestamp, uuid, varchar, jsonb, index } from 'drizzle-orm/pg-core';

export const emailSummaries = pgTable(
  'email_summaries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sender: varchar('sender', { length: 255 }).notNull(),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    summary: text('summary').notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    keywords: text('keywords').array(),
    invoiceData: jsonb('invoice_data'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    categoryIdx: index('category_idx').on(table.category),
    createdAtIdx: index('created_at_idx').on(table.createdAt),
    senderIdx: index('sender_idx').on(table.sender),
  })
);

export type EmailSummary = typeof emailSummaries.$inferSelect;
export type NewEmailSummary = typeof emailSummaries.$inferInsert;
