export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type PromoUsageStatus = "RESERVED" | "CONFIRMED" | "RELEASED";

export interface ValidatePromoInput {
  eventId: string;
  promoCode: string;
  seatLabels: string[];
  buyerPhone?: string;
}

export interface PromoValidationSuccess {
  valid: true;
  promo: {
    id: string;
    code: string;
    name: string;
    description: string;
    discountType: DiscountType;
    discountValue: number;
    maxDiscountAmount: number | null;
    minPurchaseAmount: number;
    eventId: string | null;
    zoneId: string | null;
  };
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  eligibleSeatsCount: number;
}

export interface PromoValidationFailure {
  valid: false;
  error: string;
  code?:
    | "PROMO_NOT_FOUND"
    | "PROMO_INACTIVE"
    | "PROMO_NOT_STARTED"
    | "PROMO_EXPIRED"
    | "EVENT_MISMATCH"
    | "ZONE_MISMATCH"
    | "MIN_PURCHASE_NOT_MET"
    | "QUOTA_EXHAUSTED"
    | "USER_LIMIT_REACHED"
    | "INVALID_INPUT";
}

export type ValidatePromoResult = PromoValidationSuccess | PromoValidationFailure;

export interface OrganizerPromoItem {
  id: string;
  name: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  minPurchaseAmount: number;
  eventId: string | null;
  eventName: string | null;
  zoneId: string | null;
  zoneName: string | null;
  startsAt: string;
  expiresAt: string;
  totalQuota: number | null;
  usedQuota: number;
  maxUsesPerUser: number;
  isActive: boolean;
  totalDiscountGiven: number;
  totalSalesGenerated: number;
  statusText: "ACTIVE" | "EXPIRED" | "UPCOMING" | "INACTIVE" | "EXHAUSTED";
  createdAt: string;
}

export interface OrganizerPromoStats {
  totalPromos: number;
  activePromos: number;
  endedPromos: number;
  totalUsages: number;
  uniqueBuyers: number;
  totalDiscountGiven: number;
  totalSalesGenerated: number;
}

export interface CreatePromoPayload {
  name: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minPurchaseAmount?: number;
  eventId?: string | null;
  zoneId?: string | null;
  startsAt: string;
  expiresAt: string;
  totalQuota?: number | null;
  maxUsesPerUser?: number;
  isActive?: boolean;
}
