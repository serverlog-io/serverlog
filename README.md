# Serverlog

Open-source real-time event tracking and analytics platform.

## Features

- **Real-time event tracking** - Stream events instantly via WebSocket
- **Channels & Projects** - Organize events by project and channel
- **User identification** - Track and identify users across events
- **Insights** - Track metrics and KPIs
- **Tags & Parser** - Filter events with custom tags
- **Self-hosted** - Own your data, deploy anywhere

## Quick Start (Docker)

```bash
# Clone the repository
git clone https://github.com/serverlog-io/serverlog.git
cd serverlog

# Configure environment
cp .env.example .env
# Edit .env and set a secure JWT_SECRET

# Start all services
docker compose up -d
```

Access the dashboard at **http://localhost:3011**

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret for JWT tokens (required) | - |
| `POSTGRES_PASSWORD` | Database password | `serverlog` |
| `POSTGRES_USER` | Database user | `serverlog` |
| `POSTGRES_DB` | Database name | `serverlog` |
| `BACKEND_PORT` | API port | `3010` |
| `FRONTEND_PORT` | Dashboard port | `3011` |
| `NEXT_PUBLIC_API_URL` | Backend URL for frontend | `http://localhost:3010` |

## Deploy to Production

### 1. Start Services

```bash
# Clone and configure
git clone https://github.com/serverlog-io/serverlog.git
cd serverlog
cp .env.example .env

# Edit .env with secure values
# - Set a strong JWT_SECRET (min 32 chars)
# - Set a secure POSTGRES_PASSWORD
# - Update NEXT_PUBLIC_API_URL to your API domain

# Start services
docker compose up -d
```

### 2. Setup SSL with Caddy (Recommended)

Caddy provides automatic HTTPS with zero configuration.

```bash
# Install Caddy
sudo apt install -y caddy

# Edit Caddyfile
sudo nano /etc/caddy/Caddyfile
```

Add this configuration (replace with your domains):

```
app.yourdomain.com {
    reverse_proxy localhost:3011
}

api.yourdomain.com {
    reverse_proxy localhost:3010
}
```

```bash
# Reload Caddy
sudo systemctl reload caddy
```

That's it! Caddy automatically obtains and renews SSL certificates from Let's Encrypt.

### 3. Update Environment

Edit `.env` to use your production URLs:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

Rebuild frontend with new URL:

```bash
docker compose up -d --build frontend
```

## API Usage

Serverlog provides a simple REST API.

### Authentication

All API requests require a Bearer token:

```bash
Authorization: Bearer your-api-key
```

### Log an Event

```bash
curl -X POST https://your-domain.com/v1/log \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "project": "my-app",
    "channel": "payments",
    "event": "New Subscription",
    "description": "User upgraded to Pro plan",
    "icon": "💰",
    "tags": {
      "plan": "pro",
      "amount": 99
    }
  }'
```

### Identify a User

```bash
curl -X POST https://your-domain.com/v1/identify \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "project": "my-app",
    "user_id": "user_123",
    "properties": {
      "name": "John Doe",
      "email": "john@example.com",
      "plan": "pro"
    }
  }'
```

### Track an Insight

```bash
curl -X POST https://your-domain.com/v1/insight \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "project": "my-app",
    "title": "Monthly Revenue",
    "value": "$12,345",
    "icon": "💵"
  }'
```

## Development

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Run tests
npm test

# Database commands
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

## Architecture

```
/
├── apps/
│   ├── backend/     # Express + Prisma + Socket.IO (port 3010)
│   └── frontend/    # Next.js + React (port 3011)
└── docker-compose.yml
```

## Tech Stack

- **Backend**: Node.js, Express, Prisma, Socket.IO
- **Frontend**: Next.js 15, React 19, Tailwind CSS, Radix UI
- **Database**: PostgreSQL
- **Real-time**: Socket.IO

## License

MIT
