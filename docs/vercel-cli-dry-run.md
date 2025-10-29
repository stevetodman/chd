# Vercel CLI Dry-Run Checklist

Use the following commands to perform a dry-run of a Vercel deployment. Run them from the project root unless otherwise noted.

## 1. Install the Vercel CLI

```bash
npm i -g vercel
```

**Expected output:** Installation completes without errors and the terminal prints a success message such as `+ vercel@<version>` followed by `added <number> packages`. If permission errors occur, retry with elevated permissions (`sudo`) or adjust your global npm prefix.

## 2. Authenticate with Vercel

```bash
vercel login
```

**Expected output:** The CLI prompts for an email address or offers to open a browser for SSO. After completing the flow, you should see `You are now logged in as <email>!`. If login fails, ensure you entered the correct credentials and that your network allows outbound HTTPS requests.

## 3. Pull Project Settings and Environment Variables

```bash
vercel pull
```

**Expected output:** The CLI displays `Downloading your Project Settings and Environment Variables.` followed by confirmation that `.vercel/project.json` and environment files were written. Verify the correct scope (team vs. personal) if you see `Error: Project not found` or authentication errors.

## 4. Build the Project Locally

```bash
vercel build
```

**Expected output:** The build process ends with `✅  Production build completed.` and a summary showing the generated output directory (e.g., `.vercel/output`). If the build fails:

- Inspect the preceding logs for compilation or linting errors.
- Confirm required environment variables were pulled (see `.env.*` files).
- Ensure dependencies are installed with `npm install`.

## 5. Deploy the Prebuilt Output to a Preview Environment

```bash
vercel deploy --prebuilt
```

**Expected output:** The CLI uploads the `.vercel/output` directory and ends with `✅  Preview deployment ready!` plus the preview URL. If deployment fails:

- Check for authentication or permission errors (team/project mismatch).
- Confirm `.vercel/output` exists from the previous step.
- Retry with `--debug` for verbose logs.
