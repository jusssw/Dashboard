import path from "node:path";
import fs from "node:fs";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve the built frontend (artifacts/task-dashboard) if present, so this
// one server can host both the API and the UI behind a single URL. In local
// dev this folder won't exist (the frontend runs on its own Vite server
// instead), so this block is simply skipped.
const frontendDist = path.resolve(
  import.meta.dirname,
  "../../task-dashboard/dist/public",
);

if (fs.existsSync(frontendDist)) {
  logger.info({ frontendDist }, "Serving frontend from this directory");
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req, res, next) => {
    res.sendFile(path.join(frontendDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
} else {
  logger.warn(
    { frontendDist },
    "Frontend build not found at this path — GET / will 404. Did the frontend build run?",
  );
}

export default app;