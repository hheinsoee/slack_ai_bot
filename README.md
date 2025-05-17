# Slack Product Database Chat Bot with Typesense

A Slack bot that allows users to search products in a database using natural language queries. The bot leverages AI to understand user intent and provides fast, typo-tolerant search results using Typesense.

[![Built with TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Powered by Typesense](https://img.shields.io/badge/Powered%20by-Typesense-brightgreen?style=flat-square)](https://typesense.org/)
[![Slack API](https://img.shields.io/badge/Slack-API-4A154B?style=flat-square)](https://api.slack.com/)

## Features

- Natural language product search with Typesense
- Fast, typo-tolerant search with faceting and filtering
- Database integration with PostgreSQL for data persistence
- Intent classification for different types of queries
- Smart query parsing to extract search parameters
- Simple deployment with Docker

## Prerequisites

- Node.js (v16+)
- Docker and Docker Compose (for running PostgreSQL and Typesense)
- Slack API credentials
- Google AI API key (for Gemini model)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd slack_bot
```

### 2. Install dependencies

```bash
npm install
# or
pnpm install
```

### 3. Set up environment variables

Copy the example environment file and edit it with your credentials:

```bash
cp .env.example .env
```

Edit the `.env` file with your:
- Slack Bot Token
- Slack Signing Secret
- Database connection string
- Google API Key

### 4. Set up the database and search engine

Start PostgreSQL and Typesense using Docker:

```bash
docker-compose up -d
```

Run database initialization and seed data (this will also populate Typesense):

```bash
npm run db:setup
```

If you encounter any TypeScript errors, make sure all dependencies are installed:

```bash
pnpm add -D @types/pg
```

### 5. Start the bot

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm run build
npm start
```

## Usage

The bot responds to both direct messages and mentions in channels:

### Direct Messages
Simply send a message to the bot with your product query.

Examples:
- "Do you have any running shoes under $50?"
- "Show me red t-shirts in stock"
- "What's the price range for laptops?"

### Channel Mentions
Mention the bot in a channel followed by your query.

Examples:
- "@productbot I'm looking for kitchen appliances under $100"
- "@productbot Do you have any gaming keyboards in stock?"

## Advanced Search Queries

The bot understands various search parameters and leverages Typesense for fast, typo-tolerant searches:

- **Price ranges**: "between $20 and $50", "under $30", "more than $100"
- **Categories**: "in the electronics category", "from kitchen appliances"
- **Availability**: "in stock", "available now"
- **Sorting**: "cheapest first", "sort by price", "newest items", "alphabetical"
- **Typo tolerance**: Automatically handles typos and misspellings
- **Instant results**: Fast search response even with large product catalogs

## Architecture

The application uses a dual-storage approach:

### PostgreSQL Database
- Products table with details like name, description, price, SKU, etc.
- Categories table for product categorization
- Search history tracking for analytics

### Typesense Search Engine
- Optimized for fast, typo-tolerant search
- Automatically synced with PostgreSQL data
- Provides faceting, filtering, and ranking capabilities
- Handles complex queries with high performance

## Troubleshooting

### TypeScript Errors

If you encounter TypeScript errors related to missing type definitions:

```
Error: Could not find a declaration file for module 'pg'
```

Install the missing type definitions:

```bash
pnpm add -D @types/pg
```

### Database Connection Issues

If you have issues connecting to the database:

1. Make sure Docker is running
2. Check that the PostgreSQL container is up: `docker-compose ps`
3. Verify your DATABASE_URL in the .env file
4. Try initializing the database manually: `npm run db:init`

### Typesense Connection Issues

If Typesense search isn't working:

1. Check that the Typesense container is running: `docker-compose ps`
2. Verify your Typesense configuration in the .env file
3. Try running the search test to diagnose: `npm run test:search`

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/my-new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Development Notes

### Project Structure

```
slack_bot/
├── docker-compose.yml    # Docker configuration for PostgreSQL and Typesense
├── drizzle/              # Database migration files
├── drizzle.config.ts     # Drizzle ORM configuration
├── package.json          # Project dependencies and scripts
├── src/
│   ├── aiAPI.ts          # AI integration for natural language processing
│   ├── db.ts             # Database connection setup
│   ├── index.ts          # Main application entry point
│   ├── init-db.ts        # Database initialization script
│   ├── schema.ts         # Database schema definitions
│   ├── search.ts         # Search utility for product queries
│   ├── seed.ts           # Data seeding script
│   ├── test-typesense.ts # Test script for Typesense search
│   └── typesense.ts      # Typesense client and configuration
└── tsconfig.json         # TypeScript configuration
```

### Useful Commands

- `pnpm run dev`: Start the bot in development mode with hot reloading
- `pnpm run build`: Build the TypeScript project
- `pnpm run start`: Start the bot in production mode
- `pnpm run db:init`: Initialize the database schema
- `pnpm run db:seed`: Seed the database with sample data
- `pnpm run test:search`: Test the Typesense search functionality