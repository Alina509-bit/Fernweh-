import { Hono } from "@hono/hono";
import type { AppEnv } from "../auth.ts";
import {
  DestinationInputSchema,
  DestinationPatchSchema,
  DestinationQuerySchema,
} from "../models/destination.ts";
import type { DestinationService } from "../services/destinationService.ts";
import { parseOrThrow, readJson } from "../validation.ts";

/**
 * REST-Controller für /api/destinations (nur für angemeldete Nutzer, siehe app.ts).
 * Verantwortung: HTTP ↔ Fachlogik übersetzen (Parsing, Validierung, Statuscodes).
 * Die userId kommt aus der Session (c.get("user")), nie aus dem Request.
 */
export function destinationRoutes(service: DestinationService) {
  const router = new Hono<AppEnv>();

  router.get("/", async (c) => {
    const query = parseOrThrow(DestinationQuerySchema, c.req.query());
    return c.json(await service.list(c.get("user").id, query));
  });

  router.get("/:id", async (c) => {
    return c.json(await service.get(c.get("user").id, c.req.param("id")));
  });

  router.post("/", async (c) => {
    const input = parseOrThrow(DestinationInputSchema, await readJson(c.req.raw));
    const created = await service.create(c.get("user").id, input);
    c.header("Location", `/api/destinations/${created.id}`);
    return c.json(created, 201);
  });

  router.put("/:id", async (c) => {
    const input = parseOrThrow(DestinationInputSchema, await readJson(c.req.raw));
    return c.json(await service.replace(c.get("user").id, c.req.param("id"), input));
  });

  router.patch("/:id", async (c) => {
    const patch = parseOrThrow(DestinationPatchSchema, await readJson(c.req.raw));
    return c.json(await service.update(c.get("user").id, c.req.param("id"), patch));
  });

  router.delete("/:id", async (c) => {
    await service.remove(c.get("user").id, c.req.param("id"));
    return c.body(null, 204);
  });

  return router;
}
