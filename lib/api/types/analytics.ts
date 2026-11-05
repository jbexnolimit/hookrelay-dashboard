export interface AnalyticsSummary {
  total_events: number;
  total_deliveries: number;
  delivery_status_counts: {
    queued: number;
    processing: number;
    delivered: number;
    failed: number;
  };
  success_rate_percent: number;
  average_response_time: number | null;
}