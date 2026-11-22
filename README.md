# Expense Tracker

A browser-based expense tracker with a static HTML/CSS/JavaScript frontend, an Express/TypeScript API, Prisma, and Supabase PostgreSQL. The application includes transaction management, charts, budgeting, exports, authentication, and light/dark themes.

## Features

- Add, edit, delete, search, filter, and sort transactions
- Dashboard summaries, category charts, monthly comparisons, budgets, and goals
- 12-month spending history with budget usage and highest/lowest spending categories
- Supabase-backed authentication and transaction data
- CSV and PDF exports
- Responsive layout, theme toggle, and local theme preference

## Technology

- Frontend: HTML, CSS, vanilla JavaScript, Chart.js, jsPDF
- Backend: Node.js 20+, Express, TypeScript
- Database: Supabase PostgreSQL with Prisma Client
- Containers: Docker, Docker Compose, and Nginx

## Run locally

1. Copy `backend/.env.example` to `backend/.env` and set the Supabase URL, anon key, service-role key, database URLs, and a random `JWT_SECRET` of at least 32 characters.
2. In `backend`, run `npm ci`, `npm run prisma:generate`, and `npm run dev`.
3. From the project root, serve the static frontend, for example with `python -m http.server 5500`.
4. Open `http://localhost:5500/auth.html`.

The local `api-config.js` points the browser to the backend on port 3000. The backend's `FRONTEND_URL` must allow the origin used by the static server.

## GitHub Actions CI/CD

The `.github/workflows/ci-cd.yml` workflow runs on pushes to `main`, pull requests targeting `main`, and manual dispatch:

- The validation job uses Node.js 22, checks the static frontend JavaScript syntax, installs backend dependencies from `backend/package-lock.json`, runs the Vitest suite, generates Prisma Client with placeholder CI database URLs, and compiles the TypeScript backend.
- The Docker job builds the existing frontend and backend Dockerfiles with Buildx after validation succeeds. Pull requests build both images without publishing them. Pushes to `main` publish both images with `latest` and the full commit SHA tags. A manual run publishes only when dispatched on `main`.
- The frontend is static HTML/CSS/JavaScript and has no separate package manifest or frontend test runner. CI syntax-checks its JavaScript and validates it through the production Docker build.
- Docker builds do not need Supabase credentials and do not run database migrations.

Add these repository secrets under **Settings → Secrets and variables → Actions** before publishing:

| Secret | Value |
| --- | --- |
| `DOCKERHUB_USERNAME` | Docker Hub account username |
| `DOCKERHUB_TOKEN` | Docker Hub access token with permission to push to both repositories |

Images are published to:

- `svedant/expensetracker-frontend`
- `svedant/expensetracker-backend`

To run manually, open the repository's **Actions** tab, choose **CI/CD**, select **Run workflow**, and choose the desired branch. To inspect a run, select it in **Actions** and open the failed job or step for its logs. Pull requests never publish images.

If a run fails, first inspect the failing step's logs. Check that the backend lockfile is committed and matches `package.json`, and that tests/builds pass locally with Node.js 22. For Docker Hub authentication or push failures on `main`, verify both repository secrets and the token's write access to each image repository. Docker build failures should be reproducible with `docker build -f frontend/Dockerfile .` or `docker build -f backend/Dockerfile ./backend`; the pipeline does not require `.env` files or Supabase secrets.

## Docker Compose

### Architecture

- `frontend`: Nginx serves the existing static files on container port 8080. The root URL redirects to `/auth.html`, and `/api/v1` is reverse-proxied to the backend.
- `backend`: a production Node.js 22 image runs the compiled Express API on port 3000. Prisma Client is generated during the image build.
- Supabase PostgreSQL remains external. Compose does not create a database container or run migrations.

The browser uses the same-origin `/api/v1` path. It never receives the Compose-only `backend` hostname. Both containers run as non-root users and communicate over an IPv6-enabled Compose network. IPv6 is enabled because the configured Supabase database hostname may resolve only to an IPv6 address.

### Requirements and environment

Install Docker Desktop (or Docker Engine with the Compose plugin) and have a reachable Supabase project.

1. Copy `.env.example` to `.env`. This file controls the published ports and the browser API path.
2. Copy `backend/.env.example` to `backend/.env` and replace every placeholder. Set `SUPABASE_SERVICE_ROLE_KEY` only in this backend environment file; the existing backend expects that variable name. `DATABASE_URL` is used at runtime and `DIRECT_URL` is required by the Prisma schema.
3. Keep both `.env` files out of source control. Docker build contexts exclude them; secrets are passed to the backend container at runtime.

The default frontend is `http://localhost:8080`, and the backend is `http://localhost:3000`. If a host port is occupied, change `FRONTEND_PORT` or `BACKEND_PORT` in the root `.env`. `API_BASE_URL` should remain `/api/v1` when using the Nginx proxy. Keep `DATABASE_URL` pointed at the existing Supabase runtime endpoint. If your Docker Engine cannot route IPv6, use the Supabase connection-pooler URI for `DATABASE_URL` and retain the direct URI in `DIRECT_URL`.

### Build and start

From the project root:

```sh
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

Open `http://localhost:8080/` (redirects to the auth page) or `http://localhost:8080/auth.html`. The backend health check calls `/api/v1/health`, which also checks the Supabase database connection. The frontend starts after the backend becomes healthy.

### Logs and stop

```sh
docker compose logs -f
docker compose logs -f backend
docker compose down
```

`docker compose down` stops and removes the containers and network; it does not delete data in Supabase. No database volume is created.

### Dockerfiles and ignore files

- `frontend/Dockerfile` uses Node.js 22 to produce the browser API configuration, then copies only static production assets into Nginx.
- `backend/Dockerfile` installs from the existing npm lockfile, generates Prisma Client, compiles TypeScript, and installs production dependencies in a multi-stage build.
- `frontend/.dockerignore` and `backend/.dockerignore` document exclusions for their respective areas. The frontend Compose build uses the project root as its context because the existing frontend files live there; the root `.dockerignore` is therefore the active frontend-context exclusion list.

Neither image copies host `node_modules` or `.env` files. No migrations are run automatically. Apply migrations separately and deliberately when needed.

### Testing

After startup, check both service states with `docker compose ps`, then verify:

```sh
curl -i http://localhost:8080/auth.html
curl -i http://localhost:8080/api/v1/health
```

The health endpoint must return HTTP 200 with `"database":"connected"`. Sign in through the auth page and exercise transaction creation, editing, deletion, and dashboard data using a test account. Avoid using real expenses for test records.

### Troubleshooting

- If Compose reports a missing env file, create both `.env` files from their examples and fill in valid values.
- If the backend is unhealthy, check `docker compose logs backend`, the Supabase URL and network access, and both database connection strings. The health endpoint requires a working database connection. If the direct database hostname resolves only to IPv6 and your Docker Engine has no IPv6 egress, switch runtime `DATABASE_URL` to the Supabase connection-pooler URI.
- If a host port is already in use, change its corresponding `FRONTEND_PORT` or `BACKEND_PORT` in the root `.env`, then recreate the containers.
- Browser requests should use `/api/v1`; do not set a browser API URL to `http://backend:3000`, since that service name is only resolvable inside Docker.

## CDN dependencies

The frontend loads Chart.js, jsPDF, Font Awesome, and Google Fonts from their CDNs, so those services must be reachable by the user's browser.

## License

MIT
