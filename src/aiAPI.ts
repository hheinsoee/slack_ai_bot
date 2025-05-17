import OpenAI from "openai";
import * as dotenv from "dotenv";
import { searchProducts, parseSearchQuery } from "./search";
import type { SearchOptions } from "./search";

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.GOOGLE_API_KEY,
  baseURL: process.env.OPENAI_SERVER_URL,
  defaultHeaders: {
    "Content-Type": "application/json",
  },
});

export interface AIResponse {
  text: string;
  data?: any;
  error?: string;
}

/**
 * Classifies the intent of the user's message
 * @param message The user's message
 * @returns The classified intent
 */
async function classifyIntent(message: string): Promise<{
  intent: "product_search" | "general_question" | "greeting" | "unknown";
  confidence: number;
}> {
  try {
    console.log("Classifying intent for message:", message);
    const completion = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant that classifies customer queries about products.
          Respond with a JSON object containing:
          - intent: One of "product_search", "general_question", "greeting", or "unknown"
          - confidence: A number between 0 and 1 indicating your confidence in this classification
          
          Examples:
          - "Do you have any red shoes?" -> {"intent": "product_search", "confidence": 0.9}
          - "What are your store hours?" -> {"intent": "general_question", "confidence": 0.8}
          - "Hello there" -> {"intent": "greeting", "confidence": 0.95}`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content || "{}";
    return JSON.parse(response);
  } catch (error) {
    console.error("Error classifying intent:", error);
    return { intent: "unknown", confidence: 0 };
  }
}

/**
 * Handles a product search query
 * @param message The user's message
 * @returns The AI response
 */
async function handleProductSearch(message: string): Promise<AIResponse> {
  try {
    // Parse the search query to extract search parameters
    const searchOptions = await aiParseSearchQuery(message);
    console.log("Parsed search options:", {searchOptions});
    // Search products with the extracted parameters
    const searchResults = await searchProducts(searchOptions);
    
    // Use AI to format the response
    const completion = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "system",
          content: `You are a helpful product search assistant.
          Format your responses in a friendly, conversational way.
          Highlight key product details and format prices with $ sign.
          If no results are found, suggest alternatives or clarifying questions.`,
        },
        {
          role: "user",
          content: `I searched for: "${message}"
          Search parameters: ${JSON.stringify(searchOptions)}
          Results (${searchResults.count} found): ${JSON.stringify(searchResults.results)}
          
          Please format these results in a helpful way.`,
        },
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 
      "I'm sorry, I couldn't format the search results.";
    
    return { 
      text: response,
      data: searchResults
    };
  } catch (error) {
    console.error("Error in product search:", error);
    return {
      text: "I had trouble searching for products. Could you try again with a different query?",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Handles a general question
 * @param message The user's message
 * @returns The AI response
 */
async function handleGeneralQuestion(message: string): Promise<AIResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "system",
          content: `You are a helpful assistant for a retail store.
          You can answer questions about products, store policies, shipping, returns, etc.
          If you don't know the answer, acknowledge that and offer to connect the customer with a human.`,
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || 
      "I'm sorry, I couldn't generate a response.";
    
    return { text: response };
  } catch (error) {
    console.error("Error handling general question:", error);
    return {
      text: "I'm having trouble processing your question. Could you try asking in a different way?",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Uses AI to parse a natural language search query into structured search options.
 */
export async function aiParseSearchQuery(query: string): Promise<SearchOptions> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gemini-2.0-flash",
      messages: [
        {
          role: "system",
          content: `You are an assistant that extracts structured product search parameters from user queries.
          Given a user's search query, respond with a JSON object with these optional fields:
          - query: string (the main search text)
          - category: string
          - minPrice: number
          - maxPrice: number
          - inStock: boolean
          - sortBy: "price" | "name" | "created_at"
          - sortOrder: "asc" | "desc"
          Only include fields that are present in the user's query.`
        },
        {
          role: "user",
          content: query,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const response = completion.choices[0]?.message?.content || "{}";
    return JSON.parse(response);
  } catch (error) {
    console.error("Error parsing search query with AI:", error);
    // Fallback to default parser if AI fails
    return parseSearchQuery(query);
  }
}

/**
 * Main function to get AI response
 * @param message The user's message
 * @returns The AI response
 */
export async function getAIResponse(message: string): Promise<AIResponse> {
  try {
    // First, classify the intent of the message
    const { intent, confidence } = await classifyIntent(message);
    console.log(`Classified intent: ${intent} (confidence: ${confidence})`);
    
    // Handle the message based on the classified intent
    switch (intent) {
      case "product_search":
        return await handleProductSearch(message);
      
      case "general_question":
      case "greeting":
      case "unknown":
      default:
        return await handleGeneralQuestion(message);
    }
  } catch (error) {
    console.error("Error in AI response:", error);
    return {
      text: "I'm having trouble processing your request right now. Please try again later.",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}