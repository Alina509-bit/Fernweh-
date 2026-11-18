import { Hono } from "@hono/hono";
import {
  DestinationInputSchema,
  DestinationPatchSchema,
  DestinationQuerySchema,
} from "../models/destination.ts";
import type { DestinationService } from "../services/destinationService.ts";
import { parseOrThrow, readJson } from "../validation.ts";

/**
 * REST-Controller für die Ressource /api/destinations.
 * Verantwortung: HTTP ↔ Fachlogik übersetzen (Parsing, Validierung, Statuscodes).
 * Geschäftsregeln liegen im DestinationService.
 */
export function destinationRoutes(service: DestinationService) {
  const router = new Hono();

  router.get("/", async (c) => {
    const query = parseOrThrow(DestinationQuerySchema, c.req.query());
    return c.json(await service.list(query));
  });

  router.get("/:id", async (c) => {
    return c.json(await service.get(c.req.param("id")));
  });

  router.post("/", async (c) => {
    const input = parseOrThrow(DestinationInputSchema, await readJson(c.req.raw));
    const created = await service.create(input);
    c.header("Location", `/api/destinations/${created.id}`);
    return c.json(created, 201);
  });

  router.put("/:id", async (c) => {
    const input = parseOrThrow(DestinationInputSchema, await readJson(c.req.raw));
    return c.json(await service.replace(c.req.param("id"), input));
  });

  router.patch("/:id", async (c) => {
    const patch = parseOrThrow(DestinationPatchSchema, await readJson(c.req.raw));
    return c.json(await service.update(c.req.param("id"), patch));
  });

  router.delete("/:id", async (c) => {
    await service.remove(c.req.param("id"));
    return c.body(null, 204);
  });

  return router;
}
