import * as dotenv from 'dotenv';
import { initializeTypesense, searchProducts } from './typesense';
import { parseSearchQuery, searchProducts as search } from './search';

// Load environment variables
dotenv.config();

async function testTypesenseSearch() {
  try {
    console.log('=== Typesense Search Test ===');
    
    // Initialize Typesense
    console.log('Initializing Typesense...');
    await initializeTypesense();
    
    // Test direct Typesense search
    console.log('\nTesting direct Typesense search:');
    const directResult = await searchProducts({
      q: 'phone',
      query_by: 'name,description',
      per_page: 5
    });
    
    console.log(`Found ${directResult.found} results`);
    if (directResult.hits && directResult.hits.length > 0) {
      console.log('First result:', JSON.stringify(directResult.hits[0], null, 2));
    } else {
      console.log('No results found.');
    }
    
    // Test search via search utility
    console.log('\nTesting search utility:');
    const testQueries = [
      'smartphone under $700',
      'camping equipment in stock',
      'books about cooking',
      'wireless headphones',
      'running shoes size 10'
    ];
    
    for (const query of testQueries) {
      console.log(`\nSearching for: "${query}"`);
      
      // Parse the query
      const searchOptions = parseSearchQuery(query);
      console.log('Parsed search options:', searchOptions);
      
      // Execute the search
      const results = await search(searchOptions);
      console.log(`Found ${results.count} results`);
      
      if (results.count > 0) {
        console.log('Top results:');
        results.results.slice(0, 2).forEach((result, index) => {
          // If result has a 'document' property (common in Typesense), use it
          const doc = (result as any).document || result;
          console.log(`${index + 1}. ${doc.name ?? 'N/A'} - $${doc.price ?? 'N/A'}`);
        });
      }
    }
    
    // Test typo tolerance
    console.log('\nTesting typo tolerance:');
    const typoQueries = ['smarphone', 'wireless haedphones', 'campin tent'];
    
    for (const query of typoQueries) {
      console.log(`\nSearching with typo: "${query}"`);
      const results = await search({ query });
      console.log(`Found ${results.count} results despite typo`);
      
      if (results.count > 0) {
        const topResult = (results.results[0] as any).document || results.results[0];
        console.log('Top result:', topResult.name ?? 'N/A');
      }
    }
    
    console.log('\n=== Test completed successfully ===');
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testTypesenseSearch()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testTypesenseSearch };