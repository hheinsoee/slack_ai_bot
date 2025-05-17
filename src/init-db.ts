import { Pool } from 'pg';
import { db } from './db';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { initializeTypesense } from './typesense';

dotenv.config();

const dbName = 'slackbot';

async function ensureDatabaseExists() {
  const adminPool = new Pool({
    connectionString: process.env.DATABASE_URL?.replace(`/${dbName}`, '/postgres'),
  });

  const result = await adminPool.query(
    `SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]
  );
  if (result.rowCount === 0) {
    console.log(`Database "${dbName}" does not exist. Creating...`);
    await adminPool.query(`CREATE DATABASE ${dbName}`);
    console.log(`✅ Database "${dbName}" created.`);
  } else {
    console.log(`✅ Database "${dbName}" already exists.`);
  }
  await adminPool.end();
}

async function initializeDatabase() {
  console.log('=== Database Initialization ===');
  
  try {
    // Ensure database exists
    await ensureDatabaseExists();

    // Test database connection
    console.log('Testing database connection...');
    await db.execute(sql`SELECT 1`);
    console.log('✅ Database connection successful');
    
    // Create schema
    console.log('Creating database schema...');
    
    // Create products table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price REAL,
        category VARCHAR(100),
        sku VARCHAR(50) UNIQUE,
        in_stock REAL DEFAULT 0,
        attributes JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Created products table');
    
    // Create categories table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        parent_id INTEGER
      )
    `);

    // Add self-reference after table is created
    await db.execute(sql`
      ALTER TABLE categories 
      DROP CONSTRAINT IF EXISTS fk_category_parent;
    `);
    await db.execute(sql`
      ALTER TABLE categories 
      ADD CONSTRAINT fk_category_parent 
      FOREIGN KEY (parent_id) REFERENCES categories(id)
      ON DELETE SET NULL
    `);
    console.log('✅ Created categories table with self-reference');
    
    // Create product search history table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS product_search_history (
        id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        user_id VARCHAR(50),
        timestamp TIMESTAMP DEFAULT NOW(),
        results JSONB
      )
    `);
    console.log('✅ Created product_search_history table');
    
    // Initialize Typesense
    console.log('Initializing Typesense search engine...');
    const typesenseInitialized = await initializeTypesense();
    if (typesenseInitialized) {
      console.log('✅ Typesense initialized successfully');
    } else {
      console.warn('⚠️ Typesense initialization failed or not available');
    }
    
    // Create migrations directory if it doesn't exist
    const migrationsDir = path.join(__dirname, '..', 'drizzle');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
      console.log('✅ Created migrations directory');
    }
    
    // Save a migration snapshot
    const schemaSnapshot = {
      version: '1',
      timestamp: new Date().toISOString(),
      tables: {
        products: {
          columns: Object.keys(schema.products),
        },
        categories: {
          columns: Object.keys(schema.categories),
        },
        product_search_history: {
          columns: Object.keys(schema.productSearchHistory),
        }
      }
    };
    
    fs.writeFileSync(
      path.join(migrationsDir, 'meta.json'),
      JSON.stringify(schemaSnapshot, null, 2)
    );
    console.log('✅ Saved schema snapshot');
    
    console.log('=== Database initialization complete ===');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

// Run the initialization if this file is run directly
if (require.main === module) {
  initializeDatabase()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Uncaught error during initialization:', error);
      process.exit(1);
    });
}

export { initializeDatabase };