import { api } from "./client";
import type { Delivery } from "./types/delivery";

export async function getDeliveries(): Promise<Delivery[]> {
  const { data } = await api.get<Delivery[]>("/deliveries/");

  return data;
}