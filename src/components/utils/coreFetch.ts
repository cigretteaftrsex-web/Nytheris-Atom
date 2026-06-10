export const fetchWithRetry = async (url: string, options: RequestInit, retries = 3): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        return { status: "error", message: `Invalid JSON response` };
      }

      if (!response.ok) {
        if (i < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        return { status: "error", message: data.message || `HTTP Error ${response.status}` };
      }
      
      return data;
    } catch (error: any) {
      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return { status: "error", message: error.message || "Network request failed" };
    }
  }
};

