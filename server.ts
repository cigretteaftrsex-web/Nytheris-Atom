import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import axios from "axios";
import https from "https";

dotenv.config();

const app = express();
const PORT = 3000;

// Parse proxy configuration from environment variables if set (highly dynamic fallback for local & Railway)
function getProxyConfig() {
  const proxyUrl = process.env.ATOM_PROXY || process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  if (!proxyUrl) return null;
  try {
    const parsed = new URL(proxyUrl);
    const proxyConfig: any = {
      protocol: parsed.protocol.replace(":", ""),
      host: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === "https:" ? 443 : 80),
    };
    if (parsed.username || parsed.password) {
      proxyConfig.auth = {
        username: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
      };
    }
    return proxyConfig;
  } catch (err) {
    console.warn("[ATOM PROXY CFG ERROR]", err);
    return null;
  }
}

// Create dedicated https agent to handle ssl dynamically
const defaultHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: false, // Disabling keepAlive forces Node to use a fresh socket for each request, bypassing Cloudflare pooled IP fingerprint blocks
  // Modern browser-mimicking ciphers to mask/spoof Node.js handshake signature (JA3 standard evasion)
  ciphers: "TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256",
  honorCipherOrder: true,
  minVersion: "TLSv1.2",
});

// Body parsers
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Manual CORS setting
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Checksum, X-Server-Select, X-Atom-Signature, X-Signature");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Dynamic ATM MM APIs CORS Proxy Gateway
app.all("/api/atom/*", async (req, res) => {
  try {
    // Extract the actual path relative to "/api/atom"
    const targetPath = req.params[0] || req.path.replace(/^\/api\/atom\//, "");
    
    // Construct the remote url targeting the reliable Cloudflare Worker proxy
    const queryStr = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const targetUrl = `https://nythatom-proxy.nytherisq1.workers.dev/${targetPath}${queryStr}`;

    console.log(`[ATOM PROXY] [${req.method}] Forwarding to: ${targetUrl}`);

    // Build perfect browser-like headers to blend in matching real mobile/Android devices in Myanmar
    const headers: Record<string, string> = {
      "accept": "application/json, text/plain, */*",
      "user-agent": req.headers["x-atom-user-agent"] ? req.headers["x-atom-user-agent"] as string : "MyTM/4.16.0/Android/33",
      "device-name": req.headers["x-atom-device"] ? req.headers["x-atom-device"] as string : "Samsung SM-G998B",
      "x-server-select": "production",
      "accept-language": "my-MM,my;q=0.9,en-US;q=0.8,en;q=0.7",
      "cache-control": "no-cache",
      "pragma": "no-cache"
    };

    // Forward current Content-Type if it exists
    if (req.headers["content-type"]) {
      headers["content-type"] = req.headers["content-type"] as string;
    } else if (req.method === "POST" || req.method === "PUT") {
      headers["content-type"] = "application/json;charset=UTF-8";
    }

    // Forward validation checksum for draws if supplied
    if (req.headers["checksum"]) {
      headers["Checksum"] = req.headers["checksum"] as string;
    }
    if (req.headers["x-atom-signature"]) {
      headers["X-Atom-Signature"] = req.headers["x-atom-signature"] as string;
    }
    if (req.headers["x-signature"]) {
      headers["X-Signature"] = req.headers["x-signature"] as string;
    }

    // Forward the authorization header bearer token from localStorage
    const authHeader = req.headers["authorization"];
    if (authHeader) {
      headers["Authorization"] = authHeader as string;
    }

    let response;
    let retries = 5;
    let lastError: any;

    const proxyCfg = getProxyConfig();

    while (retries > 0) {
      try {
        let requestData = undefined;
        if (req.method === "POST" || req.method === "PUT") {
          requestData = (req as any).rawBody || req.body;
        }

        const fetchConfig: any = {
          method: req.method,
          url: targetUrl,
          headers: headers,
          data: requestData,
          validateStatus: () => true, // resolve the promise for any HTTP status
          responseType: "arraybuffer", // return buffer to easily handle text and json
          timeout: 25000, 
        };

        if (proxyCfg) {
          fetchConfig.proxy = proxyCfg;
          // When proxy is used, let axios handle tunneling agents
        } else {
          fetchConfig.httpsAgent = defaultHttpsAgent;
        }

        response = await axios(fetchConfig);
        break; // Success
      } catch (err: any) {
        lastError = err;
        retries -= 1;
        console.warn(`[ATOM PROXY] Retry ${5 - retries}/5 for ${targetUrl} due to: ${err.message}`);
        if (err.response) {
          console.warn(`[ATOM PROXY DEBUG] Response Status: ${err.response.status}`);
          console.warn(`[ATOM PROXY DEBUG] Headers: ${JSON.stringify(err.response.headers)}`);
          if (err.response.data) {
            try {
              const str = Buffer.from(err.response.data).toString("utf8").slice(0, 500);
              console.warn(`[ATOM PROXY DEBUG] Body Snippet: ${str}`);
            } catch (e) {}
          }
        }
        if (retries === 0) throw err;
        await new Promise(res => setTimeout(res, 1000)); // wait 1s before retry
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to get response after retries");
    }

    // Pass target content type back
    const resContentType = response.headers["content-type"];
    if (resContentType) {
      res.setHeader("Content-Type", resContentType);
    }
    
    return res.status(response.status).send(response.data);

  } catch (error: any) {
    console.error("[ATOM PROXY ERROR]", error.message);
    return res.status(500).json({
      status: "error",
      message: "Proxy communication with Atom server failed",
      details: error.message
    });
  }
});

// Dev & Prod setups
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static output built by vite build
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Nyth Atom Server] Listening dynamically on http://localhost:${PORT}`);
  });
}

startServer();
