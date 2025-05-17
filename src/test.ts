import * as dotenv from "dotenv";
dotenv.config();

import { getAIResponse } from "./aiAPI";

async function main() {
  const testMessages = [
    "Do you have any red shoes?",
    // "What are your store hours?",
    // "Hello there!",
    // "Show me books under $50",
    // "Is there a camping tent in stock?",
  ];

  for (const msg of testMessages) {
    console.log(`\nUser: ${msg}`);
    const response = await getAIResponse(msg);
    console.log("AI:", response.text);
    if (response.error) {
      console.error("AI Error:", response.error);
    }
  }
}

main().catch((err) => {
  console.error("Test script error:", err);
});