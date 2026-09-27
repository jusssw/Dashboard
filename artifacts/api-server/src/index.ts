import app from "./app";
import { logger } from "./lib/logger";

// Load .env for local dev (Node 20.12+/24). No-op if the file doesn't exist,
// e.g. when env vars are already set another way.
try {
  process.loadEnvFile();
} catch {
  // .env not found — fine if PORT/SUPABASE_* are already set in the shell.
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
