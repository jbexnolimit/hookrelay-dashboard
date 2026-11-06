export interface HookEvent {
  id: number;
  event_type: string;
  payload: Record<string, unknown>;
  idempotency_key: string | null;
  created_at: string;
}
