import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const emailSummaries = pgTable('email_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  sender: varchar('sender', { length: 255 }).notNull(),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  summary: text('summary').notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  keywords: text('keywords').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type EmailSummary = typeof emailSummaries.$inferSelect;
export type NewEmailSummary = typeof emailSummaries.$inferInsert;
