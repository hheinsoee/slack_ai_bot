import { App } from "@slack/bolt";
import * as dotenv from "dotenv";
import { getAIResponse } from "./aiAPI";
import { db } from "./db";
import { products } from "./schema";
import { sql } from "drizzle-orm";
import { initializeTypesense } from "./typesense";

// Load environment variables
dotenv.config();

// Validate environment variables
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const PORT = parseInt(process.env.PORT || "3000", 10);

console.log("=== Environment Check ===");
console.log("SLACK_BOT_TOKEN exists:", !!SLACK_BOT_TOKEN);
console.log("SLACK_SIGNING_SECRET exists:", !!SLACK_SIGNING_SECRET);
console.log("OPENAI_SERVER_URL exists:", !!process.env.OPENAI_SERVER_URL);
console.log("GOOGLE_API_KEY exists:", !!process.env.GOOGLE_API_KEY);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("Using port:", PORT);
console.log("========================");

if (!SLACK_BOT_TOKEN || !SLACK_SIGNING_SECRET) {
  console.error("Missing required environment variables!");
  process.exit(1);
}

// Initialize the app
const app = new App({
  token: SLACK_BOT_TOKEN,
  signingSecret: SLACK_SIGNING_SECRET,
  socketMode: false,
  port: PORT,
});

// Test the database connection
async function testDatabaseConnection() {
  try {
    const result = await db.execute(sql`SELECT 1`);
    console.log("Database connection successful!");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Test the Typesense connection
async function testTypesenseConnection() {
  try {
    await initializeTypesense();
    console.log("Typesense connection successful!");
    return true;
  } catch (error) {
    console.error("Typesense connection failed:", error);
    return false;
  }
}

// Initialize the application
async function initializeApp() {
  // Test the database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.warn(
      "Starting without database connection. Some features may not work properly.",
    );
  }

  // Test the Typesense connection
  const typesenseConnected = await testTypesenseConnection();
  if (!typesenseConnected) {
    console.warn(
      "Starting without Typesense connection. Search features may not work properly.",
    );
  }

  // Test the bot's connection
  try {
    const authTest = await app.client.auth.test();
    console.log("=== Bot Connection Test ===");
    console.log("Bot is connected as:", authTest.user);
    console.log("Team:", authTest.team);
    console.log("========================");
  } catch (error) {
    console.error("Failed to connect to Slack:", error);
  }

  // Start listening for events
  try {
    await app.start(PORT);
    console.log(`⚡️ Bolt app is running on port ${PORT}!`);
    console.log("Bot is listening for messages...");
  } catch (error) {
    console.error("Error starting app:", error);
    process.exit(1);
  }
}

// Handle direct messages
// app.event('message', async ({ event, say, client }) => {
//   // Only respond to messages in DM channels
//   if (event.channel_type !== 'im') return;

//   console.log('=== New Direct Message ===');
//   console.log('User:', event.user);
//   console.log('Text:', event.text);

//   try {
//     // Get AI response
//     const aiResponse = await getAIResponse(event.text);

//     if (aiResponse.error) {
//       console.error('AI Error:', aiResponse.error);
//       await say("I'm having trouble processing your request right now. Please try again later.");
//       return;
//     }

//     // Send the response
//     await say(aiResponse.text);
//     console.log('Response sent successfully!');
//   } catch (error) {
//     console.error('Error handling direct message:', error);
//     await say("I'm having trouble processing your message. Please try again later.");
//   }
// });

// Handle mentions
app.event("app_mention", async ({ event, say, client }) => {
  console.log("=== New Mention Received ===");
  console.log("Channel:", event.channel);

  if ("user" in event && "text" in event) {
    const messageText = event.text?.replace(/<@[A-Z0-9]+>/g, "").trim() || "";
    if (!messageText) return;

    console.log("User:", event.user);
    console.log("Text:", messageText);

    try {
      // Get AI response
      const aiResponse = await getAIResponse(messageText);

      if (aiResponse.error) {
        console.error("AI Error:", aiResponse.error);
        await say(
          "I'm having trouble processing your request right now. Please try again later.",
        );
        return;
      }

      // Send the response
      await say(aiResponse.text);
      console.log("Response sent successfully!");
    } catch (error) {
      console.error("Error handling mention:", error);
      await say(
        "I'm having trouble processing your message. Please try again later.",
      );
    }
  }
});

// Add a simple slash command to check bot status
app.command("/botcheck", async ({ command, ack, respond }) => {
  await ack();

  const dbConnected = await testDatabaseConnection();
  const typesenseConnected = await testTypesenseConnection();

  await respond({
    text: `🤖 Bot Status:\n• Connected to Slack: ✅\n• Database Connection: ${dbConnected ? "✅" : "❌"}\n• Typesense Connection: ${typesenseConnected ? "✅" : "❌"}\n• AI API Available: ${process.env.OPENAI_SERVER_URL ? "✅" : "❌"}`,
  });
});

// Add error handling
app.error(async (error) => {
  console.error("App Error:", error);
});

// Initialize the application
initializeApp();
