import { prisma } from "@/lib/db";
import type {
  ActionableInsight,
  AnalyticsFilter,
  AnalyticsPeriod,
  AttendanceData,
  CheckInHourlyPoint,
  DaysBeforeEventBucket,
  DayOfWeekVelocity,
  HourlySalesVelocity,
  MetricWithGrowth,
  SalesPerformanceAnalyticsResult,
  SalesTrendPoint,
  SeatOccupancyData,
  ZonePerformanceItem,
} from "./types";

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7

function toWibDate(date: Date): Date {
  return new Date(date.getTime() + WIB_OFFSET_MS);
}

function formatDateKey(dateWib: Date, granularity: "daily" | "weekly" | "monthly"): string {
  const y = dateWib.getUTCFullYear();
  const m = String(dateWib.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateWib.getUTCDate()).padStart(2, "0");

  if (granularity === "monthly") {
    return `${y}-${m}`;
  }
  if (granularity === "weekly") {
    // Nomor minggu sederhana
    const firstDayOfYear = new Date(Date.UTC(y, 0, 1));
    const pastDaysOfYear = (dateWib.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
    return `${y}-W${String(weekNum).padStart(2, "0")}`;
  }
  return `${y}-${m}-${d}`;
}

function formatDateLabel(dateWib: Date, granularity: "daily" | "weekly" | "monthly"): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
  const d = dateWib.getUTCDate();
  const m = months[dateWib.getUTCMonth()];
  const y = dateWib.getUTCFullYear();

  if (granularity === "monthly") {
    return `${m} ${y}`;
  }
  if (granularity === "weekly") {
    const firstDayOfYear = new Date(Date.UTC(y, 0, 1));
    const pastDaysOfYear = (dateWib.getTime() - firstDayOfYear.getTime()) / 86400000;
    const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getUTCDay() + 1) / 7);
    return `Mgg ${weekNum} (${m})`;
  }
  return `${d} ${m}`;
}

function computeGrowth(current: number, previous: number): MetricWithGrowth {
  if (previous === 0) {
    return {
      value: current,
      previousValue: previous,
      percentageChange: current > 0 ? 100 : 0,
      trend: current > 0 ? "up" : "flat",
    };
  }
  const change = ((current - previous) / previous) * 100;
  const roundedChange = Math.round(change * 10) / 10;
  return {
    value: current,
    previousValue: previous,
    percentageChange: roundedChange,
    trend: roundedChange > 0 ? "up" : roundedChange < 0 ? "down" : "flat",
  };
}

export async function getSalesPerformanceAnalytics(
  organizerId: string,
  filter: AnalyticsFilter
): Promise<SalesPerformanceAnalyticsResult> {
  const now = new Date();

  // Validasi event jika ditentukan
  let selectedEventName: string | null = null;
  if (filter.eventId) {
    const ev = await prisma.event.findFirst({
      where: { id: filter.eventId, organizerId },
      select: { name: true },
    });
    if (!ev) {
      throw new Error("Acara tidak ditemukan atau Anda tidak memiliki akses");
    }
    selectedEventName = ev.name;
  }

  // Rentang Tanggal
  let startDate: Date;
  const endDate = new Date(now);
  let compareStartDate: Date | undefined;
  let compareEndDate: Date | undefined;

  const period: AnalyticsPeriod = filter.period || "30d";
  const granularity = filter.granularity || "daily";

  if (period === "7d") {
    startDate = new Date(now.getTime() - 7 * 86400000);
    compareEndDate = new Date(startDate);
    compareStartDate = new Date(startDate.getTime() - 7 * 86400000);
  } else if (period === "90d") {
    startDate = new Date(now.getTime() - 90 * 86400000);
    compareEndDate = new Date(startDate);
    compareStartDate = new Date(startDate.getTime() - 90 * 86400000);
  } else if (period === "all") {
    // Ambil order pertama
    const earliestOrder = await prisma.order.findFirst({
      where: {
        event: { organizerId },
        ...(filter.eventId ? { eventId: filter.eventId } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    startDate = earliestOrder?.createdAt ?? new Date(now.getTime() - 30 * 86400000);
    // Untuk 'all', perbandingan periode tidak berlaku
    compareStartDate = undefined;
    compareEndDate = undefined;
  } else {
    // Default 30d
    startDate = new Date(now.getTime() - 30 * 86400000);
    compareEndDate = new Date(startDate);
    compareStartDate = new Date(startDate.getTime() - 30 * 86400000);
  }

  // 1. Ambil Order PAID Periode Saat Ini
  const currentOrders = await prisma.order.findMany({
    where: {
      event: { organizerId },
      ...(filter.eventId ? { eventId: filter.eventId } : {}),
      status: "PAID",
      createdAt: { gte: startDate, lte: endDate },
    },
    include: {
      tickets: {
        include: {
          seat: {
            include: { zone: true },
          },
        },
      },
      event: {
        select: { id: true, name: true, startsAt: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. Ambil Order PAID Periode Sebelumnya (jika ada perbandingan)
  let previousOrders: typeof currentOrders = [];
  if (compareStartDate && compareEndDate) {
    previousOrders = await prisma.order.findMany({
      where: {
        event: { organizerId },
        ...(filter.eventId ? { eventId: filter.eventId } : {}),
        status: "PAID",
        createdAt: { gte: compareStartDate, lte: compareEndDate },
      },
      include: {
        tickets: {
          include: {
            seat: {
              include: { zone: true },
            },
          },
        },
        event: {
          select: { id: true, name: true, startsAt: true },
        },
      },
    });
  }

  // Metrik Overview
  const currentRevenue = currentOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const previousRevenue = previousOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  const currentPaidOrdersCount = currentOrders.length;
  const previousPaidOrdersCount = previousOrders.length;

  const currentTicketsSold = currentOrders.reduce((sum, o) => sum + o.tickets.length, 0);
  const previousTicketsSold = previousOrders.reduce((sum, o) => sum + o.tickets.length, 0);

  const currentAov = currentPaidOrdersCount > 0 ? Math.round(currentRevenue / currentPaidOrdersCount) : 0;
  const previousAov = previousPaidOrdersCount > 0 ? Math.round(previousRevenue / previousPaidOrdersCount) : 0;

  const averageTicketsPerOrder =
    currentPaidOrdersCount > 0
      ? Math.round((currentTicketsSold / currentPaidOrdersCount) * 10) / 10
      : 0;

  // 3. Sales Trend (Timeseries)
  const trendMap = new Map<
    string,
    { label: string; revenue: number; ticketCount: number; orderCount: number }
  >();

  // Inisialisasi rentang bucket agar grafik tidak bolong jika harian/mingguan
  if (period !== "all" && granularity === "daily") {
    const daysCount = Math.min(31, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
    for (let i = 0; i <= daysCount; i++) {
      const d = new Date(startDate.getTime() + i * 86400000);
      if (d <= endDate) {
        const dWib = toWibDate(d);
        const k = formatDateKey(dWib, granularity);
        if (!trendMap.has(k)) {
          trendMap.set(k, {
            label: formatDateLabel(dWib, granularity),
            revenue: 0,
            ticketCount: 0,
            orderCount: 0,
          });
        }
      }
    }
  }

  for (const o of currentOrders) {
    const timeRef = o.paidAt ?? o.createdAt;
    const wib = toWibDate(timeRef);
    const k = formatDateKey(wib, granularity);
    const existing = trendMap.get(k) || {
      label: formatDateLabel(wib, granularity),
      revenue: 0,
      ticketCount: 0,
      orderCount: 0,
    };
    existing.revenue += o.totalAmount;
    existing.ticketCount += o.tickets.length;
    existing.orderCount += 1;
    trendMap.set(k, existing);
  }

  const salesTrend: SalesTrendPoint[] = Array.from(trendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, val]) => ({
      dateKey,
      label: val.label,
      revenue: val.revenue,
      ticketCount: val.ticketCount,
      orderCount: val.orderCount,
    }));

  // 4. Sales by Ticket Zone
  // Ambil seluruh zona pada acara yang dipilih (atau semua acara organizer)
  const zonesInEvents = await prisma.zone.findMany({
    where: {
      event: { organizerId },
      ...(filter.eventId ? { eventId: filter.eventId } : {}),
    },
    include: {
      event: { select: { id: true, name: true } },
      seats: {
        select: {
          id: true,
          status: true,
          heldUntil: true,
        },
      },
    },
    orderBy: [{ price: "desc" }, { name: "asc" }],
  });

  // Hitung tiket terjual per zona dari transaksi PAID
  const zoneSalesMap = new Map<string, { ticketsSold: number; revenue: number }>();
  for (const o of currentOrders) {
    for (const t of o.tickets) {
      if (t.seat && t.seat.zoneId) {
        const prev = zoneSalesMap.get(t.seat.zoneId) || { ticketsSold: 0, revenue: 0 };
        prev.ticketsSold += 1;
        prev.revenue += t.seat.zone?.price ?? 0;
        zoneSalesMap.set(t.seat.zoneId, prev);
      }
    }
  }

  const totalSoldAllZones = Array.from(zoneSalesMap.values()).reduce((s, z) => s + z.revenue, 0);

  const zones: ZonePerformanceItem[] = zonesInEvents.map((z) => {
    const sales = zoneSalesMap.get(z.id) || { ticketsSold: 0, revenue: 0 };
    const totalQuota = z.seats.length;
    const soldCount = z.seats.filter((s) => s.status === "SOLD").length;
    const heldCount = z.seats.filter(
      (s) => s.status === "HELD" && s.heldUntil && s.heldUntil > now
    ).length;
    const availableQuota = Math.max(0, totalQuota - soldCount - heldCount);
    const occupancyRate = totalQuota > 0 ? Math.round((soldCount / totalQuota) * 1000) / 10 : 0;
    const revenueShare =
      totalSoldAllZones > 0
        ? Math.round((sales.revenue / totalSoldAllZones) * 1000) / 10
        : 0;

    return {
      zoneId: z.id,
      zoneName: z.name,
      zoneColor: z.color,
      price: z.price,
      eventId: z.eventId,
      eventName: z.event.name,
      ticketsSold: sales.ticketsSold,
      revenue: sales.revenue,
      revenueShare,
      totalQuota,
      availableQuota,
      occupancyRate,
    };
  });

  // 5. Sales Velocity
  // A. Distribusi per Jam (00 - 23 WIB)
  const hourlyBuckets: HourlySalesVelocity[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    hourLabel: `${String(h).padStart(2, "0")}:00`,
    ticketCount: 0,
    orderCount: 0,
    revenue: 0,
  }));

  for (const o of currentOrders) {
    const timeRef = o.paidAt ?? o.createdAt;
    const wib = toWibDate(timeRef);
    const h = wib.getUTCHours();
    if (hourlyBuckets[h]) {
      hourlyBuckets[h].ticketCount += o.tickets.length;
      hourlyBuckets[h].orderCount += 1;
      hourlyBuckets[h].revenue += o.totalAmount;
    }
  }

  let peakHour = hourlyBuckets[0];
  for (const b of hourlyBuckets) {
    if (b.ticketCount > peakHour.ticketCount) {
      peakHour = b;
    }
  }

  // B. Distribusi per Hari (Senin - Minggu)
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayBuckets: DayOfWeekVelocity[] = dayNames.map((name, idx) => ({
    dayIndex: idx,
    dayName: name,
    ticketCount: 0,
    revenue: 0,
  }));

  for (const o of currentOrders) {
    const timeRef = o.paidAt ?? o.createdAt;
    const wib = toWibDate(timeRef);
    const dayIdx = wib.getUTCDay();
    if (dayBuckets[dayIdx]) {
      dayBuckets[dayIdx].ticketCount += o.tickets.length;
      dayBuckets[dayIdx].revenue += o.totalAmount;
    }
  }

  let peakDay = dayBuckets[0];
  for (const d of dayBuckets) {
    if (d.ticketCount > peakDay.ticketCount) {
      peakDay = d;
    }
  }

  // C. Tren Penjualan Mendekati Hari Acara (Days Before Event)
  const daysBeforeBuckets: DaysBeforeEventBucket[] = [
    { bucketLabel: "H-30+", ticketCount: 0, revenue: 0, share: 0 },
    { bucketLabel: "H-14 s/d H-30", ticketCount: 0, revenue: 0, share: 0 },
    { bucketLabel: "H-7 s/d H-14", ticketCount: 0, revenue: 0, share: 0 },
    { bucketLabel: "H-3 s/d H-7", ticketCount: 0, revenue: 0, share: 0 },
    { bucketLabel: "H-1 s/d H-3", ticketCount: 0, revenue: 0, share: 0 },
    { bucketLabel: "Hari H", ticketCount: 0, revenue: 0, share: 0 },
  ];

  for (const o of currentOrders) {
    const eventStarts = o.event.startsAt;
    const orderTime = o.paidAt ?? o.createdAt;
    const diffDays = Math.floor((eventStarts.getTime() - orderTime.getTime()) / 86400000);

    let targetIdx = 0;
    if (diffDays >= 30) targetIdx = 0;
    else if (diffDays >= 14) targetIdx = 1;
    else if (diffDays >= 7) targetIdx = 2;
    else if (diffDays >= 3) targetIdx = 3;
    else if (diffDays >= 1) targetIdx = 4;
    else targetIdx = 5;

    daysBeforeBuckets[targetIdx].ticketCount += o.tickets.length;
    daysBeforeBuckets[targetIdx].revenue += o.totalAmount;
  }

  const totalDbeTickets = daysBeforeBuckets.reduce((s, b) => s + b.ticketCount, 0);
  for (const b of daysBeforeBuckets) {
    b.share = totalDbeTickets > 0 ? Math.round((b.ticketCount / totalDbeTickets) * 1000) / 10 : 0;
  }

  const activeDaysCount = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000));
  const averageTicketsPerDay = Math.round((currentTicketsSold / activeDaysCount) * 10) / 10;

  // 6. Seat Occupancy Analytics
  const seatsData = await prisma.seat.findMany({
    where: {
      event: { organizerId },
      ...(filter.eventId ? { eventId: filter.eventId } : {}),
    },
    select: {
      status: true,
      heldUntil: true,
    },
  });

  const totalCapacity = seatsData.length;
  const soldSeats = seatsData.filter((s) => s.status === "SOLD").length;
  const heldSeats = seatsData.filter(
    (s) => s.status === "HELD" && s.heldUntil && s.heldUntil > now
  ).length;
  const availableSeats = Math.max(0, totalCapacity - soldSeats - heldSeats);
  const occupancyRate = totalCapacity > 0 ? Math.round((soldSeats / totalCapacity) * 1000) / 10 : 0;

  const occupancy: SeatOccupancyData = {
    totalCapacity,
    availableSeats,
    soldSeats,
    heldSeats,
    occupancyRate,
  };

  // 7. Attendance Analytics
  const ticketsData = await prisma.ticket.findMany({
    where: {
      event: { organizerId },
      ...(filter.eventId ? { eventId: filter.eventId } : {}),
      order: { status: "PAID" },
    },
    select: {
      id: true,
      status: true,
      checkedInAt: true,
      checkedInBy: true,
    },
  });

  const totalSoldTickets = ticketsData.length;
  const checkedInCount = ticketsData.filter((t) => t.status === "USED").length;
  const unattendedCount = ticketsData.filter((t) => t.status === "VALID").length;
  const attendanceRate =
    totalSoldTickets > 0 ? Math.round((checkedInCount / totalSoldTickets) * 1000) / 10 : 0;

  // Check-in timeline (00..23 WIB)
  const hourlyCheckIns: CheckInHourlyPoint[] = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    hourLabel: `${String(h).padStart(2, "0")}:00`,
    count: 0,
  }));

  const gateMap = new Map<string, number>();

  for (const t of ticketsData) {
    if (t.status === "USED" && t.checkedInAt) {
      const wib = toWibDate(t.checkedInAt);
      const h = wib.getUTCHours();
      if (hourlyCheckIns[h]) {
        hourlyCheckIns[h].count += 1;
      }

      const gateKey = t.checkedInBy || "Pintu Masuk Utama";
      gateMap.set(gateKey, (gateMap.get(gateKey) || 0) + 1);
    }
  }

  const gateDistribution = Array.from(gateMap.entries()).map(([checkerId, count]) => ({
    checkerId,
    label: checkerId.startsWith("cmw") ? "Pintu Utama" : checkerId,
    count,
    share: checkedInCount > 0 ? Math.round((count / checkedInCount) * 1000) / 10 : 0,
  }));

  const attendance: AttendanceData = {
    totalSoldTickets,
    checkedInCount,
    unattendedCount,
    attendanceRate,
    hourlyCheckIns,
    gateDistribution,
  };

  // 8. Actionable Insights Berbasis Data Aktual
  const insights: ActionableInsight[] = [];

  // Insight 1: Pertumbuhan / Momentum Penjualan
  if (compareStartDate && compareEndDate) {
    const revGrowth = computeGrowth(currentRevenue, previousRevenue);
    if (revGrowth.percentageChange > 0) {
      insights.push({
        id: "insight-growth",
        type: "success",
        category: "sales",
        title: "Pertumbuhan Penjualan Positif",
        message: `Gross revenue periode ini meningkat sebesar +${revGrowth.percentageChange}% dibandingkan periode sebelumnya.`,
        metric: `+${revGrowth.percentageChange}%`,
      });
    } else if (revGrowth.percentageChange < 0) {
      insights.push({
        id: "insight-slowdown",
        type: "warning",
        category: "sales",
        title: "Perlambatan Penjualan Terdeteksi",
        message: `Gross revenue mengalami penurunan sebesar ${revGrowth.percentageChange}% dibandingkan periode sebelumnya. Pertimbangkan promo flash sale atau kampanye WhatsApp.`,
        metric: `${revGrowth.percentageChange}%`,
      });
    }
  }

  // Insight 2: Zona Terlaris
  if (zones.length > 0) {
    const sortedZones = [...zones].sort((a, b) => b.revenue - a.revenue);
    const topZone = sortedZones[0];
    if (topZone && topZone.revenue > 0) {
      insights.push({
        id: "insight-top-zone",
        type: "trend",
        category: "zone",
        title: `Zona ${topZone.zoneName} Paling Menguntungkan`,
        message: `Menyumbang ${topZone.revenueShare}% dari total pendapatan (${topZone.ticketsSold} tiket terjual).`,
        metric: `${topZone.revenueShare}% share`,
      });
    }

    // Peringatan Kuota Menipis
    const lowStockZone = zones.find((z) => z.totalQuota > 0 && z.availableQuota > 0 && z.occupancyRate >= 80);
    if (lowStockZone) {
      insights.push({
        id: "insight-low-stock",
        type: "warning",
        category: "zone",
        title: `Kuota Zona ${lowStockZone.zoneName} Hampir Habis`,
        message: `Tersisa hanya ${lowStockZone.availableQuota} kursi (${lowStockZone.occupancyRate}% terisi). Siapkan modul Smart Waiting List untuk menangkap lonjakan minat.`,
        metric: `${lowStockZone.availableQuota} sisa`,
      });
    }
  }

  // Insight 3: Jam Paling Aktif (Velocity)
  if (peakHour && peakHour.ticketCount > 0) {
    insights.push({
      id: "insight-peak-hour",
      type: "info",
      category: "velocity",
      title: "Waktu Pembelian Paling Aktif",
      message: `Puncak transaksi pembeli terjadi pada pukul ${peakHour.hourLabel} WIB dengan total ${peakHour.ticketCount} tiket terjual.`,
      metric: peakHour.hourLabel,
    });
  }

  // Insight 4: Tingkat Kehadiran (Attendance)
  if (totalSoldTickets > 0) {
    if (attendanceRate >= 70) {
      insights.push({
        id: "insight-high-attendance",
        type: "success",
        category: "attendance",
        title: "Tingkat Kehadiran Peserta Sangat Baik",
        message: `${attendanceRate}% dari pemegang tiket (${checkedInCount} dari ${totalSoldTickets}) telah berhasil check-in di pintu masuk.`,
        metric: `${attendanceRate}% hadir`,
      });
    } else if (attendanceRate > 0 && attendanceRate < 40) {
      insights.push({
        id: "insight-low-attendance",
        type: "warning",
        category: "attendance",
        title: "Tingkat Kehadiran Masih Rendah",
        message: `Hanya ${attendanceRate}% pengunjung yang sudah check-in. Tersisa ${unattendedCount} pengunjung belum hadir.`,
        metric: `${unattendedCount} belum scan`,
      });
    }
  }

  return {
    organizerId,
    selectedEventId: filter.eventId ?? null,
    selectedEventName,
    period,
    granularity,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    compareStartDate: compareStartDate?.toISOString(),
    compareEndDate: compareEndDate?.toISOString(),
    overview: {
      grossRevenue: computeGrowth(currentRevenue, previousRevenue),
      ticketsSold: computeGrowth(currentTicketsSold, previousTicketsSold),
      paidOrders: computeGrowth(currentPaidOrdersCount, previousPaidOrdersCount),
      averageOrderValue: computeGrowth(currentAov, previousAov),
      averageTicketsPerOrder,
      occupancyRate,
      attendanceRate,
    },
    salesTrend,
    zones,
    velocity: {
      hourly: hourlyBuckets,
      peakHour: { hour: peakHour.hour, hourLabel: peakHour.hourLabel, ticketCount: peakHour.ticketCount },
      daysOfWeek: dayBuckets,
      peakDay: { dayName: peakDay.dayName, ticketCount: peakDay.ticketCount },
      daysBeforeEvent: daysBeforeBuckets,
      averageTicketsPerDay,
    },
    occupancy,
    attendance,
    insights,
  };
}
