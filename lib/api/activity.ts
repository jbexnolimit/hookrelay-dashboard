import { api } from "./client";
import type { DeliveryActivity } from "./types/activity";

export async function getDeliveryActivity(): Promise<DeliveryActivity> {
  const { data } = await api.get<DeliveryActivity>("/analytics/activity/");
  return data;
}