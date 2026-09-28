import { Router, type IRouter, type Response } from "express";
import {
  CreateTaskBody,
  GetDashboardSummaryResponse,
  GetTaskParams,
  ListTasksQueryParams,
  ListTasksResponse,
  DeleteTaskParams,
  UpdateTaskBody,
  UpdateTaskParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { SupabaseError, supabaseRequest } from "../lib/supabase";

type ChecklistItem = { id: string; text: string; done: boolean };

type SupabaseTask = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  due_date: string | null;
  checklist?: ChecklistItem[] | null;
  created_at: string;
  updated_at: string;
};

const router: IRouter = Router();

function toTask(task: SupabaseTask) {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    completed: task.completed,
    dueDate: task.due_date,
    checklist: task.checklist ?? [],
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

function dateOnly(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function handleError(error: unknown, res: Response) {
  if (error instanceof SupabaseError) {
    const status = error.status === 404 ? 503 : error.status;
    res.status(status).json({
      error:
        status === 503
          ? "The Supabase tasks table is not ready. Run supabase/schema.sql in the Supabase SQL Editor."
          : error.message,
    });
    return;
  }

  logger.error({ err: error }, "Task API request failed");
  res.status(500).json({ error: "Unable to complete task request" });
}

router.get("/tasks", async (req, res) => {
  try {
    const query = ListTasksQueryParams.parse({
      status: req.query.status,
    });
    const params = new URLSearchParams({
      select: "*",
      order: "completed.asc,due_date.asc,created_at.desc",
      limit: "100",
    });

    if (query.status === "open") params.set("completed", "eq.false");
    if (query.status === "completed") params.set("completed", "eq.true");

    const data = await supabaseRequest<SupabaseTask[]>(
      `/tasks?${params.toString()}`,
    );
    res.json(ListTasksResponse.parse(data.map(toTask)));
  } catch (error) {
    handleError(error, res);
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const body = CreateTaskBody.parse(req.body);
    const now = new Date().toISOString();
    const created = await supabaseRequest<SupabaseTask[]>(
      "/tasks",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          title: body.title.trim(),
          description: body.description ?? null,
          completed: false,
          due_date: dateOnly(body.dueDate),
          checklist: body.checklist ?? [],
          created_at: now,
          updated_at: now,
        }),
      },
    );
    res.status(201).json(toTask(created[0]));
  } catch (error) {
    handleError(error, res);
  }
});

router.get("/tasks/:id", async (req, res) => {
  try {
    const { id } = GetTaskParams.parse(req.params);
    const data = await supabaseRequest<SupabaseTask[]>(
      `/tasks?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    );
    if (!data[0]) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(toTask(data[0]));
  } catch (error) {
    handleError(error, res);
  }
});

router.patch("/tasks/:id", async (req, res) => {
  try {
    const { id } = DeleteTaskParams.parse(req.params);
    const body = UpdateTaskBody.parse(req.body);
    const payload: Record<string, string | boolean | null | ChecklistItem[]> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) payload.title = body.title.trim();
    if (body.description !== undefined) payload.description = body.description;
    if (body.completed !== undefined) payload.completed = body.completed;
    if (body.dueDate !== undefined) payload.due_date = dateOnly(body.dueDate);
    if (body.checklist !== undefined) payload.checklist = body.checklist;

    const data = await supabaseRequest<SupabaseTask[]>(
      `/tasks?id=eq.${encodeURIComponent(id)}&select=*`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      },
    );
    if (!data[0]) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(toTask(data[0]));
  } catch (error) {
    handleError(error, res);
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = UpdateTaskParams.parse(req.params);
    const data = await supabaseRequest<SupabaseTask[]>(
      `/tasks?id=eq.${encodeURIComponent(id)}&select=id`,
      {
        method: "DELETE",
        headers: {
          Prefer: "return=representation",
        },
      },
    );
    if (!data[0]) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

router.get("/dashboard/summary", async (_req, res) => {
  try {
    const params = new URLSearchParams({
      select: "*",
      order: "completed.asc,due_date.asc,created_at.desc",
      limit: "100",
    });
    const tasks = (await supabaseRequest<SupabaseTask[]>(
      `/tasks?${params.toString()}`,
    )).map(toTask);
    const today = new Date().toISOString().slice(0, 10);
    const summary = {
      total: tasks.length,
      open: tasks.filter((task) => !task.completed).length,
      completed: tasks.filter((task) => task.completed).length,
      dueToday: tasks.filter(
        (task) => !task.completed && task.dueDate === today,
      ).length,
      nextTasks: tasks.filter((task) => !task.completed).slice(0, 5),
    };
    res.json(GetDashboardSummaryResponse.parse(summary));
  } catch (error) {
    handleError(error, res);
  }
});

export default router;