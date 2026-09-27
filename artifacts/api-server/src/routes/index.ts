import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import pagesRouter from "./pages";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(pagesRouter);

export default router;
