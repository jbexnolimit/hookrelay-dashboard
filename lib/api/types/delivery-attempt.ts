export interface DeliveryAttempt {
  id: number;
  attempt_id: string;
  delivery: number;
  attempt_number: number;
  result: string;
  http_status_code: number | null;
  response_time_ms: number | null;
  response_body: string | null;
  error_message: string | null;
  attempted_at: string;
}
