import { api } from "./client";
import type { AnalyticsSummary } from "./types/analytics";

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const { data } = await api.get<AnalyticsSummary>(
    "/analytics/summary/",
  );

  return data;
}