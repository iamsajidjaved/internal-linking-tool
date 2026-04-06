# Internal Linking Tool

AI-powered WordPress internal linking tool using Google Gemini. Automatically analyzes your site content, suggests relevant internal links based on 12 SEO techniques, and applies them directly to your WordPress site.

## Features

- **Sitemap & WordPress API crawling** – fetches all posts, pages, and categories
- **AI-powered analysis** – Google Gemini analyzes content and suggests contextual internal links
- **12 SEO techniques** – pillar/cluster linking, orphan page rescue, topical authority, and more
- **Review & approve workflow** – approve/reject individual suggestions or in bulk
- **One-click apply** – pushes approved links to WordPress via the REST API
- **AutoPilot mode** – fully automated pipeline: fetch → analyze → suggest → approve → apply
- **Resume support** – pick up where you left off if interrupted
- **Export** – download approved suggestions as JSON, Excel, or Word
- **Settings UI** – configure API keys and WordPress credentials from the browser

## Requirements

- Node.js >= 18
- A Google AI Studio API key (Gemini)
- A WordPress site with Application Passwords enabled

## Quick Start

### Install globally

```bash
npm install -g internal-linking-tool
```

### Or use npx

```bash
npx internal-linking-tool
```

### Or clone and run locally

```bash
git clone <your-repo-url>
cd internal-linking-tool
npm run install-all
cp .env.example .env
# Edit .env with your Gemini API key
npm run dev
```

## Configuration

Copy `.env.example` to `.env` and fill in:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here

# Optional – can also be set in the Settings UI
# DOMAIN=https://example.com
# WP_USERNAME=your_wp_username
# WP_APP_PASSWORD=your_wp_app_password
```

Or configure everything from the **Settings** page in the UI after starting the server.

## Usage

1. Start the server: `npm start` (production) or `npm run dev` (development)
2. Open `http://localhost:3000` in your browser
3. Go to **Settings** and enter your Gemini API key
4. Click **New Project**, enter your WordPress domain and credentials
5. Toggle **AutoPilot** on for a fully automated run, or proceed manually:
   - Review fetched content
   - Run AI analysis and link suggestions
   - Approve/reject suggestions
   - Apply approved links to WordPress

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the production server |
| `npm run dev` | Start backend + frontend in development mode |
| `npm run build` | Build the React frontend |
| `npm run install-all` | Install all dependencies (backend + frontend) |

## License

MIT
