export type WaitingListStatus =
  | "WAITING"
  | "OFFERED"
  | "CONVERTED"
  | "EXPIRED"
  | "CANCELLED";

export interface RegisterWaitingListInput {
  eventId: string;
  zoneId: string;
  buyerName: string;
  buyerPhone: string;
  quantity: number;
}

export interface WaitingListEntryDetails {
  id: string;
  eventId: string;
  eventName: string;
  eventSlug: string;
  venueName: string;
  startsAt: string;
  zoneId: string;
  zoneName: string;
  zoneColor: string;
  zonePrice: number;
  buyerName: string;
  buyerPhone: string;
  quantity: number;
  status: WaitingListStatus;
  token: string;
  queuePosition?: number;
  offerExpiresAt?: string | null;
  offerNotifiedAt?: string | null;
  convertedOrderId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneWaitingSummary {
  zoneId: string;
  zoneName: string;
  zoneColor: string;
  zonePrice: number;
  availableSeats: number;
  activeOfferedSeats: number;
  waitingCount: number;
  waitingRequestedSeats: number;
}
