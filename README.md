# AI Email Summarizer Workflow

A full-stack workflow automation tool that automatically summarizes and categorizes emails using OpenAI APIs, stores results in a Neon PostgreSQL database, and provides a Gmail-like React dashboard for viewing and managing summaries.

## Features

- 🤖 **AI-Powered Summarization**: Uses OpenAI GPT-4o-mini to generate concise 2-3 sentence summaries
- 📊 **Automatic Categorization**: Classifies emails into categories (Meeting, Invoice, Support Request, etc.)
- 🔑 **Keyword Extraction**: Extracts 5-10 key terms from each email
- 💾 **Database Storage**: Stores all summaries in Neon PostgreSQL using Drizzle ORM
- 🎨 **Gmail-like Dashboard**: Modern React + TypeScript + Material-UI interface with tabbed navigation
- 🔍 **Advanced Filtering**: Filter by tabs (All, Primary, Promotions, Social) with real-time search
- 📎 **PDF Attachment Support**: Upload emails with PDF attachments for invoice/payslip extraction
- 💰 **Invoice Data Extraction**: Automatically extracts itemized data from PDF invoices and payslips
- 🔄 **Re-summarize**: Re-process any email to get updated summary
- 🗑️ **Batch Delete**: Select and delete multiple emails at once
- 📥 **CSV Export**: Export summaries as CSV files
- 📧 **Mock Data**: Load sample emails for testing

## Tech Stack

### Backend
- **Runtime**: Node.js with ES Modules
- **Framework**: Fastify
- **Database**: Neon PostgreSQL
- **ORM**: Drizzle ORM
- **AI**: OpenAI API (GPT-4o-mini)
- **Validation**: Zod
- **PDF Processing**: pdf-parse library

### Frontend
- **Framework**: React 18 + TypeScript
- **UI Library**: Material-UI (MUI)
- **Build Tool**: Vite
- **HTTP Client**: Axios

## Prerequisites

- Node.js 18+ and npm
- Neon PostgreSQL database (free tier available)
- OpenAI API key

## Setup Instructions

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

📖 **See `INSTALLATION.md` for detailed installation instructions**

### 2. Database Setup

📖 **See `DATABASE_SETUP.md` for complete step-by-step instructions**

Quick steps:
1. Go to https://console.neon.tech and create a free account
2. Create a new project
3. Copy your connection string from the dashboard
4. Add it to `backend/.env` as `DATABASE_URL`

### 3. Environment Configuration

#### Backend Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your credentials:

```env
DATABASE_URL=your_neon_postgresql_connection_string
OPENAI_API_KEY=your_openai_api_key
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Important**: 
- Get your Neon database URL from: https://console.neon.tech (see `DATABASE_SETUP.md` for detailed instructions)
- Get your OpenAI API key from: https://platform.openai.com/api-keys

#### Frontend Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
cd frontend
cp .env.example .env
```

The default `frontend/.env` should work for local development:

```env
VITE_API_URL=http://localhost:3001/api
```

### 4. Database Migration

Run the database migration to create the schema:

```bash
cd backend
npm run db:generate  # Generate migration files
npm run db:migrate   # Apply migrations to database
```

If successful, you'll see: "Migrations completed successfully!"

### 5. Start the Application

#### Option 1: Run Both Services Together (Recommended)

From the root directory:

```bash
npm run dev
```

This will start:
- Backend server on `http://localhost:3001`
- Frontend dev server on `http://localhost:3000`

#### Option 2: Run Services Separately

**Backend:**
```bash
cd backend
npm run dev
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## Usage

1. **Access the Dashboard**: Open `http://localhost:3000` in your browser
2. **Load Mock Emails**: Click "Load Mock Emails" to process sample emails
3. **Upload Email with PDF**: Click "Upload Email" to add a new email, optionally with a PDF attachment
4. **View Summaries**: Browse all summaries in the Gmail-like table view
5. **Filter by Tabs**: Use tabs (All, Primary, Promotions, Social) to filter emails
6. **Search**: Use the search bar to find emails by sender, subject, summary, category, or keywords
7. **View Details**: Click the eye icon to view full email details and invoice data
8. **Re-summarize**: Click the refresh icon to re-process an email
9. **Batch Operations**: Select multiple emails using checkboxes and delete them in bulk
10. **Export CSV**: Click "Export CSV" to download all summaries

## API Endpoints

### Email Summaries

- `GET /api/summaries` - Get all summaries (optional `?category=Meeting` query param)
- `GET /api/summaries/:id` - Get single summary by ID
- `POST /api/summaries` - Create single summary (supports multipart/form-data for PDF attachments)
- `POST /api/summaries/batch` - Batch create summaries
- `POST /api/summaries/:id/resummarize` - Re-summarize an email
- `DELETE /api/summaries/:id` - Delete a summary
- `GET /api/summaries/export` - Export summaries as CSV

### PDF Processing

- `POST /api/pdf/extract` - Extract invoice data from uploaded PDF
- `GET /api/pdf/test` - Test PDF extraction with sample invoice
- `POST /api/pdf/debug` - Debug endpoint to view raw extracted PDF text

### Mock Data

- `POST /api/mock/load` - Load and process mock emails
- `GET /api/mock/emails` - Get raw mock email data

### Health Check

- `GET /health` - Server health status

## Project Structure

```
captivix-AI-Email-Summarizer/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle schema definitions
│   │   │   ├── index.ts           # Database connection
│   │   │   └── migrate.ts         # Migration script
│   │   ├── routes/
│   │   │   ├── emails.routes.ts   # Email summary routes
│   │   │   ├── mock.routes.ts     # Mock data routes
│   │   │   └── pdf.routes.ts      # PDF processing routes
│   │   ├── services/
│   │   │   ├── openai.service.ts  # OpenAI API integration
│   │   │   ├── email.service.ts   # Email business logic
│   │   │   └── pdf.service.ts    # PDF extraction service
│   │   ├── data/
│   │   │   └── mock-emails.json   # Sample email data
│   │   └── index.ts               # Fastify server entry
│   ├── drizzle/                   # Generated migrations
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── EmailDashboard.tsx # Main dashboard component
│   │   │   ├── Header.tsx         # App header
│   │   │   ├── LoadingSpinner.tsx  # Loading component
│   │   │   ├── KeywordsDisplay.tsx # Keywords display component
│   │   │   └── UploadEmailDialog.tsx # Email upload dialog
│   │   ├── services/
│   │   │   └── email.service.ts   # API client
│   │   ├── types/
│   │   │   └── index.ts           # TypeScript types
│   │   ├── App.tsx                # Main app component
│   │   └── main.tsx               # React entry point
│   └── package.json
└── README.md
```

## Design Decisions

### Backend Architecture

1. **Fastify over Express**: Faster performance and better TypeScript support
2. **Drizzle ORM**: Type-safe, lightweight ORM with excellent TypeScript integration
3. **Zod Validation**: Runtime type validation for API requests
4. **Service Layer Pattern**: Separates business logic from route handlers
5. **Error Handling**: Comprehensive error handling with meaningful messages
6. **PDF Processing**: Uses pdf-parse library for text extraction from PDF attachments

### Frontend Architecture

1. **Component Composition**: Reusable, isolated components
2. **TypeScript Strict Mode**: Full type safety throughout
3. **Material-UI**: Consistent, accessible UI components
4. **Service Layer**: Centralized API communication
5. **Error Boundaries**: User-friendly error messages
6. **Gmail-like UI**: Tabbed navigation with search and batch operations

### AI Integration

1. **Structured Output**: Uses JSON mode for consistent responses
2. **Prompt Engineering**: Carefully crafted prompts for accurate categorization and invoice extraction
3. **Error Handling**: Graceful degradation when API calls fail
4. **Rate Limiting**: Built-in delays for batch processing
5. **PDF Analysis**: Specialized prompts for extracting financial data from payslips and invoices

### Database Design

1. **UUID Primary Keys**: Better for distributed systems
2. **Timestamps**: Automatic tracking of creation and updates
3. **Array Support**: Keywords stored as PostgreSQL arrays
4. **JSON Support**: Invoice data stored as JSONB for flexible structure
5. **Indexing**: Optimized for category filtering

## Bonus Features Implemented

✅ **Keyword Extraction**: Automatically extracts 5-10 keywords from each email  
✅ **CSV Export**: Download summaries as CSV files via `/api/summaries/export`  
✅ **Batch Processing**: Efficient handling of multiple emails  
✅ **Error Recovery**: Continues processing even if some emails fail  
✅ **PDF Invoice Extraction**: Extracts itemized data from PDF invoices and payslips  
✅ **Gmail-like Interface**: Tabbed navigation (All, Primary, Promotions, Social) with search  
✅ **Batch Operations**: Select and delete multiple emails at once  
✅ **Real-time Search**: Debounced search across sender, subject, summary, category, and keywords  

## Troubleshooting

### Database Connection Issues

- Verify your `DATABASE_URL` is correct
- Ensure your Neon database is active
- Check that SSL mode is enabled in the connection string

### OpenAI API Errors

- Verify your API key is correct
- Check your OpenAI account has credits
- Monitor rate limits (batch processing includes delays)

### PDF Extraction Issues

- Ensure PDF files are not image-based (text-based PDFs work best)
- Check PDF file size (max 10MB)
- Verify PDF contains extractable text (not scanned images)
- Use the `/api/pdf/debug` endpoint to view extracted text

### Port Conflicts

- Backend default: 3001 (change in `backend/.env`)
- Frontend default: 3000 (change in `frontend/vite.config.ts`)

## Future Enhancements

- [ ] Real-time email processing via webhooks
- [ ] User authentication and multi-user support
- [ ] OCR support for image-based PDFs
- [ ] Scheduled re-summarization
- [ ] Analytics dashboard
- [ ] Email templates and notifications
- [ ] Advanced filtering with date ranges
- [ ] Email threading and conversation grouping

## License

MIT

## Author

Created as part of a workflow automation assignment demonstrating full-stack development with AI integration.
