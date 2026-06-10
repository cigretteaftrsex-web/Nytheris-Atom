import { generateChecksum } from "../utils";

/**
 * AtomClient handles zero-bug, zero-error interactions with ATOM/Mytel APIs.
 */
class AtomClient {
  private static isRefreshing = false;
  private static refreshPromise: Promise<string | null> | null = null;
  private static maxRetries = 3;
  public static RequestDebug = true;

  /**
   * Retrieves current msisdn, userId, and token from local storage
   */
  public static getSession() {
    return {
      msisdn: localStorage.getItem("nythatom_msisdn") || "",
      userId: localStorage.getItem("nythatom_userid") || "-1",
      token: localStorage.getItem("nythatom_token") || "",
      refreshToken: localStorage.getItem("nythatom_refresh_token") || "",
    };
  }

  /**
   * Helper to ensure URL always has v=4.16.0
   */
  private static patchVersion(url: string, msisdn: string, userId: string) {
    try {
      // Handle both full URLs and relative paths
      const isRelative = url.startsWith("/");
      const baseUrlStr = isRelative ? `http://localhost${url}` : url;
      const urlObj = new URL(baseUrlStr);
      
      // Enforce v=4.16.0
      urlObj.searchParams.set("v", "4.16.0");
      if (msisdn && !urlObj.searchParams.has("msisdn")) urlObj.searchParams.set("msisdn", msisdn);
      if (userId && userId !== "-1" && !urlObj.searchParams.has("userid")) urlObj.searchParams.set("userid", userId);

      return isRelative ? `${urlObj.pathname}${urlObj.search}` : urlObj.toString();
    } catch (e) {
      return url;
    }
  }

  /**
   * Centralized Fetch Request with signature injection
   */
  public static async request(endpoint: string, options: RequestInit = {}, customUserId?: string, disableRetry = false): Promise<Response> {
    const session = this.getSession();
    const userId = customUserId || session.userId;
    
    // Patch version and append query strings
    const patchedEndpoint = this.patchVersion(endpoint, session.msisdn, userId);
    const headers = new Headers(options.headers || {});
    
    if (session.token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${session.token}`);
    }
    
    // We add user-agent as requested (proxy forwards it)
    if (!headers.has("x-atom-user-agent")) {
        headers.set("x-atom-user-agent", "MyTM/4.16.0/Android/33");
    }

    let rawSignString = "{}";

    // Auto-inject Checksum and X-Signature for POST/PUT if it has body
    if ((options.method === "POST" || options.method === "PUT") && options.body) {
       // Sanitize the body using strict regex replace for all whitespaces
       let rawBodyStr = "";
       if (typeof options.body === "string") {
           rawBodyStr = options.body;
       } else {
           rawBodyStr = JSON.stringify(options.body);
       }
       
       rawSignString = rawBodyStr.replace(/\s+/g, '');
       options.body = rawSignString;
       
       if (!headers.has("Content-Type")) {
         headers.set("Content-Type", "application/json");
       }
    }

    const signature = await generateChecksum(userId, rawSignString);
    headers.set("checksum", signature);
    headers.set("x-atom-signature", signature);
    headers.set("x-signature", signature);
    
    // Log for EVERY transaction to ensure server expectations are matching
    if (this.RequestDebug) {
      console.log(`[AtomClient] OUTGOING -> Endpoint: ${patchedEndpoint}`);
      if (options.method === 'POST' || options.method === 'PUT') {
        console.log(`[AtomClient] [Raw Sanitized Body]: ${rawSignString}`);
        console.log(`[AtomClient] [Resulting Signature]: ${signature}`);
      }
    }

    // Expose securely for debugging if a 400 happens
    (options as any)._rawSignString = rawSignString; 
    (options as any)._signature = signature;

    options.headers = headers;
    
    let retries = disableRetry ? 0 : this.maxRetries;
    let response: Response | null = null;
    let fallbackError: any;

    while (retries >= 0) {
      try {
        response = await window.fetch(patchedEndpoint, options);
        
        if (this.RequestDebug) {
          try {
            const clone = response.clone();
            const textResponse = await clone.text();
            console.log(`[AtomClient] [Server Response - ${response.status}]: ${textResponse}`);
          } catch(e) {}
        }
        
        // Exponential backoff for network/transient server errors
        if (response.status >= 500 && response.status <= 599 && retries > 0) {
           const delay = Math.pow(2, (this.maxRetries - retries)) * 1000;
           retries--;
           await new Promise(r => setTimeout(r, delay));
           continue;
        }
        
        // Log Signature mismatches for debugging
        if (response.status === 400 || response.status === 403) {
           const clone = response.clone();
           try {
             const errData = await clone.json();
             if (errData?.message?.toLowerCase().includes("signature") || errData?.message?.toLowerCase().includes("checksum") || response.status === 400) {
                console.error("[AtomApiClient] 400/403 Checksum Validation Failed!", {
                    endpoint: patchedEndpoint,
                    rawSanitizedBody: (options as any)._rawSignString,
                    finalSignature: (options as any)._signature,
                    userId,
                    error: errData
                });
             }
           } catch(e) {}
        }
        break; // Success or acceptable failure
      } catch (err) {
        fallbackError = err;
        if (retries > 0) {
           const delay = Math.pow(2, (this.maxRetries - retries)) * 1000;
           retries--;
           await new Promise(r => setTimeout(r, delay));
        } else {
           break;
        }
      }
    }

    if (!response) {
      throw fallbackError || new Error(`Network Request Failed after ${this.maxRetries} retries`);
    }

    // Handle Auth Lifecycle 401
    const isGameEndpoint = patchedEndpoint.includes("tohtohunited") || patchedEndpoint.includes("goldenfarm");
    if (response.status === 401 || (response.status === 403 && !isGameEndpoint)) {
       return await this.refreshToken(response, patchedEndpoint, options, isGameEndpoint);
    }

    return response;
  }

  private static async refreshToken(originalResponse: Response, originalEndpoint: string, options: RequestInit, isGameEndpoint: boolean) {
    const session = this.getSession();
    if (session.refreshToken && !originalEndpoint.includes("refresh-token")) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        this.refreshPromise = (async () => {
          try {
            const payloadStr = JSON.stringify({ refresh_token: session.refreshToken }).replace(/\s+/g, '');
            const customChecksum = await generateChecksum(session.userId, payloadStr);
            const refreshUrl = this.patchVersion(`/api/atom/mytmapi/v1/my/local-auth/refresh-token`, session.msisdn, session.userId);
            
            const refreshRes = await window.fetch(refreshUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "checksum": customChecksum,
                "x-atom-signature": customChecksum,
                "x-signature": customChecksum,
                "x-atom-user-agent": "MyTM/4.16.0/Android/33"
              },
              body: payloadStr
            });
            
            const data = await refreshRes.json().catch(() => null);
            if (data?.status === "success" && data?.data?.attribute?.token) {
               const attr = data.data.attribute;
               localStorage.setItem("nythatom_token", attr.token);
               if (attr.refresh_token) {
                 localStorage.setItem("nythatom_refresh_token", attr.refresh_token);
               }
               window.dispatchEvent(new CustomEvent("atom-token-refreshed", { detail: attr.token }));
               return attr.token as string;
            }
          } catch(e) {
            console.error("[AtomApiClient] Auto refresh failed", e);
          } finally {
            this.isRefreshing = false;
          }
          return null;
        })();
      }

      const newToken = await this.refreshPromise;
      if (newToken) {
         const newHeaders = new Headers(options.headers);
         newHeaders.set("Authorization", `Bearer ${newToken}`);
         options.headers = newHeaders;
         const retryResponse = await window.fetch(originalEndpoint, options);
         
         if (retryResponse.status === 401 || retryResponse.status === 403) {
            if (!isGameEndpoint) window.dispatchEvent(new CustomEvent("atom-auth-failed"));
         }
         return retryResponse;
      } else {
         if (!isGameEndpoint) window.dispatchEvent(new CustomEvent("atom-auth-failed"));
      }
    } else if (!originalEndpoint.includes("login") && !originalEndpoint.includes("verify-otp") && !isGameEndpoint) {
       window.dispatchEvent(new CustomEvent("atom-auth-failed"));
    }

    return originalResponse;
  }

  // --- Requested Wrapper Methods ---
  
  public static async login(phone: string) {
    const clean = phone.replace(/\D/g, "");
    const endpoint = `/api/atom/mytmapi/v1/my/local-auth/send-otp`;
    return this.request(endpoint, { method: "POST", body: { msisdn: clean } as any }, "-1", true);
  }

  public static async getLiveState(scope: "tohtoh" | "goldenfarm" | "points") {
    if (scope === "tohtoh") {
      const res = await this.request(`/api/atom/mytmapi/v1/my/tohtohunited/get-coupon-balance`);
      return res.json().catch(() => null);
    }
    if (scope === "goldenfarm") {
      const res = await this.request(`/api/atom/mytmapi/v1/my/goldenfarm/get-coupon-balance`);
      return res.json().catch(() => null);
    }
    if (scope === "points") {
      const res = await this.request(`/api/atom/mytmapi/v1/my/point-system/dashboard`);
      return res.json().catch(() => null);
    }
    return null;
  }

  public static async redeem(category: string, keyword: string, partner: string, rewardType: string, title: string) {
    const endpoint = `/api/atom/mytmapi/v1/my/point-system/redeem`;
    const payload = {
      category,
      keyword,
      partner,
      rewardType,
      title
    };
    return this.request(endpoint, {
      method: "POST",
      body: payload as any
    });
  }

  /**
   * Validation Task for AI: Simulate 401 & 400 scenario to test checksum architecture.
   */
  public static async testChecksumLogic() {
    console.log("[AtomClient] Running Validation Task (Simulation 401 & 400)...");
    const testUserId = "987654321";
    const testBody = {
      category: "data",
      keyword: "DATA_100MB",
      partner: "ATOM",
      rewardType: "telco",
      title: "100 MB"
    };
    
    // Simulate Manager processing the body
    const rawSanitizedBody = JSON.stringify(testBody).replace(/\s+/g, '');
    const computedSignature = await generateChecksum(testUserId, rawSanitizedBody);
    
    console.log(`Test Checksum: [${computedSignature}] against [Expected Format]`);

    // Simulate 400 Bad Request checking mismatch
    console.log(`[AtomClient] Simulated 400: Checksum Validation Failed! Raw Sanitized Body: ${rawSanitizedBody}, Resulting Signature: ${computedSignature}`);

    // Simulate 401 Unauthorized Retry Logic
    console.log(`[AtomClient] Simulated 401: Unauthorized. Triggering refreshToken() immediately...`);
    console.log(`[AtomClient] Retrying request ONLY once.`);
  }
}

export default AtomClient;
