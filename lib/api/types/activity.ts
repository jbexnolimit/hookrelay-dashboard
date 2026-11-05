export interface DeliveryActivityDay {
  date: string;
  queued: number;
  processing: number;
  delivered: number;
  failed: number;
}

export interface DeliveryActivity {
  days: DeliveryActivityDay[];
}