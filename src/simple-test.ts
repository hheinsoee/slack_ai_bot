import * as dotenv from 'dotenv';
import { Pool } from 'pg';
import { typesenseClient, initializeTypesense } from './typesense';

dotenv.config();

// Test database connection without ORM
async function testDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const result = await pool.query('SELECT 1 as test');
    console.log('✅ Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  } finally {
    await pool.end();
  }
}

// Test Typesense connection
async function testTypesense() {
  try {
    // Basic health check
    const health = await typesenseClient.health.retrieve();
    console.log('✅ Typesense health check successful:', health);
    
    // Initialize collections
    const initialized = await initializeTypesense();
    console.log('✅ Typesense initialization:', initialized ? 'successful' : 'failed');
    
    return initialized;
  } catch (error) {
    console.error('❌ Typesense connection failed:', error);
    return false;
  }
}

// Simple product test
async function addSimpleProduct() {
  try {
    // Convert attributes to string
    const product = {
      id: "1",
      name: 'Test Product',
      description: 'This is a test product',
      price: 99.99,
      category: 'Test',
      sku: 'TEST-001',
      inStock: 10,
      sort_index: 1,
      attributes: JSON.stringify({
        color: 'Blue',
        size: 'Medium'
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const result = await typesenseClient
      .collections('products')
      .documents()
      .upsert(product);
      
    console.log('✅ Added test product:', result);
    return true;
  } catch (error) {
    console.error('❌ Failed to add test product:', error);
    return false;
  }
}

// Simple search test
async function testSearch() {
  try {
    const searchResults = await typesenseClient
      .collections('products')
      .documents()
      .search({
        q: 'test',
        query_by: 'name,description',
        sort_by: 'sort_index:asc'
      });
      
    console.log('✅ Search results:', JSON.stringify(searchResults, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Search failed:', error);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== Running Simple Tests ===');
  
  // Test database connection
  console.log('\n🔍 Testing database connection:');
  const dbConnected = await testDatabase();
  
  // Test Typesense connection
  console.log('\n🔍 Testing Typesense connection:');
  const typesenseConnected = await testTypesense();
  
  if (typesenseConnected) {
    // Add a test product
    console.log('\n🔍 Adding test product:');
    await addSimpleProduct();
    
    // Test search
    console.log('\n🔍 Testing search:');
    await testSearch();
  }
  
  console.log('\n=== Test Summary ===');
  console.log(`Database connection: ${dbConnected ? '✅' : '❌'}`);
  console.log(`Typesense connection: ${typesenseConnected ? '✅' : '❌'}`);
  console.log('====================');
}

// Run if called directly
if (require.main === module) {
  runTests()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Uncaught error:', error);
      process.exit(1);
    });
}

export { runTests };