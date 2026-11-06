import { api } from "./client";
import type { HookEvent } from "./types/event";
import type { Delivery } from "./types/delivery";

export async function getEvents(): Promise<HookEvent[]> {
  const { data } = await api.get<HookEvent[]>("/events/");
  return data;
}

export async function getEvent(id: number): Promise<HookEvent> {
  const { data } = await api.get<HookEvent>(`/events/${id}/`);
  return data;
}

export async function getEventDeliveries(
  id: number,
): Promise<Delivery[]> {
  const { data } = await api.get<Delivery[]>(`/events/${id}/deliveries/`);
  return data;
}
