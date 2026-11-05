import { api } from "./client";
import type { Delivery } from "./types/delivery";
import type { DeliveryAttempt } from "./types/delivery-attempt";

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
