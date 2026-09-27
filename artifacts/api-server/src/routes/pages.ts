import { Router, type IRouter, type Response } from "express";
import {
  CreateBlockBody,
  CreateBlockParams,
  CreateBlockResponse,
  CreatePageBody,
  DeleteBlockParams,
  DeletePageParams,
  GetPageParams,
  GetPageResponse,
  ListPagesResponse,
  UpdateBlockBody,
  UpdateBlockParams,
  UpdateBlockResponse,
  UpdatePageBody,
  UpdatePageParams,
  CreatePageResponse,
  UpdatePageResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { SupabaseError, supabaseRequest } from "../lib/supabase";

type SupabasePage = {
  id: string;
  parent_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

type SupabaseBlock = {
  id: string;
  page_id: string;
  type: "paragraph" | "heading_1" | "heading_2" | "heading_3" | "todo";
  position: number;
  content: string;
  checked: boolean;
  created_at: string;
  updated_at: string;
};

const router: IRouter = Router();

function toPage(page: SupabasePage) {
  return {
    id: page.id,
    parentId: page.parent_id,
    title: page.title,
    createdAt: page.created_at,
    updatedAt: page.updated_at,
  };
}

function toBlock(block: SupabaseBlock) {
  return {
    id: block.id,
    pageId: block.page_id,
    type: block.type,
    position: block.position,
    content: block.content,
    checked: block.checked,
    createdAt: block.created_at,
    updatedAt: block.updated_at,
  };
}

function handleError(error: unknown, res: Response) {
  if (error instanceof SupabaseError) {
    const status = error.status === 404 ? 503 : error.status;
    res.status(status).json({
      error:
        status === 503
          ? "The Supabase pages and blocks tables are not ready. Run supabase/schema.sql in the Supabase SQL Editor."
          : error.message,
    });
    return;
  }

  logger.error({ err: error }, "Page API request failed");
  res.status(500).json({ error: "Unable to complete page request" });
}

router.get("/pages", async (_req, res) => {
  try {
    const data = await supabaseRequest<SupabasePage[]>(
      "/pages?select=*&order=title.asc,created_at.asc&limit=500",
    );
    res.json(ListPagesResponse.parse(data.map(toPage)));
  } catch (error) {
    handleError(error, res);
  }
});

router.post("/pages", async (req, res) => {
  try {
    const body = CreatePageBody.parse(req.body);
    const now = new Date().toISOString();
    const data = await supabaseRequest<SupabasePage[]>("/pages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        parent_id: body.parentId ?? null,
        title: body.title?.trim() || "Untitled",
        created_at: now,
        updated_at: now,
      }),
    });
    res.status(201).json(CreatePageResponse.parse(toPage(data[0])));
  } catch (error) {
    handleError(error, res);
  }
});

router.get("/pages/:id", async (req, res) => {
  try {
    const { id } = GetPageParams.parse(req.params);
    const pages = await supabaseRequest<SupabasePage[]>(
      `/pages?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    );
    if (!pages[0]) {
      res.status(404).json({ error: "Page not found" });
      return;
    }
    const blocks = await supabaseRequest<SupabaseBlock[]>(
      `/blocks?page_id=eq.${encodeURIComponent(id)}&select=*&order=position.asc,created_at.asc&limit=500`,
    );
    res.json(
      GetPageResponse.parse({
        ...toPage(pages[0]),
        blocks: blocks.map(toBlock),
      }),
    );
  } catch (error) {
    handleError(error, res);
  }
});

router.patch("/pages/:id", async (req, res) => {
  try {
    const { id } = UpdatePageParams.parse(req.params);
    const body = UpdatePageBody.parse(req.body);
    const payload: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) payload.title = body.title.trim();
    if (body.parentId !== undefined) payload.parent_id = body.parentId;
    const data = await supabaseRequest<SupabasePage[]>(
      `/pages?id=eq.${encodeURIComponent(id)}&select=*`,
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
      res.status(404).json({ error: "Page not found" });
      return;
    }
    res.json(UpdatePageResponse.parse(toPage(data[0])));
  } catch (error) {
    handleError(error, res);
  }
});

router.delete("/pages/:id", async (req, res) => {
  try {
    const { id } = DeletePageParams.parse(req.params);
    const data = await supabaseRequest<{ id: string }[]>(
      `/pages?id=eq.${encodeURIComponent(id)}&select=id`,
      {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      },
    );
    if (!data[0]) {
      res.status(404).json({ error: "Page not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

router.post("/pages/:id/blocks", async (req, res) => {
  try {
    const { id: pageId } = CreateBlockParams.parse(req.params);
    const body = CreateBlockBody.parse(req.body);
    const pages = await supabaseRequest<{ id: string }[]>(
      `/pages?id=eq.${encodeURIComponent(pageId)}&select=id&limit=1`,
    );
    if (!pages[0]) {
      res.status(404).json({ error: "Page not found" });
      return;
    }
    const now = new Date().toISOString();
    const data = await supabaseRequest<SupabaseBlock[]>("/blocks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        id: crypto.randomUUID(),
        page_id: pageId,
        type: body.type,
        position: body.position ?? 0,
        content: body.content ?? "",
        checked: body.checked ?? false,
        created_at: now,
        updated_at: now,
      }),
    });
    res.status(201).json(
      CreateBlockResponse.parse(toBlock(data[0])),
    );
  } catch (error) {
    handleError(error, res);
  }
});

router.patch("/blocks/:id", async (req, res) => {
  try {
    const { id } = UpdateBlockParams.parse(req.params);
    const body = UpdateBlockBody.parse(req.body);
    const payload: Record<string, string | number | boolean> = {
      updated_at: new Date().toISOString(),
    };
    if (body.type !== undefined) payload.type = body.type;
    if (body.position !== undefined) payload.position = body.position;
    if (body.content !== undefined) payload.content = body.content;
    if (body.checked !== undefined) payload.checked = body.checked;
    const data = await supabaseRequest<SupabaseBlock[]>(
      `/blocks?id=eq.${encodeURIComponent(id)}&select=*`,
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
      res.status(404).json({ error: "Block not found" });
      return;
    }
    res.json(UpdateBlockResponse.parse(toBlock(data[0])));
  } catch (error) {
    handleError(error, res);
  }
});

router.delete("/blocks/:id", async (req, res) => {
  try {
    const { id } = DeleteBlockParams.parse(req.params);
    const data = await supabaseRequest<{ id: string }[]>(
      `/blocks?id=eq.${encodeURIComponent(id)}&select=id`,
      {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      },
    );
    if (!data[0]) {
      res.status(404).json({ error: "Block not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    handleError(error, res);
  }
});

export default router;