import * as dotenv from 'dotenv';
dotenv.config(); // <-- This must be first!

import { db } from './db';
import { products, categories } from './schema';
import { initializeTypesense, indexProducts, clearProductsCollection } from './typesense';

async function seedDatabase() {
  console.log('Starting database seeding...');

  try {
    // Initialize Typesense
    console.log('Initializing Typesense...');
    await initializeTypesense();
    
    // Clear existing data
    console.log('Clearing existing data...');
    await db.delete(products);
    await db.delete(categories);
    await clearProductsCollection();

    // Seed categories
    console.log('Seeding categories...');
    const categoryData = [
      { name: 'Electronics', description: 'Electronic devices and accessories' },
      { name: 'Clothing', description: 'Apparel and fashion items' },
      { name: 'Home & Kitchen', description: 'Items for home and kitchen use' },
      { name: 'Sports & Outdoors', description: 'Sporting goods and outdoor equipment' },
      { name: 'Books', description: 'Books and publications' },
    ];

    const categoryInsertResult = await db.insert(categories).values(categoryData).returning();
    console.log(`Added ${categoryInsertResult.length} categories`);

    // Seed products
    console.log('Seeding products...');
    const productData = [
      {
        name: 'Smartphone X12',
        description: 'Latest smartphone with advanced camera and long battery life',
        price: 699.99,
        category: 'Electronics',
        sku: 'ELEC-SP-001',
        inStock: 25,
        attributes: JSON.stringify({
          color: ['Black', 'Silver', 'Blue'],
          storage: ['64GB', '128GB', '256GB'],
          dimensions: '150x75x8mm',
          weight: '180g'
        })
      },
      {
        name: 'Wireless Headphones',
        description: 'Noise-cancelling bluetooth headphones with 20-hour battery life',
        price: 149.99,
        category: 'Electronics',
        sku: 'ELEC-HP-002',
        inStock: 42,
        attributes: JSON.stringify({
          color: ['Black', 'White'],
          connectivity: 'Bluetooth 5.0',
          batteryLife: '20 hours'
        })
      },
      {
        name: 'Men\'s Running Shoes',
        description: 'Lightweight running shoes with responsive cushioning',
        price: 89.99,
        category: 'Clothing',
        sku: 'CLOTH-SH-001',
        inStock: 15,
        attributes: JSON.stringify({
          color: ['Black/Red', 'Blue/White', 'Grey/Yellow'],
          sizes: [7, 8, 9, 10, 11, 12],
          material: 'Synthetic mesh'
        })
      },
      {
        name: 'Women\'s Yoga Pants',
        description: 'High-waisted yoga pants with pocket, perfect for workout or casual wear',
        price: 49.99,
        category: 'Clothing',
        sku: 'CLOTH-YP-002',
        inStock: 30,
        attributes: JSON.stringify({
          color: ['Black', 'Navy', 'Grey'],
          sizes: ['XS', 'S', 'M', 'L', 'XL'],
          material: '88% polyester, 12% spandex'
        })
      },
      {
        name: 'Stainless Steel Cookware Set',
        description: '10-piece cookware set with non-stick coating',
        price: 199.99,
        category: 'Home & Kitchen',
        sku: 'HOME-CW-001',
        inStock: 8,
        attributes: JSON.stringify({
          pieces: 10,
          material: 'Stainless steel',
          dishwasherSafe: true
        })
      },
      {
        name: 'Smart Coffee Maker',
        description: 'Programmable coffee maker with smartphone control',
        price: 129.99,
        category: 'Home & Kitchen',
        sku: 'HOME-CF-002',
        inStock: 12,
        attributes: JSON.stringify({
          capacity: '12 cups',
          programmable: true,
          connectivity: 'WiFi'
        })
      },
      {
        name: 'Mountain Bike',
        description: 'All-terrain mountain bike with 21 speeds',
        price: 349.99,
        category: 'Sports & Outdoors',
        sku: 'SPORT-BK-001',
        inStock: 5,
        attributes: JSON.stringify({
          frameMaterial: 'Aluminum',
          wheelSize: '27.5 inches',
          speeds: 21,
          brakeType: 'Disc'
        })
      },
      {
        name: 'Camping Tent',
        description: '4-person weatherproof tent for outdoor adventures',
        price: 179.99,
        category: 'Sports & Outdoors',
        sku: 'SPORT-TN-002',
        inStock: 10,
        attributes: JSON.stringify({
          capacity: '4 person',
          waterproof: true,
          dimensions: '8x7x5 feet',
          weight: '9 lbs'
        })
      },
      {
        name: 'Programming Fundamentals',
        description: 'Comprehensive guide to programming basics',
        price: 39.99,
        category: 'Books',
        sku: 'BOOK-PG-001',
        inStock: 20,
        attributes: JSON.stringify({
          author: 'Jane Smith',
          pages: 450,
          format: ['Hardcover', 'Paperback', 'E-book'],
          isbn: '978-1234567890'
        })
      },
      {
        name: 'Cooking Around the World',
        description: 'Collection of international recipes',
        price: 29.99,
        category: 'Books',
        sku: 'BOOK-CK-002',
        inStock: 15,
        attributes: JSON.stringify({
          author: 'Chef Michael Brown',
          pages: 320,
          format: ['Hardcover', 'E-book'],
          isbn: '978-0987654321'
        })
      }
    ].map((product, idx) => ({
      ...product,
      sort_index: idx + 1, // or any integer value
    }));

    const productInsertResult = await db.insert(products).values(productData).returning();
    console.log(`Added ${productInsertResult.length} products to PostgreSQL`);

    // Index products in Typesense
    console.log('Indexing products in Typesense...');
    // After inserting into DB, re-attach sort_index for Typesense
    const typesenseData = productInsertResult.map((product, idx) => {
      const plainProduct = typeof product === 'object' ? { ...product } : product;

      const productForIndex: any = {
        ...plainProduct,
        id: String(plainProduct.id),
        sort_index: idx + 1,
      };

      // Always stringify attributes for Typesense
      if (plainProduct.attributes) {
        productForIndex.attributes = typeof plainProduct.attributes === 'string'
          ? plainProduct.attributes
          : JSON.stringify(plainProduct.attributes);
      } else {
        productForIndex.attributes = '{}';
      }

      productForIndex.createdAt = new Date().toISOString();
      productForIndex.updatedAt = new Date().toISOString();

      return productForIndex;
    });
    
    try {
      const indexResult = await indexProducts(typesenseData);
      console.log(`Indexed ${typesenseData.length} products in Typesense`);
    } catch (indexError) {
      console.error('Error indexing products in Typesense:', indexError);
      console.log('Continuing with database seeding...');
    }

    console.log('Database and search engine seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database and search engine:', error);
    throw error;
  }
}

// Execute the seeding if this file is run directly
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };