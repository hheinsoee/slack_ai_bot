import { pgTable, serial, text, varchar, real, timestamp, jsonb, integer } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  price: real('price'),
  category: varchar('category', { length: 100 }),
  sku: varchar('sku', { length: 50 }).unique(),
  inStock: real('in_stock').default(0),
  attributes: jsonb('attributes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  parentId: integer('parent_id'), // <-- Use integer for FK, not serial
  // You can add a reference if you want Drizzle to manage it:
  // .references(() => categories.id, { onDelete: 'set null' })
});

export const productSearchHistory = pgTable('product_search_history', {
  id: serial('id').primaryKey(),
  query: text('query').notNull(),
  userId: varchar('user_id', { length: 50 }),
  timestamp: timestamp('timestamp').defaultNow(),
  results: jsonb('results'),
});