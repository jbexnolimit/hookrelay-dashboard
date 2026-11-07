import { api } from "./client";
import type { HookEvent } from "./types/event";
import type { Delivery } from "./types/delivery";

export interface CreateEventPayload {
  event_type: string;
  payload: Record<string, unknown>;
  idempotency_key?: string;
}

export interface CreateEventResponse {
  message: string;
  idempotent_replay: boolean;
  event: HookEvent;
  deliveries: Delivery[];
}

export async function getEvents(): Promise<HookEvent[]> {
  const { data } = await api.get<HookEvent[]>("/events/");
  return data;
}

export async function getEvent(id: number): Promise<HookEvent> {
  const { data } = await api.get<HookEvent>(`/events/${id}/`);
  return data;
}

export async function getEventDeliveries(id: number): Promise<Delivery[]> {
  const { data } = await api.get<Delivery[]>(`/events/${id}/deliveries/`);
  return data;
}

export async function createEvent(
  payload: CreateEventPayload,
): Promise<CreateEventResponse> {
  const { data } = await api.post<CreateEventResponse>("/events/", payload);
  return data;
}
