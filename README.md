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

## Requirements

- Node.js >= 18
- A Google AI Studio API key ([get one free](https://aistudio.google.com/apikey))
- A WordPress site with Application Passwords enabled

## Install & Run

### Option 1: npx (no install needed)

```bash
npx internal-linking-tool
```

### Option 2: Install globally

```bash
npm install -g internal-linking-tool
internal-linking-tool
```

Then open **http://localhost:3000** in your browser.

## Usage

1. Click **New Project** and enter your WordPress domain
2. Enter your **Gemini API key** and **WordPress credentials** (username + Application Password)
3. Click **Fetch** to crawl your site content
4. Run **AI Suggestions** to generate internal link recommendations
5. **Review & approve** suggestions, then **Apply** to push changes to WordPress

> **Tip:** Toggle **AutoPilot** on the New Project page for a fully automated run.

## Configuration

All settings (API keys, WordPress credentials) are configured per-project through the UI — no `.env` file needed.

For advanced usage or development, you can optionally set environment variables:

```env
PORT=3000                    # Server port (default: 3000)
GEMINI_API_KEY=your_key      # Fallback Gemini API key
WP_USERNAME=your_username    # Fallback WP username
WP_APP_PASSWORD=your_pass    # Fallback WP Application Password
```

## Development

```bash
git clone https://github.com/your-username/internal-linking-tool.git
cd internal-linking-tool
npm run install-all
npm run dev
```

| Command | Description |
|---------|-------------|
| `npm start` | Start production server on port 3000 |
| `npm run dev` | Start backend + frontend in dev mode |
| `npm run build` | Build the React frontend |
| `npm run install-all` | Install all dependencies (backend + frontend) |

## License

MIT
