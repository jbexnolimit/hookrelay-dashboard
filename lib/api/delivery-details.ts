import { api } from "./client";
import type { Delivery } from "./types/delivery";
import type { DeliveryAttempt } from "./types/delivery-attempt";

export interface RetryDeliveryResponse {
  message: string;
  delivery: Delivery;
}

export async function getDelivery(id: number): Promise<Delivery> {
  const { data } = await api.get<Delivery>(`/deliveries/${id}/`);
  return data;
}

export async function getDeliveryAttempts(
  id: number,
): Promise<DeliveryAttempt[]> {
  const { data } = await api.get<DeliveryAttempt[]>(
    `/deliveries/${id}/attempts/`,
  );
  return data;
}

export async function retryDelivery(
  id: number,
): Promise<RetryDeliveryResponse> {
  const { data } = await api.post<RetryDeliveryResponse>(
    `/deliveries/${id}/retry/`,
  );
  return data;
}
