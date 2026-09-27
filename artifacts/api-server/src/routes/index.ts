import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import pagesRouter from "./pages";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Health check stays public (hosting providers ping this without logging in).
router.use(healthRouter);

// Everything else requires a logged-in Supabase user.
router.use(requireAuth, tasksRouter);
router.use(requireAuth, pagesRouter);

export default router;
