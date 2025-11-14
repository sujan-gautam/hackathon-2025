import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Emails table - stores all fetched emails
export const emails = pgTable("emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: text("message_id").notNull().unique(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  snippet: text("snippet"),
  date: timestamp("date").notNull(),
  isRead: boolean("is_read").default(false),
  isProcessed: boolean("is_processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email intents - AI classification results
export const emailIntents = pgTable("email_intents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailId: varchar("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
  intent: text("intent").notNull(), // meeting_request, question, complaint, assignment, follow_up, billing, job_application, spam
  confidence: integer("confidence").notNull(), // 0-100
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email responses - AI generated responses
export const emailResponses = pgTable("email_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailId: varchar("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
  responseText: text("response_text").notNull(),
  tone: text("tone").notNull().default("professional"), // professional, casual, formal
  status: text("status").notNull().default("draft"), // draft, sent
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Workflow actions - suggested actions for emails
export const workflowActions = pgTable("workflow_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  emailId: varchar("email_id").notNull().references(() => emails.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(), // add_to_calendar, create_reminder, save_attachments, mark_complete
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"), // stores additional action data like calendar event details
  status: text("status").notNull().default("pending"), // pending, completed, dismissed
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas and types
export const insertEmailSchema = createInsertSchema(emails).omit({
  id: true,
  createdAt: true,
});

export const insertEmailIntentSchema = createInsertSchema(emailIntents).omit({
  id: true,
  createdAt: true,
});

export const insertEmailResponseSchema = createInsertSchema(emailResponses).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

export const insertWorkflowActionSchema = createInsertSchema(workflowActions).omit({
  id: true,
  createdAt: true,
});

// Types
export type Email = typeof emails.$inferSelect;
export type InsertEmail = z.infer<typeof insertEmailSchema>;

export type EmailIntent = typeof emailIntents.$inferSelect;
export type InsertEmailIntent = z.infer<typeof insertEmailIntentSchema>;

export type EmailResponse = typeof emailResponses.$inferSelect;
export type InsertEmailResponse = z.infer<typeof insertEmailResponseSchema>;

export type WorkflowAction = typeof workflowActions.$inferSelect;
export type InsertWorkflowAction = z.infer<typeof insertWorkflowActionSchema>;

// User settings - preferences for AI automation
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().default("default"), // For future multi-user support
  defaultTone: text("default_tone").notNull().default("professional"), // professional, casual, formal
  autoSendEnabled: boolean("auto_send_enabled").default(false),
  autoSendIntents: text("auto_send_intents").array(), // Intents to auto-send responses for
  pollingEnabled: boolean("polling_enabled").default(false),
  pollingInterval: integer("polling_interval").default(5), // minutes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;

// Combined type for email with all related data
export type EmailWithDetails = Email & {
  intent?: EmailIntent;
  response?: EmailResponse;
  actions?: WorkflowAction[];
};
