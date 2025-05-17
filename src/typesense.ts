import Typesense from 'typesense';
import * as dotenv from 'dotenv';
import { FieldType } from 'typesense/lib/Typesense/Collection';

dotenv.config();

// Configuration for Typesense client
const typesenseConfig = {
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || 'localhost',
      port: parseInt(process.env.TYPESENSE_PORT || '8108', 10),
      protocol: process.env.TYPESENSE_PROTOCOL || 'http',
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || 'xyz123',
  connectionTimeoutSeconds: 2,
};

// Create a Typesense client
export const typesenseClient = new Typesense.Client(typesenseConfig);

// Product collection schema
export const PRODUCTS_COLLECTION = 'products';

export const productCollectionSchema = {
  name: PRODUCTS_COLLECTION,
  fields: [
    { name: 'id', type: 'int32' as FieldType },
    { name: 'name', type: 'string' as FieldType },
    { name: 'description', type: 'string' as FieldType },
    { name: 'price', type: 'float' as FieldType },
    { name: 'category', type: 'string' as FieldType, facet: true },
    { name: 'sku', type: 'string' as FieldType },
    { name: 'inStock', type: 'float' as FieldType, facet: true },
    { name: 'attributes', type: 'string' as FieldType },
    { name: 'createdAt', type: 'string' as FieldType },
    { name: 'updatedAt', type: 'string' as FieldType },
    { name: 'sort_index', type: 'int32' as FieldType },
  ],
  default_sorting_field: 'sort_index',
  enable_nested_fields: true
};

/**
 * Initialize Typesense collections
 */
export async function initializeTypesense() {
  console.log('Initializing Typesense...');
  
  try {
    // First, try to connect to Typesense
    try {
      const health = await typesenseClient.health.retrieve();
      console.log('Typesense server is healthy:', health.ok);
    } catch (healthError) {
      console.error('Typesense health check failed:', healthError);
      return false;
    }
    
    // Check if collection exists
    let collections;
    try {
      collections = await typesenseClient.collections().retrieve();
    } catch (retrieveError) {
      // If we can't retrieve collections, try to create our collection
      console.warn('Could not retrieve collections, will try to create:', retrieveError);
      try {
        await typesenseClient.collections().create(productCollectionSchema);
        console.log(`Collection ${PRODUCTS_COLLECTION} created successfully`);
        return true;
      } catch (createError) {
        console.error('Could not create collection:', createError);
        return false;
      }
    }
    
    // If we retrieved collections successfully, check if ours exists
    const collectionExists = collections.some(
      (collection) => collection.name === PRODUCTS_COLLECTION
    );

    // Create collection if it doesn't exist
    if (!collectionExists) {
      console.log(`Creating collection: ${PRODUCTS_COLLECTION}`);
      await typesenseClient.collections().create(productCollectionSchema);
      console.log('Collection created successfully');
    } else {
      console.log(`Collection ${PRODUCTS_COLLECTION} already exists`);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing Typesense:', error);
    return false;
  }
}

/**
 * Index a single product in Typesense
 */
export async function indexProduct(product: any) {
  try {
    return await typesenseClient
      .collections(PRODUCTS_COLLECTION)
      .documents()
      .upsert(product);
  } catch (error) {
    console.error('Error indexing product:', error);
    throw error;
  }
}

/**
 * Index multiple products in Typesense
 */
export async function indexProducts(products: any[]) {
  try {
    // Make sure products is an array
    if (!Array.isArray(products)) {
      console.error('Expected products to be an array');
      return { failedItems: 0, successfulItems: 0 };
    }
    
    // Skip empty arrays
    if (products.length === 0) {
      console.log('No products to index');
      return { failedItems: 0, successfulItems: 0 };
    }
    
    const result = await typesenseClient
      .collections(PRODUCTS_COLLECTION)
      .documents()
      .import(products, { action: 'upsert' });
    
    // Count successes and failures
    const failedItems = result.filter(item => !item.success).length;
    if (failedItems > 0) {
      console.warn(`${failedItems} of ${products.length} products failed to index`);
    }
    
    return { 
      failedItems,
      successfulItems: products.length - failedItems,
      details: result
    };
  } catch (error) {
    console.error('Error bulk indexing products:', error);
    return { 
      failedItems: products.length, 
      successfulItems: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Search products in Typesense
 */
export async function searchProducts(searchParameters: any) {
  try {
    // Default parameters if none provided
    const params = searchParameters || { q: '*' };
    
    // Ensure query is always defined
    if (!params.q && params.q !== '') {
      params.q = '*';
    }
    
    // Add default pagination if not specified
    if (!params.page) {
      params.page = 1;
    }
    
    if (!params.per_page && params.per_page !== 0) {
      params.per_page = 10;
    }
    
    const result = await typesenseClient
      .collections(PRODUCTS_COLLECTION)
      .documents()
      .search(params);
      
    return result;
  } catch (error) {
    console.error('Error searching products:', error);
    // Return empty result set instead of throwing
    return {
      found: 0,
      hits: [],
      page: 1,
      request_params: searchParameters,
      search_time_ms: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Delete a product from Typesense
 */
export async function deleteProduct(id: number | string) {
  try {
    return await typesenseClient
      .collections(PRODUCTS_COLLECTION)
      .documents(id.toString())
      .delete();
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * Clear all products from Typesense
 */
export async function clearProductsCollection() {
  try {
    // Check if collection exists before attempting to delete
    try {
      const collections = await typesenseClient.collections().retrieve();
      const collectionExists = collections.some(
        (collection) => collection.name === PRODUCTS_COLLECTION
      );
      
      if (collectionExists) {
        // Delete the collection
        await typesenseClient.collections(PRODUCTS_COLLECTION).delete();
        console.log(`Deleted collection: ${PRODUCTS_COLLECTION}`);
      } else {
        console.log(`Collection ${PRODUCTS_COLLECTION} does not exist, nothing to clear`);
      }
    } catch (retrieveError) {
      console.warn('Error checking if collection exists:', retrieveError);
      // Continue anyway to try creating the collection
    }
    
    // Recreate the collection
    try {
      await typesenseClient.collections().create(productCollectionSchema);
      console.log(`Created collection: ${PRODUCTS_COLLECTION}`);
      return true;
    } catch (createError) {
      console.error('Error creating collection:', createError);
      return false;
    }
  } catch (error) {
    console.error('Error clearing products collection:', error);
    return false;
  }
}