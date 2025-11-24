# Git Copilot Instructions

## Project: BeeFriendz Backend with Supabase

This is a Node.js Express backend application integrated with Supabase for database operations.

### Key Setup Information
- **Language**: JavaScript (Node.js)
- **Framework**: Express.js
- **Database**: Supabase
- **Key Dependencies**: @supabase/supabase-js, express, dotenv, cors

### Installation
1. Run `npm install` to install dependencies
2. Copy `.env.example` to `.env` and add your Supabase credentials
3. Run `npm run dev` for development

### Project Structure
- `src/config/` - Supabase configuration
- `src/routes/` - API route definitions
- `src/controllers/` - Business logic and database operations
- `src/server.js` - Express server entry point

### Development
- Use `npm run dev` for development with hot reload
- Use `npm start` for production

### API Documentation
- `GET /api/data/:tableName` - Get all records from a table
- `GET /api/data/:tableName/:id` - Get a specific record
- `POST /api/data/:tableName` - Create a new record
- `PUT /api/data/:tableName/:id` - Update a record
- `DELETE /api/data/:tableName/:id` - Delete a record
