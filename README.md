# Slack Product Database Chat Bot with Typesense

A Slack bot for natural language product searches with Typesense integration.

[![Built with TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Powered by Typesense](https://img.shields.io/badge/Powered%20by-Typesense-brightgreen?style=flat-square)](https://typesense.org/)
[![Slack API](https://img.shields.io/badge/Slack-API-4A154B?style=flat-square)](https://api.slack.com/)

## Features
- Natural language product search
- Fast, typo-tolerant search results
- PostgreSQL for data persistence
- Intent classification for queries
- Docker deployment support

## Prerequisites
- Node.js (v16+)
- Docker and Docker Compose
- Slack API credentials
- Google AI API key

## Quick Start
1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd slack_bot
   npm install
   ```

2. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit with your credentials
   ```

3. **Start services and initialize**
   ```bash
   docker-compose up -d
   npm run db:setup  # Combines db:init and db:seed
   ```

   Available database scripts:
   ```bash
   npm run db:init   # Initialize database schema
   npm run db:seed   # Populate with sample data
   npm run db:setup  # Run both init and seed
   npm run db:generate  # Generate migration files
   npm run db:push   # Push schema changes to database
   ```

4. **Run the bot**
   ```bash
   npm run dev    # Development
   # or
   npm run build
   npm start      # Production
   ```

## Usage Examples
- "Do you have running shoes under $50?"
- "Show me red t-shirts in stock"
- "@productbot What's the price range for laptops?"

## Search Capabilities
- Price filtering: "between $20 and $50"
- Category search: "in electronics category"
- Availability check: "in stock"
- Sort options: "cheapest first"
- Handles typos automatically

## Troubleshooting
- TypeScript issues: `pnpm add -D @types/pg`
- Database issues: Check Docker, verify environment variables
- Typesense issues: Run `npm run test:search`

## License
MIT License