import { api } from "./client";
import type { DeliveryActivity } from "./types/activity";

export async function getDeliveryActivity(days: 7 | 14 | 30 = 7): Promise<DeliveryActivity> {
  const { data } = await api.get<DeliveryActivity>("/analytics/activity/", {
    params: { days },
  });
  return data;
}
