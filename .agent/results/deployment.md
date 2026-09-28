# Deployment Agent — Results

## What was added
- `deployment/Dockerfile` — production image for the FastAPI backend.
  - Base: `python:3.11-slim`
  - Installs `backend/requirements.txt`
  - Start command: `uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}` (no `--reload`, binds `$PORT` for Render)
- `deployment/render.yaml` — Render Blueprint for the backend web service.
  - `runtime: docker`, `dockerfilePath: ./deployment/Dockerfile`, `dockerContext: .`
  - `healthCheckPath: /docs` (the app has no `/` route; FastAPI's auto Swagger UI is used instead)
  - `envVars`: `CORS_ORIGINS` (placeholder, `sync: false`, to be set to the Vercel frontend URL once available) and `PYTHONUNBUFFERED=1`

## Verification performed
- `deployment/render.yaml` parses as valid YAML.
- Docker daemon was unavailable in this environment, so the image build was verified by reproducing the Dockerfile's steps directly:
  - Installed `backend/requirements.txt` into a clean virtualenv.
  - Ran the backend's own test suite (`backend/tests`, from the `backend-agent` worktree, code not modified): **11 passed**.
  - Started the app with the exact production command (`uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`) and confirmed `GET /docs` → 200 and `GET /books` → `[]`.
- No application code was changed (deployment-agent scope only touches `deployment/`).

## Backend deployment instructions (Render)
1. Push the repo to GitHub (or connect the existing remote) with `deployment/render.yaml` on the `main` branch.
2. In the Render dashboard: **New > Blueprint**, select this repo/branch. Render will detect `deployment/render.yaml` and create the `reading-list-tracker-backend` web service.
   - Alternatively, create a Web Service manually with **Environment: Docker**, **Dockerfile Path: deployment/Dockerfile**, **Docker Build Context: .** (repo root).
3. Render sets `$PORT` automatically; the Dockerfile's `CMD` binds to it — no manual port config needed.
4. Set the `CORS_ORIGINS` environment variable to the deployed Vercel frontend URL (e.g. `https://reading-list-tracker.vercel.app`) once it exists. Note: the current backend does not yet read this variable or apply CORS middleware — the backend agent should wire it up if the frontend needs cross-origin access. This variable is reserved for that purpose.
5. Deploy. Verify with `GET https://<service>.onrender.com/docs` and `GET https://<service>.onrender.com/books`.

## Frontend deployment instructions (Vercel)
The frontend has not been scaffolded yet (only `frontend/__init__.py` exists in this worktree as of writing). Once the frontend agent adds a React app (Vite or CRA):
1. Import the GitHub repo into Vercel, set the **Root Directory** to `frontend`.
2. Framework preset: Vite (or Create React App) — Vercel auto-detects `npm run build` / `dist` (Vite) or `build` (CRA).
3. Add an environment variable for the API base URL, e.g. `VITE_API_URL=https://<service>.onrender.com` (or `REACT_APP_API_URL` for CRA), and have the frontend read it instead of hardcoding a backend URL.
4. Deploy. Vercel auto-builds on every push to `main`.
5. Once the Vercel URL is known, set it as `CORS_ORIGINS` on the Render service (see above) so the backend can accept requests from it.

## Status
- `.agent/status/deployment.json` → `"completed"`
