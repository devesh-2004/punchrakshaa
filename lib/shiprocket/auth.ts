let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Shiprocket JWT Authentication Service
 */
export async function getShiprocketToken(): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;

  if (!email || !password) {
    throw new Error("Shiprocket credentials missing (SHIPROCKET_EMAIL/SHIPROCKET_PASSWORD)");
  }

  // Check if token is still valid (expire buffer of 1 hour)
  if (cachedToken && tokenExpiry && Date.now() < (tokenExpiry - 3600000)) {
    return cachedToken;
  }

  console.log("Fetching new Shiprocket JWT token...");
  
  const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Shiprocket auth failed: ${error.message || response.statusText}`);
  }

  const data = await response.json();
  cachedToken = data.token;
  // Token is valid for 10 days (240 hours) per docs
  tokenExpiry = Date.now() + (240 * 60 * 60 * 1000);

  return cachedToken as string;
}
