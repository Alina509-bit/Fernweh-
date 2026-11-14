import type { Destination, DestinationFilter, DestinationInput } from "../types/destination";
import { request } from "./client";

const BASE = "/api/destinations";

/** Alle REST-Aufrufe für die Ressource "destinations" an einer Stelle. */
export const destinationsApi = {
  list(filter: Partial<DestinationFilter> = {}): Promise<Destination[]> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filter)) {
      if (value) params.set(key, String(value));
    }
    const qs = params.toString();
    return request<Destination[]>(qs ? `${BASE}?${qs}` : BASE);
  },

  get(id: string): Promise<Destination> {
    return request<Destination>(`${BASE}/${encodeURIComponent(id)}`);
  },

  create(input: DestinationInput): Promise<Destination> {
    return request<Destination>(BASE, { method: "POST", body: JSON.stringify(input) });
  },

  replace(id: string, input: DestinationInput): Promise<Destination> {
    return request<Destination>(`${BASE}/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  patch(id: string, patch: Partial<DestinationInput>): Promise<Destination> {
    return request<Destination>(`${BASE}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  remove(id: string): Promise<void> {
    return request<void>(`${BASE}/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
