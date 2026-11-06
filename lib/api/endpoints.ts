import { api } from "./client";
import type {
  WebhookEndpoint,
  WebhookEndpointFilters,
  WebhookEndpointPayload,
} from "./types/endpoint";

export async function getEndpoints(
  filters: WebhookEndpointFilters = {},
): Promise<WebhookEndpoint[]> {
  const { data } = await api.get<WebhookEndpoint[]>("/webhooks/", {
    params: filters,
  });

  return data;
}

export async function getEndpoint(
  id: number,
): Promise<WebhookEndpoint> {
  const { data } = await api.get<WebhookEndpoint>(`/webhooks/${id}/`);

  return data;
}

export async function createEndpoint(
  payload: WebhookEndpointPayload,
): Promise<WebhookEndpoint> {
  const { data } = await api.post<WebhookEndpoint>(
    "/webhooks/",
    payload,
  );

  return data;
}

export async function updateEndpoint(
  id: number,
  payload: Partial<WebhookEndpointPayload>,
): Promise<WebhookEndpoint> {
  const { data } = await api.patch<WebhookEndpoint>(
    `/webhooks/${id}/`,
    payload,
  );

  return data;
}

export async function deleteEndpoint(id: number): Promise<void> {
  await api.delete(`/webhooks/${id}/`);
}
