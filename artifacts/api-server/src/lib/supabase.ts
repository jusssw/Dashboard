export class SupabaseError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "SupabaseError";
  }
}

type SupabaseRequestInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

// Local/VS Code setup: talks directly to Supabase's PostgREST API using
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the environment, instead of
// going through Replit's connector proxy (which only exists on Replit).
export async function supabaseRequest<T>(
  path: string,
  init?: SupabaseRequestInit,
): Promise<T> {
  const supabaseUrl = process.env["SUPABASE_URL"];
  const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. Copy .env.example to .env and fill them in.",
    );
  }

  const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/rest/v1${path}`, {
    method: init?.method ?? "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...init?.headers,
    },
    body: init?.body,
  });
  const text = await response.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const providerMessage =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string"
        ? body.message
        : `Supabase request failed with status ${response.status}`;
    throw new SupabaseError(providerMessage, response.status);
  }

  return body as T;
}