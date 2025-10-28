# Supabase Edge Function + CORS Demo  

This document describes how to set up a minimal Supabase Edge Function with a Vite/React front‑end that demonstrates Cross‑Origin Resource Sharing (CORS).  

## 1. Prerequisites  

- **Node.js ≥ 22**.  
  Use Homebrew on macOS:  
  ```bash  
  brew install node@22  
  echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc  
  source ~/.zshrc  
  ```  
  Check versions:  
  ```bash  
  node -v  
  npm -v  
  # expected: v22.x.x and npm 10.x.x  
  ```  

- **Supabase CLI (v ≥ 2.54)**.  
  Install via Homebrew:  
  ```bash  
  brew install supabase/tap/supabase  
  supabase --version  # should show 2.54.x  
  ```  

## 2. Create the Vite/React Project  

```bash  
# Navigate to your desired parent folder  
cd ~/chd  

# Scaffold a Vite + React project  
npx create-vite@latest supabase-cors-demo --template react  

# Enter the project  
cd supabase-cors-demo  

# Install dependencies  
npm install  
npm install @supabase/supabase-js  
```  

## 3. Initialize and Link Supabase  

```bash  
supabase login             # authenticate with your Supabase account  
supabase init              # set up the supabase/ directory  
supabase link --project-ref eomhecpjwyuqabrgpvym  # link to your Supabase project  
```  

This creates a `supabase/` folder that stores configuration and functions.  

## 4. Create the Edge Function  

Create the file `supabase/functions/hello/index.ts`:  

```ts  
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";  

const corsHeaders = {  
  "Access-Control-Allow-Origin": "http://localhost:5173",  
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",  
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",  
};  

serve(async (req) => {  
  if (req.method === "OPTIONS") {  
    return new Response("ok", { headers: corsHeaders });  
  }  

  const data = { message: "Hello from Supabase Edge Function!" };  
  return new Response(JSON.stringify(data), {  
    status: 200,  
    headers: { ...corsHeaders, "Content-Type": "application/json" },  
  });  
});  
```  

> This function responds to both preflight `OPTIONS` requests (for CORS) and regular requests by returning a JSON message.  

## 5. Deploy the Function  

You can deploy in two modes:  

- **Public (no JWT verification)** – good for demos and testing:  
  ```bash  
  supabase functions deploy hello --no-verify-jwt  
  ```  
- **Secure (JWT required)** – use this in production if you want only authenticated users to call the function:  
  ```bash  
  supabase functions deploy hello  
  ```  

Deployment prints a URL like:  

``  
https://eomhecpjwyuqabrgpvym.functions.supabase.co/hello  
``  

Test it with `curl`:  

```bash  
curl https://eomhecpjwyuqabrgpvym.functions.supabase.co/hello  
# → {"message":"Hello from Supabase Edge Function!"}  
```  

If you see a `401` error, redeploy using the `--no-verify-jwt` flag.  

## 6. Set Up the React Front‑End  

Replace `src/App.jsx`:  

```jsx  
import { useEffect, useState } from "react";  

function App() {  
  const [msg, setMsg] = useState("Loading...");  
  const [error, setError] = useState("");  

  useEffect(() => {  
    fetch("https://eomhecpjwyuqabrgpvym.functions.supabase.co/hello")  
      .then((res) => res.json())  
      .then((data) => setMsg(data.message))  
      .catch((err) => setError("Error: " + err.message));  
  }, []);  

  return (  
    <div style={{ fontFamily: "Arial", margin: "2rem" }}>  
      <h1>Supabase Edge Function + CORS Demo</h1>  
      {error ? (  
        <p style={{ color: "red" }}>{error}</p>  
      ) : (  
        <p style={{ color: "green" }}>{msg}</p>  
      )}  
    </div>  
  );  
}  

export default App;  
```  

This component fetches the hello function and displays its message or an error.  

## 7. Add NPM Scripts for Quick Deploys  

Update the `"scripts"` section of `package.json`:  

```json  
"scripts": {  
  "dev": "vite",  
  "build": "vite build",  
  "preview": "vite preview",  
  "deploy:public": "supabase functions deploy hello --no-verify-jwt",  
  "deploy:secure": "supabase functions deploy hello",  
  "refresh": "npm run deploy:public && npm run dev"  
}  
```  

Now you can redeploy and start the dev server in one command:  

```bash  
npm run refresh  
```  

You can also add a secure version:  

```json  
"refresh:secure": "npm run deploy:secure && npm run dev"  
```  

## 8. Run the App  

Start your development server (this also redeploys the public function if you use `refresh`):  

```bash  
npm run refresh  # opens http://localhost:5173 in your browser  
```  

You should see **“Hello from Supabase Edge Function!”** displayed in green. The browser’s Network panel should show the `Access-Control-Allow-Origin` header set to `http://localhost:5173`, indicating CORS is configured correctly.  

---  

This README captures the full setup process—creating the React project, installing dependencies, initializing Supabase, writing and deploying the Edge function, and running the dev server.
