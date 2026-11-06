export interface WebhookEndpoint {
  id: number;
  slug: string;
  name: string;
  url: string;
  event_types: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookEndpointPayload {
  slug: string;
  name: string;
  url: string;
  event_types: string[];
  is_active: boolean;
}

export interface WebhookEndpointFilters {
  is_active?: boolean;
  event_type?: string;
}
