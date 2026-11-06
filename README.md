# HookRelay Dashboard

A responsive web dashboard for monitoring and managing HookRelay webhook
activity. It provides a central interface for reviewing events, deliveries,
delivery attempts, webhook endpoints, and delivery analytics.

## Features

- **Dashboard overview** — operational metrics and delivery activity charts.
- **Events** — browse recorded events and inspect event details.
- **Deliveries** — review delivery statuses and delivery attempt history.
- **Manual retry** — retry eligible webhook deliveries from the interface.
- **Endpoints** — manage webhook endpoint configuration.
- **Analytics** — view delivery trends, status breakdowns, and event types.
- **Responsive UI** — desktop and mobile navigation, light and dark themes.
- **Backend proxy** — route dashboard API requests through the Next.js server.

## Technology stack

- Next.js App Router and React
- TypeScript
- Tailwind CSS and shared UI components
- TanStack Query
- Recharts
- Axios and Zod

## Architecture

The dashboard is a separate frontend application. It communicates with the
HookRelay backend through the Next.js route:

`/api/backend/:path*`

The server-side proxy reads `HOOKRELAY_API_URL` and forwards requests to the
configured backend. The backend is not bundled into this repository's Docker
Compose service.

## Requirements

For local development:

- Node.js compatible with the installed Next.js version (Node.js 22 LTS is
  recommended)
- npm
- A running HookRelay backend for API-backed features

For container deployment:

- Docker Engine or Docker Desktop
- Docker Compose

## Local development

1. Clone this repository and enter its directory.
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Configure the backend URL in `.env.local`:

   ```dotenv
   HOOKRELAY_API_URL=http://localhost:8000
   ```

   Replace the example URL with the actual base URL of your running backend.
   Set the base URL only; the proxy appends the requested API path.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000).

The example URL assumes the backend is reachable on port 8000 from the
development server. Adjust it to match your backend configuration.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `HOOKRELAY_API_URL` | Yes for backend requests | Base URL of the HookRelay API, without a specific endpoint path |

Do not commit `.env.local` or any file containing credentials. The repository
ignores local environment files.

## Docker Compose

### 1. Configure the backend URL

Create your local environment file from the example:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set `HOOKRELAY_API_URL` to the address the dashboard
container can use to reach the backend.

Examples:

- Backend running in another Compose service on the same Docker network:
  use that service's Compose name and internal port, such as
  `http://hookrelay-backend:8000`.
- Backend running on the Docker host with Docker Desktop:
  `http://host.docker.internal:8000` may be appropriate.
- Backend running elsewhere on your network:
  use a reachable host name or IP and port.

These are examples, not a guarantee that the backend is listening at those
addresses. Verify the address from the container's network environment.
`localhost` inside the dashboard container refers to the dashboard container
itself, not the host or a separate backend container.

### 2. Build and start

```bash
docker compose up --build -d
```

Open [http://localhost:3000](http://localhost:3000).

View logs:

```bash
docker compose logs -f dashboard
```

Stop the dashboard:

```bash
docker compose down
```

Rebuild after changing application code or dependencies:

```bash
docker compose up --build -d
```

The Compose file starts only the dashboard. Start and manage the HookRelay
backend separately, and ensure the configured backend URL is reachable.

## Validation

Run these checks before committing changes:

```bash
git diff --check
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/eslint
npm run build
```

Validate the Compose configuration:

```bash
docker compose config
```

Build and start the container:

```bash
docker compose up --build -d
docker compose ps
docker compose logs --tail=100 dashboard
```

## Troubleshooting

- **`HOOKRELAY_API_URL is not configured`** — check that `.env.local` exists
  and contains the variable.
- **Backend requests return 502** — verify that the backend is running and
  reachable from the dashboard process/container.
- **Connection refused** — check the host, port, backend bind address, and
  container network. Avoid using `localhost` for a separate container.
- **Port 3000 is already in use** — stop the conflicting service or change the
  host-side port mapping in `docker-compose.yml`.

## Repository structure

```text
app/
  api/backend/[...path]/   # Backend API proxy
  analytics/               # Analytics page
  deliveries/              # Deliveries page
  endpoints/                # Endpoint management page
  events/                   # Events page
components/
  analytics/
  dashboard/
  deliveries/
  endpoints/
  events/
  ui/
lib/
  api/                      # API client and types
Dockerfile
docker-compose.yml
.env.example
README.md
```

## License

Add the license and usage terms appropriate for this repository before
redistributing it.
