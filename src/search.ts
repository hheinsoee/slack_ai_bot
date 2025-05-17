import { searchProducts as typesenseSearch } from './typesense';
import { db } from './db';
import { productSearchHistory } from './schema';

/**
 * SearchOptions interface for product search parameters
 */
export interface SearchOptions {
  query?: string;
  category?: string | string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'price' | 'name' | 'created_at' | 'sort_index';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search products using Typesense
 */
export async function searchProducts(options: SearchOptions = {}) {
  try {
    const {
      query = '',
      category,
      minPrice,
      maxPrice,
      inStock,
      limit = 10,
      offset = 0,
      sortBy = 'sort_index',
      sortOrder = 'asc',
    } = options;

    // Helper function to check if a field is sortable
    function isSortableField(field: string): boolean {
      return ['price', 'sort_index', 'inStock'].includes(field);
    }
    
    // Build Typesense search parameters
    const searchParameters: any = {
      q: query,
      query_by: 'name,description,sku',
      sort_by: sortBy && (sortBy !== 'name' && isSortableField(sortBy)) ? `${sortBy}:${sortOrder}` : undefined,
      page: Math.floor(offset / limit) + 1,
      per_page: limit,
      facet_by: 'category,inStock',
    };

    // Add filter conditions
    const filterBy: string[] = [];

    // Category filter
    if (category) {
      if (Array.isArray(category)) {
        filterBy.push(`category:=[${category.map(c => `'${c}'`).join(',')}]`);
      } else {
        filterBy.push(`category:='${category}'`);
      }
    }

    // Price range filter
    if (minPrice !== undefined) {
      filterBy.push(`price:>=${minPrice}`);
    }
    if (maxPrice !== undefined) {
      filterBy.push(`price:<=${maxPrice}`);
    }

    // Stock availability filter
    if (inStock !== undefined) {
      filterBy.push(inStock ? 'inStock:>0' : 'inStock:=0');
    }

    // Add filters to search parameters if any
    if (filterBy.length > 0) {
      searchParameters.filter_by = filterBy.join(' && ');
    }

    // Execute the search
    const results = await typesenseSearch(searchParameters);
    
    // Handle error or empty results case
    if (('error' in results && results.error) || !results.hits) {
      return {
        count: 0,
        results: [],
        facets: [],
        pagination: {
          limit: 10,
          offset: 0,
          total: 0,
          current_page: 1,
          total_pages: 0
        }
      };
    }
    
    return {
      count: results.found || 0,
      results: results.hits.map(hit => ({
        ...hit.document,
        score: hit.text_match || 0
      })),
      facets: 'facet_counts' in results && results.facet_counts ? results.facet_counts : [],
      pagination: {
        limit: 10,
        offset: offset,
        total: results.found || 0,
        current_page: results.page || 1,
        total_pages: results.found ? Math.ceil(results.found / limit) : 0
      }
    };
  } catch (error) {
    // Check for specific error about field not found in schema
    if (error instanceof Error && error.message.includes('Could not find a field named')) {
      console.error('Field schema mismatch in Typesense search:', error.message);
    } else {
      console.error('Error searching products with Typesense:', error);
    }
    // Return empty result instead of throwing
    return {
      count: 0,
      results: [],
      facets: [],
      pagination: {
        limit: 10,
        offset: 0,
        total: 0,
        current_page: 1,
        total_pages: 0
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Parse natural language query to extract search parameters
 */
export function parseSearchQuery(query: string): SearchOptions {
  const options: SearchOptions = {
    query: query,
  };

  // Extract price range
  const priceRangeMatch = query.match(/(\$\d+(\.\d+)?)\s*-\s*(\$\d+(\.\d+)?)/);
  if (priceRangeMatch) {
    options.minPrice = parseFloat(priceRangeMatch[1].replace('$', ''));
    options.maxPrice = parseFloat(priceRangeMatch[3].replace('$', ''));
  } else {
    // Check for "under $X" or "less than $X"
    const underPriceMatch = query.match(/(?:under|less than|below)\s*\$(\d+(\.\d+)?)/i);
    if (underPriceMatch) {
      options.maxPrice = parseFloat(underPriceMatch[1]);
    }
    
    // Check for "over $X" or "more than $X"
    const overPriceMatch = query.match(/(?:over|more than|above)\s*\$(\d+(\.\d+)?)/i);
    if (overPriceMatch) {
      options.minPrice = parseFloat(overPriceMatch[1]);
    }
  }

  // Extract category
  const categoryMatch = query.match(/(?:in|category|from)\s+(?:the\s+)?(?:category\s+)?["']?([a-zA-Z\s&]+)["']?/i);
  if (categoryMatch) {
    options.category = categoryMatch[1].trim();
  }

  // Extract in-stock requirement
  if (query.match(/(?:in stock|available)/i)) {
    options.inStock = true;
  }

  // Extract sorting preferences
  if (query.match(/(?:cheapest|lowest price|price.*low to high)/i)) {
    options.sortBy = 'price';
    options.sortOrder = 'asc';
  } else if (query.match(/(?:most expensive|highest price|price.*high to low)/i)) {
    options.sortBy = 'price';
    options.sortOrder = 'desc';
  } else if (query.match(/(?:newest|latest|recent)/i)) {
    options.sortBy = 'created_at';
    options.sortOrder = 'desc';
  } else if (query.match(/(?:alphabetical|a to z)/i)) {
    options.sortBy = 'sort_index';  // Using sort_index instead of name since name is not sortable
    options.sortOrder = 'asc';
  } else if (query.match(/(?:reverse alphabetical|z to a)/i)) {
    options.sortBy = 'sort_index';  // Using sort_index instead of name since name is not sortable
    options.sortOrder = 'desc';
  }

  return options;
}

/**
 * Log search query to history
 */
export async function logSearchQuery(query: string, userId?: string, results?: any) {
  try {
    // Safely stringify results, handling circular references
    let stringifiedResults = null;
    if (results) {
      try {
        stringifiedResults = JSON.stringify(results);
      } catch (jsonError) {
        console.warn('Could not stringify search results for logging:', jsonError);
        stringifiedResults = JSON.stringify({
          count: results.count,
          query: query,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    await db.insert(productSearchHistory).values({
      query,
      userId,
      results: stringifiedResults,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error logging search query:', error);
  }
}

/**
 * Get related search suggestions based on a query
 */
interface TypesenseHit {
  document?: {
    name?: string;
    category?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

interface TypesenseSearchResult {
  hits?: TypesenseHit[];
  error?: any;
  found?: number;
  page?: number;
  request_params?: any;
  search_time_ms?: number;
  facet_counts?: any[];
  [key: string]: any;
}

// Update the function signature to use the type
export async function getSearchSuggestions(partialQuery: string, limit = 5): Promise<string[]> {
  try {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }
    
    // Use Typesense for autocomplete suggestions
    const suggestions: TypesenseSearchResult = await typesenseSearch({
      q: partialQuery,
      query_by: 'name,category',
      prefix: true,
      per_page: limit,
    });
    
    // Handle error or empty results
    if ((suggestions.error) || !Array.isArray(suggestions.hits)) {
      return [];
    }
    
    // Extract unique terms from results
    const terms = new Set<string>();
    
    suggestions.hits?.forEach(hit => {
      if (!hit.document) return;
      
      // Add product name-based suggestions
      if (hit.document.name) {
        const name = hit.document.name.toLowerCase();
        if (name.includes(partialQuery.toLowerCase())) {
          terms.add(hit.document.name);
        }
      }
      
      // Add category-based suggestions
      if (hit.document.name && hit.document.category) {
        terms.add(`${hit.document.name} in ${hit.document.category}`);
      }
    });
    
    return Array.from(terms).slice(0, limit);
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    return [];
  }
}