export type AnalyticsPeriod = "7d" | "30d" | "90d" | "all";
export type AnalyticsGranularity = "daily" | "weekly" | "monthly";

export interface AnalyticsFilter {
  eventId?: string;
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
  compareWithPrevious?: boolean;
}

export interface MetricWithGrowth {
  value: number;
  previousValue: number;
  percentageChange: number; // e.g. +15.5 or -5.2
  trend: "up" | "down" | "flat";
}

export interface SalesTrendPoint {
  dateKey: string; // YYYY-MM-DD or YYYY-WW or YYYY-MM
  label: string; // e.g. "1 Nov" or "W44"
  revenue: number;
  ticketCount: number;
  orderCount: number;
  // Jika komparasi aktif
  compareDateKey?: string;
  compareLabel?: string;
  compareRevenue?: number;
  compareTicketCount?: number;
  compareOrderCount?: number;
}

export interface ZonePerformanceItem {
  zoneId: string;
  zoneName: string;
  zoneColor: string;
  price: number;
  eventId: string;
  eventName: string;
  ticketsSold: number;
  revenue: number;
  revenueShare: number; // 0 to 100%
  totalQuota: number;
  availableQuota: number;
  occupancyRate: number; // 0 to 100%
}

export interface HourlySalesVelocity {
  hour: number; // 0..23
  hourLabel: string; // e.g. "14:00"
  ticketCount: number;
  orderCount: number;
  revenue: number;
}

export interface DayOfWeekVelocity {
  dayIndex: number; // 0..6 (0=Minggu, 1=Senin, ...)
  dayName: string; // e.g. "Senin"
  ticketCount: number;
  revenue: number;
}

export interface DaysBeforeEventBucket {
  bucketLabel: string; // e.g. "H-30+", "H-14 s/d H-30", "H-7 s/d H-14", "H-3 s/d H-7", "H-1 s/d H-3", "Hari H"
  ticketCount: number;
  revenue: number;
  share: number;
}

export interface SeatOccupancyData {
  totalCapacity: number;
  availableSeats: number;
  soldSeats: number;
  heldSeats: number;
  occupancyRate: number; // soldSeats / totalCapacity * 100
}

export interface CheckInHourlyPoint {
  hour: number;
  hourLabel: string;
  count: number;
}

export interface AttendanceData {
  totalSoldTickets: number;
  checkedInCount: number;
  unattendedCount: number;
  attendanceRate: number; // checkedInCount / totalSoldTickets * 100
  hourlyCheckIns: CheckInHourlyPoint[];
  gateDistribution: {
    checkerId: string;
    label: string;
    count: number;
    share: number;
  }[];
}

export interface ActionableInsight {
  id: string;
  type: "success" | "warning" | "info" | "trend";
  category: "sales" | "zone" | "velocity" | "occupancy" | "attendance";
  title: string;
  message: string;
  metric?: string;
}

export interface SalesPerformanceAnalyticsResult {
  organizerId: string;
  selectedEventId: string | null;
  selectedEventName: string | null;
  period: AnalyticsPeriod;
  granularity: AnalyticsGranularity;
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;

  overview: {
    grossRevenue: MetricWithGrowth;
    ticketsSold: MetricWithGrowth;
    paidOrders: MetricWithGrowth;
    averageOrderValue: MetricWithGrowth;
    averageTicketsPerOrder: number;
    occupancyRate: number;
    attendanceRate: number;
  };

  salesTrend: SalesTrendPoint[];
  zones: ZonePerformanceItem[];
  velocity: {
    hourly: HourlySalesVelocity[];
    peakHour: { hour: number; hourLabel: string; ticketCount: number };
    daysOfWeek: DayOfWeekVelocity[];
    peakDay: { dayName: string; ticketCount: number };
    daysBeforeEvent: DaysBeforeEventBucket[];
    averageTicketsPerDay: number;
  };
  occupancy: SeatOccupancyData;
  attendance: AttendanceData;
  insights: ActionableInsight[];
}
