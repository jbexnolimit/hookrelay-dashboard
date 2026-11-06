"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Radio,
  TrendingUp,
  Webhook,
  Zap,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

import {
  getAnalyticsSummary,
  getDeliveries,
  getDeliveryActivity,
} from "@/lib/api";
import type {
  Delivery,
  DeliveryActivityDay,
} from "@/lib/api";

import { DashboardNavigation, MobileDashboardDrawer } from "@/components/dashboard/dashboard-navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const numberFormat = new Intl.NumberFormat("en-PH");

const statusConfig = [
  { key: "delivered", label: "Delivered", color: "bg-emerald-500", chart: "#10b981" },
  { key: "failed", label: "Failed", color: "bg-red-500", chart: "#ef4444" },
  { key: "queued", label: "Queued", color: "bg-blue-500", chart: "#3b82f6" },
  { key: "processing", label: "Processing", color: "bg-amber-500", chart: "#f59e0b" },
] as const;

const statusStyles: Record<string, string> = {
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  failed: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  queued: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  pending: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  processing: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
};

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  return (
    <Badge variant="outline" className={statusStyles[normalized] ?? ""}>
      <span className="mr-1.5 size-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatChartDate(value: string) {
  const date = parseISO(value);

  return Number.isNaN(date.getTime()) ? value : format(date, "MMM d");
}

function LoadingCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-3 h-3 w-36" />
      </CardContent>
    </Card>
  );
}

export function AnalyticsPage() {
  const summaryQuery = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: getAnalyticsSummary,
  });

  const activityQuery = useQuery({
    queryKey: ["delivery-activity"],
    queryFn: getDeliveryActivity,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["deliveries"],
    queryFn: getDeliveries,
  });

  const summary = summaryQuery.data;
  const deliveries = useMemo<Delivery[]>(
    () => deliveriesQuery.data ?? [],
    [deliveriesQuery.data],
  );
  const activityDays: DeliveryActivityDay[] = activityQuery.data?.days ?? [];

  const recentDeliveries = useMemo(
    () =>
      [...deliveries]
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        )
        .slice(0, 8),
    [deliveries],
  );

  const eventTypeBreakdown = useMemo(() => {
    const counts = new Map<string, number>();

    for (const delivery of deliveries) {
      counts.set(
        delivery.event_type,
        (counts.get(delivery.event_type) ?? 0) + 1,
      );
    }

    return [...counts.entries()]
      .map(([eventType, count]) => ({ eventType, count }))
      .sort((a, b) => b.count - a.count || a.eventType.localeCompare(b.eventType))
      .slice(0, 6);
  }, [deliveries]);

  const statusCounts = summary?.delivery_status_counts;
  const totalDeliveries = summary?.total_deliveries ?? 0;
  const successRate = summary?.success_rate_percent ?? 0;

  const chartData = activityDays.map((day) => ({
    ...day,
    label: formatChartDate(day.date),
  }));

  const hasActivity = activityDays.some(
    (day) =>
      day.queued > 0 ||
      day.processing > 0 ||
      day.delivered > 0 ||
      day.failed > 0,
  );

  const hasApiError =
    summaryQuery.isError ||
    activityQuery.isError ||
    deliveriesQuery.isError;

  const isConnecting =
    summaryQuery.isPending ||
    activityQuery.isPending ||
    deliveriesQuery.isPending;

  const metrics = [
    {
      label: "Total events",
      value: summary ? numberFormat.format(summary.total_events) : "—",
      description: "All recorded events",
      icon: Radio,
    },
    {
      label: "Total deliveries",
      value: summary ? numberFormat.format(summary.total_deliveries) : "—",
      description: "All recorded delivery attempts",
      icon: Activity,
    },
    {
      label: "Success rate",
      value: summary ? `${summary.success_rate_percent.toFixed(2)}%` : "—",
      description: "Delivered / all deliveries",
      icon: CheckCircle2,
    },
    {
      label: "Average response time",
      value:
        summary?.average_response_time != null
          ? `${numberFormat.format(Math.round(summary.average_response_time))} ms`
          : summary
            ? "No response data"
            : "—",
      description: "Average recorded response time",
      icon: Clock3,
    },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-background/75 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center gap-3 px-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Webhook className="size-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">HookRelay</p>
            <p className="text-xs text-muted-foreground">Delivery platform</p>
          </div>
        </div>

        <Separator />
        <DashboardNavigation />

        <div className="mt-auto border-t p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span
              className={`size-2 rounded-full ${
                hasApiError ? "bg-red-500" : isConnecting ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
            {isConnecting
              ? "Connecting..."
              : hasApiError
                ? "Some data unavailable"
                : "API connected"}
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Analytics from the HookRelay backend.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-4 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 sm:px-6 lg:px-8">
          <MobileDashboardDrawer />
          <div>
            <p className="text-sm font-medium">Analytics</p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Delivery performance and event reporting
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden sm:flex">
              {isConnecting
                ? "Loading data"
                : hasApiError
                  ? "Partial data"
                  : "Live data"}
            </Badge>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          <div>
            <p className="mb-2 text-sm text-muted-foreground">
              Dashboard / Analytics
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Analytics &amp; reporting
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review delivery health, recent activity, and event distribution.
            </p>
          </div>

          {hasApiError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Some analytics could not be loaded.</p>
                <p className="mt-1">
                  Available sections remain visible. Check the backend connection
                  if information is missing.
                </p>
              </div>
            </div>
          )}

          <section aria-label="Analytics summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryQuery.isPending
              ? Array.from({ length: 4 }, (_, index) => <LoadingCard key={index} />)
              : metrics.map((metric) => {
                  const Icon = metric.icon;

                  return (
                    <Card key={metric.label} className="gap-3">
                      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-0">
                        <CardDescription className="text-xs font-medium tracking-wide">
                          {metric.label}
                        </CardDescription>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/60 shadow-sm">
                          <Icon className="size-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                          {summaryQuery.isError ? "—" : metric.value}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {metric.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Delivery activity</CardTitle>
                <CardDescription>
                  Daily delivery counts by current status over the last seven days.
                  This chart groups deliveries by creation date, not status-change date.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activityQuery.isPending ? (
                  <div
                    className="flex h-[300px] items-end gap-3 px-4 pb-4"
                    role="status"
                    aria-label="Loading delivery activity"
                  >
                    {Array.from({ length: 7 }, (_, index) => (
                      <Skeleton
                        key={index}
                        className="flex-1"
                        style={{ height: `${30 + ((index * 19) % 55)}%` }}
                      />
                    ))}
                  </div>
                ) : activityQuery.isError ? (
                  <div className="flex h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
                    Unable to load delivery activity.
                  </div>
                ) : !hasActivity ? (
                  <div className="flex h-[300px] flex-col items-center justify-center text-center">
                    <Activity className="mb-3 size-8 text-muted-foreground" />
                    <p className="text-sm font-medium">No delivery activity yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Activity will appear here when deliveries are recorded.
                    </p>
                  </div>
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid
                          stroke="var(--border)"
                          strokeOpacity={0.55}
                          strokeDasharray="3 5"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickMargin={10}
                          minTickGap={12}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          tickMargin={8}
                        />
                        <Tooltip
                          labelFormatter={(_, payload) => {
                            const date = payload?.[0]?.payload?.date;
                            return typeof date === "string"
                              ? formatChartDate(date)
                              : "";
                          }}
                          cursor={{ fill: "currentColor", opacity: 0.05 }}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid var(--border)",
                            backgroundColor: "var(--popover)",
                            color: "var(--popover-foreground)",
                            boxShadow: "0 12px 32px -12px rgba(0, 0, 0, 0.3)",
                            padding: "10px 12px",
                            fontSize: 12,
                          }}
                          itemStyle={{ color: "var(--popover-foreground)" }}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: 11,
                            paddingTop: 12,
                          }}
                        />
                        {statusConfig.map((status) => (
                          <Bar
                            key={status.key}
                            dataKey={status.key}
                            name={status.label}
                            stackId="status"
                            fill={status.chart}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery status</CardTitle>
                <CardDescription>
                  Current status of all recorded deliveries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {summaryQuery.isPending ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton key={index} className="h-8 w-full" />
                    ))}
                  </div>
                ) : summaryQuery.isError || !summary ? (
                  <p className="text-sm text-muted-foreground">
                    Status information is unavailable.
                  </p>
                ) : totalDeliveries === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No deliveries recorded yet.
                  </p>
                ) : (
                  <>
                    <div className="rounded-xl border border-border/60 bg-background/40 p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground">
                          Success rate
                        </span>
                        <TrendingUp className="size-4 text-emerald-600" />
                      </div>
                      <p className="mt-2 text-3xl font-semibold">
                        {successRate.toFixed(2)}%
                      </p>
                      <div
                        className="mt-3 h-2 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/30"
                        role="progressbar"
                        aria-label="Delivery success rate"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(100, Math.max(0, successRate))}
                      >
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 ease-out"
                          style={{
                            width: `${Math.min(100, Math.max(0, successRate))}%`,
                          }}
                        />
                      </div>
                    </div>

                    {statusConfig.map((status) => {
                      const count = statusCounts?.[status.key] ?? 0;
                      const percentage = (count / totalDeliveries) * 100;

                      return (
                        <div key={status.key} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <span className={`size-2 rounded-full ${status.color}`} />
                              {status.label}
                            </span>
                            <span className="font-medium tabular-nums">
                              {numberFormat.format(count)}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {percentage.toFixed(1)}%
                              </span>
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/30">
                            <div
                              className={`h-full rounded-full transition-[width] duration-500 ease-out ${status.color}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top event types</CardTitle>
                <CardDescription>
                  Event types with the most associated deliveries across the
                  records returned by the API.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deliveriesQuery.isPending ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Skeleton key={index} className="h-7 w-full" />
                    ))}
                  </div>
                ) : deliveriesQuery.isError ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Unable to load event type statistics.
                  </p>
                ) : eventTypeBreakdown.length === 0 ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <Zap className="mb-3 size-7 text-muted-foreground" />
                    <p className="text-sm font-medium">No event types to report</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Event type statistics appear after deliveries are created.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {eventTypeBreakdown.map((item) => {
                      const percentage =
                        deliveries.length > 0
                          ? (item.count / deliveries.length) * 100
                          : 0;

                      return (
                        <div key={item.eventType} className="space-y-2">
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate font-medium" title={item.eventType}>
                              {item.eventType}
                            </span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {numberFormat.format(item.count)}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted/80 ring-1 ring-border/30">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {!deliveriesQuery.isError && deliveries.length > 0 && (
                  <p className="mt-5 text-xs text-muted-foreground">
                    Based on {numberFormat.format(deliveries.length)} delivery
                    records currently returned by the API.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>Recent deliveries</CardTitle>
                  <CardDescription>
                    The latest eight records by creation time.
                  </CardDescription>
                </div>
                <Link
                  href="/deliveries"
                  className="shrink-0 text-sm text-primary underline-offset-4 hover:underline"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent>
                {deliveriesQuery.isPending ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }, (_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : deliveriesQuery.isError ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Unable to load recent deliveries.
                  </p>
                ) : recentDeliveries.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm font-medium">No deliveries yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      New delivery records will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {recentDeliveries.map((delivery) => (
                      <div
                        key={delivery.id}
                        className="flex min-w-0 items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {delivery.event_type}
                          </p>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            #{delivery.id} · {delivery.endpoint_name}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatTimestamp(delivery.created_at)}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <StatusBadge status={delivery.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
}
