# Docker workflows

This guide documents container-based flows for both local development and production-style deployments. Use these commands when you need an isolated environment or when replicating the setup on shared infrastructure.

## Local development stack

The `docker-compose.dev.yml` file runs the Vite dev server inside a lightweight Node container. It mounts your working tree so file changes trigger Vite’s Hot Module Replacement cycle, and the Makefile helpers forward any Supabase credentials defined in `chd-qbank/.env.development`.

Start, inspect, and tear down the stack with the Makefile helpers:

```bash
make docker-dev-up       # build images and start services
make docker-dev-logs     # follow container logs
make docker-dev-down     # stop services and remove containers
```

By default the stack exposes the app on [http://localhost:5173](http://localhost:5173). Copy `chd-qbank/.env.example` to `chd-qbank/.env.development` (or export `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` directly in your shell) before invoking `make docker-dev-up` so the client can reach your Supabase project.

When the app container starts it installs dependencies and watches the project directory through bind mounts. Any changes to `chd-qbank/` immediately trigger Hot Module Replacement inside the container. Database migrations or seed scripts still execute from the host using the standard `npm run` commands, and the running container will consume the updated data.

## Production builds

For production-like deployments, reuse the existing `Dockerfile` which compiles the static Vite bundle and serves it with `serve`. Build and run the image locally to validate the output:

```bash
docker build -t chd-qbank:latest .
docker run --rm -p 3000:80 \
  -e VITE_SUPABASE_URL=... \
  -e VITE_SUPABASE_ANON_KEY=... \
  chd-qbank:latest
```

The `docker-compose.yml` file pairs this production image with a managed Postgres container. Supply the same Supabase credentials you would configure in Vercel or another hosting provider. Because the image expects pre-populated environment variables, inject secrets through your orchestrator (Docker secrets, Kubernetes, Render, etc.) and keep service-role keys out of the image.

For cloud deployments:

1. Build and push the container image to your registry of choice (`docker buildx build --push`).
2. Provision your runtime (ECS, Fly.io, DigitalOcean Apps, etc.) to run the image and expose port 80.
3. Provide Supabase URL and anon key as runtime environment variables.
4. Point DNS or your load balancer at the deployed service.

These steps align with the release runbook but reduce manual configuration by encapsulating dependencies inside Docker images.
