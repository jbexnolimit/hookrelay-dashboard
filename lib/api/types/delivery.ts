export interface Delivery {
  id: number;
  event: number;
  event_type: string;
  endpoint: number;
  endpoint_name: string;
  endpoint_slug: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  next_retry_at: string | null;
  last_attempt_at: string | null;
  delivered_at: string | null;
  last_http_status: number | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}