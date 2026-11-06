"use client";
import { useState } from "react";
import {
  Activity,
  CheckCircle2,
  CircleAlert,
  Clock3,
  RefreshCw,
  Settings2,
  Webhook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import {
  getAnalyticsSummary,
  getDeliveries,
  getDeliveryActivity,
  getDelivery,
  getDeliveryAttempts,
  retryDelivery,
} from "@/lib/api";

import type {
  Delivery,
  DeliveryActivityDay,
  DeliveryAttempt,
} from "@/lib/api";

import { DashboardNavigation, MobileDashboardDrawer } from "@/components/dashboard/dashboard-navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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


interface Metric {
  label: string;
  value: string;
  icon: LucideIcon;
  description: string;
}

const statusStyles: Record<string, string> = {
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  failed: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  queued: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  processing: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
};

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    delivered: "Delivered",
    failed: "Failed",
    queued: "Queued",
    processing: "Processing",
  };

  return labels[status.toLowerCase()] ?? status;
}

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return "—";

  const date = new Date(timestamp);

  return Number.isNaN(date.getTime())
    ? "—"
    : formatDistanceToNow(date, { addSuffix: true });
}

function StatusBadge({ status }: { status: string }) {
  const normalizedStatus = status.toLowerCase();

  return (
    <Badge
      variant="outline"
      className={statusStyles[normalizedStatus] ?? ""}
    >
      <span className="mr-1.5 size-1.5 rounded-full bg-current" />
      {formatStatus(status)}
    </Badge>
  );
}

export function DashboardOverview() {
  const queryClient = useQueryClient();

  const [selectedDeliveryId, setSelectedDeliveryId] =
    useState<number | null>(null);

  const retryMutation = useMutation({
    mutationFn: retryDelivery,
    onSuccess: async (result, deliveryId) => {
      queryClient.setQueryData(["delivery", deliveryId], result.delivery);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["delivery", deliveryId] }),
        queryClient.invalidateQueries({
          queryKey: ["delivery-attempts", deliveryId],
        }),
        queryClient.invalidateQueries({ queryKey: ["deliveries"] }),
        queryClient.invalidateQueries({ queryKey: ["analytics-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["delivery-activity"] }),
      ]);
    },
  });

  const selectedDeliveryQuery = useQuery({
    queryKey: ["delivery", selectedDeliveryId],
    queryFn: () => getDelivery(selectedDeliveryId!),
    enabled: selectedDeliveryId !== null,
  });

  const deliveryAttemptsQuery = useQuery({
    queryKey: ["delivery-attempts", selectedDeliveryId],
    queryFn: () => getDeliveryAttempts(selectedDeliveryId!),
    enabled: selectedDeliveryId !== null,
  });

  const analyticsQuery = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: getAnalyticsSummary,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["deliveries"],
    queryFn: getDeliveries,
  });

  const activityQuery = useQuery({
    queryKey: ["delivery-activity"],
    queryFn: () => getDeliveryActivity(),
  });

  const activityDays: DeliveryActivityDay[] =
    activityQuery.data?.days ?? [];

  const chartData = activityDays.map((day) => ({
    ...day,
    label: format(parseISO(day.date), "MMM d"),
  }));

  const hasActivity = activityDays.some(
    (day) =>
      day.queued > 0 ||
      day.processing > 0 ||
      day.delivered > 0 ||
      day.failed > 0,
  );

  const analytics = analyticsQuery.data;
  const deliveries: Delivery[] = deliveriesQuery.data ?? [];
  const numberFormat = new Intl.NumberFormat("en-PH");

  const metrics: Metric[] = [
    {
      label: "Total deliveries",
      value: numberFormat.format(analytics?.total_deliveries ?? 0),
      icon: Activity,
      description: "Total recorded deliveries",
    },
    {
      label: "Delivered",
      value: numberFormat.format(
        analytics?.delivery_status_counts.delivered ?? 0,
      ),
      icon: CheckCircle2,
      description: "Successfully completed",
    },
    {
      label: "Failed deliveries",
      value: numberFormat.format(
        analytics?.delivery_status_counts.failed ?? 0,
      ),
      icon: CircleAlert,
      description: "Deliveries that failed",
    },
    {
      label: "Queued / processing",
      value: numberFormat.format(
        (analytics?.delivery_status_counts.queued ?? 0) +
        (analytics?.delivery_status_counts.processing ?? 0),
      ),
      icon: RefreshCw,
      description: "Awaiting completion",
    },
    {
      label: "Average response time",
      value:
        analytics?.average_response_time != null
          ? `${numberFormat.format(analytics.average_response_time)} ms`
          : "—",
      icon: Clock3,
      description: "Average delivery response time",
    },
  ];

  const statusBreakdown = [
    {
      label: "Delivered",
      count: analytics?.delivery_status_counts.delivered ?? 0,
      color: "bg-emerald-500",
    },
    {
      label: "Queued",
      count: analytics?.delivery_status_counts.queued ?? 0,
      color: "bg-blue-500",
    },
    {
      label: "Processing",
      count: analytics?.delivery_status_counts.processing ?? 0,
      color: "bg-amber-500",
    },
    {
      label: "Failed",
      count: analytics?.delivery_status_counts.failed ?? 0,
      color: "bg-red-500",
    },
  ];

  const totalDeliveries = analytics?.total_deliveries ?? 0;
  const successRate = analytics?.success_rate_percent ?? 0;

  const analyticsError = analyticsQuery.isError;
  const deliveriesError = deliveriesQuery.isError;
  const isConnected = !analyticsError && !deliveriesError;

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border/60 bg-background/75 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center gap-3 px-6">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Webhook className="size-5" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">HookRelay</p>
            <p className="text-xs text-muted-foreground">
              Delivery platform
            </p>
          </div>
        </div>

        <Separator />

        <DashboardNavigation />

        <div className="mt-auto p-4">
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"
                  }`}
              />
              <span className="text-sm font-medium">
                {analyticsQuery.isPending || deliveriesQuery.isPending
                  ? "Connecting..."
                  : isConnected
                    ? "API connected"
                    : "Connection error"}
              </span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Live data from the HookRelay backend.
            </p>
          </div>

          <a
            href="/settings"
            className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <Settings2 className="size-4" />
            Settings
          </a>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-4 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 sm:px-6 lg:px-8">
          <MobileDashboardDrawer />
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
              <Webhook className="size-4" />
            </div>
            <div>
              <p className="text-sm font-medium">Overview</p>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Monitor your webhook infrastructure
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="hidden gap-1.5 sm:flex">
              <span
                className={`size-1.5 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"
                  }`}
              />
              {analyticsQuery.isPending || deliveriesQuery.isPending
                ? "Connecting"
                : isConnected
                  ? "Live data"
                  : "API error"}
            </Badge>

            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">
                Dashboard / Overview
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Welcome back
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Here&apos;s what&apos;s happening with your webhook deliveries.
              </p>
            </div>

            <div className="inline-flex h-9 items-center gap-2 self-start rounded-lg border bg-background px-3 text-sm sm:self-auto">
              <Clock3 className="size-4" />
              All recorded deliveries
            </div>
          </div>

          {analyticsError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Unable to load analytics. Check the backend connection and
              refresh the page.
            </div>
          )}

          {deliveriesError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Unable to load deliveries.
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map((metric) => {
              const Icon = metric.icon;

              return (
                <Card key={metric.label} className="gap-3">
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-0">
                    <CardDescription className="text-xs font-medium tracking-wide">
                      {metric.label}
                    </CardDescription>
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/60 shadow-sm">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold tracking-tight tabular-nums">
                      {analyticsQuery.isPending ? (
                        <Skeleton className="h-7 w-20" />
                      ) : analyticsError ? (
                        "—"
                      ) : (
                        metric.value
                      )}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {metric.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Delivery activity</CardTitle>
                <CardDescription>
                  Daily delivery counts by current status over the last seven days
                </CardDescription>
              </CardHeader>

              <CardContent>
                {activityQuery.isPending ? (
                  <div
                    className="flex h-[260px] items-end gap-3 px-4 pb-4"
                    role="status"
                    aria-label="Loading delivery activity"
                  >
                    {Array.from({ length: 7 }, (_, index) => (
                      <Skeleton
                        key={index}
                        className="flex-1"
                        style={{
                          height: `${30 + ((index * 19) % 55)}%`,
                        }}
                      />
                    ))}
                  </div>
                ) : activityQuery.isError ? (
                  <div className="flex h-[260px] items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-center text-sm text-red-700">
                    Unable to load delivery activity. Please try again.
                  </div>
                ) : !hasActivity ? (
                  <div className="flex h-[260px] flex-col items-center justify-center text-center">
                    <Activity className="mb-3 size-8 text-muted-foreground" />
                    <p className="text-sm font-medium">No delivery activity yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Delivery counts will appear here when records are created.
                    </p>
                  </div>
                ) : (
                  <div className="h-[260px] w-full">
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
                              ? format(parseISO(date), "MMMM d, yyyy")
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

                        <Bar
                          dataKey="delivered"
                          name="Delivered"
                          stackId="status"
                          fill="#10b981"
                          radius={[0, 0, 0, 0]}
                        />

                        <Bar
                          dataKey="failed"
                          name="Failed"
                          stackId="status"
                          fill="#ef4444"
                        />

                        <Bar
                          dataKey="queued"
                          name="Queued"
                          stackId="status"
                          fill="#3b82f6"
                        />

                        <Bar
                          dataKey="processing"
                          name="Processing"
                          stackId="status"
                          fill="#f59e0b"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delivery health</CardTitle>
                <CardDescription>
                  Current delivery status breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Success rate
                    </span>
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  </div>
                  <p className="mt-2 text-3xl font-semibold">
                    {analyticsQuery.isPending || analyticsError
                      ? "—"
                      : `${successRate.toFixed(1)}%`}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, successRate))}%`,
                      }}
                    />
                  </div>
                </div>

                {statusBreakdown.map((item) => {
                  const percentage =
                    totalDeliveries > 0
                      ? (item.count / totalDeliveries) * 100
                      : 0;

                  return (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span
                            className={`size-2 rounded-full ${item.color}`}
                          />
                          {item.label}
                        </span>
                        <span className="font-medium">
                          {analyticsQuery.isPending || analyticsError
                            ? "—"
                            : numberFormat.format(item.count)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${item.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Recent deliveries</CardTitle>
                <CardDescription className="mt-1">
                  Latest webhook delivery records
                </CardDescription>
              </div>
              <a
                href="/deliveries"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                View all deliveries →
              </a>
            </CardHeader>

            <CardContent className="px-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead>
                    <tr className="border-y bg-muted/30 text-xs text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Delivery ID</th>
                      <th className="px-6 py-3 font-medium">Event</th>
                      <th className="px-6 py-3 font-medium">Endpoint</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">HTTP</th>
                      <th className="px-6 py-3 font-medium">Attempts</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                    </tr>
                  </thead>

                  <tbody>
                    {deliveriesQuery.isPending ? (
                      Array.from({ length: 5 }, (_, row) => (
                        <tr key={row} className="border-b last:border-0">
                          {Array.from({ length: 7 }, (_, column) => (
                            <td key={column} className="px-6 py-4">
                              <Skeleton
                                className={`h-4 ${
                                  column === 0 ? "w-24" : "w-20"
                                }`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : deliveriesError ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-10 text-center text-muted-foreground"
                        >
                          Could not load delivery records.
                        </td>
                      </tr>
                    ) : deliveries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-10 text-center text-muted-foreground"
                        >
                          No deliveries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      deliveries.map((delivery) => (
                        <tr
                          key={delivery.id}
                          className="cursor-pointer border-b last:border-0 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          tabIndex={0}
                          role="button"
                          aria-label={`View delivery ${delivery.id} details`}
                          onClick={() => setSelectedDeliveryId(delivery.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedDeliveryId(delivery.id);
                            }
                          }}
                        >
                          <td className="px-6 py-4 font-mono text-xs">
                            {delivery.id}
                          </td>
                          <td className="px-6 py-4 font-medium">
                            {delivery.event_type}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {delivery.endpoint_name}
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status={delivery.status} />
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                            {delivery.last_http_status ?? "—"}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                            {delivery.attempt_count} / {delivery.max_attempts}
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">
                            {formatTimestamp(delivery.created_at)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Sheet
            open={selectedDeliveryId !== null}
            onOpenChange={(open) => {
              if (!open) setSelectedDeliveryId(null);
            }}
          >
            <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
              <SheetHeader className="border-b px-6 py-5">
                <SheetTitle>
                  Delivery {selectedDeliveryId ?? ""}
                </SheetTitle>
                <SheetDescription>
                  Delivery metadata and webhook attempt history.
                </SheetDescription>
              </SheetHeader>

              {selectedDeliveryQuery.isPending ? (
                <div
                  className="space-y-5 px-6 py-6"
                  role="status"
                  aria-label="Loading delivery details"
                >
                  <Skeleton className="h-5 w-40" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div key={index} className="space-y-2">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-5 w-32" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : selectedDeliveryQuery.isError ? (
                <p className="py-6 text-sm text-destructive">
                  Could not load delivery details. Please try again.
                </p>
              ) : selectedDeliveryQuery.data ? (
                <div className="space-y-8 px-6 py-6">
                  {(() => {
                    const delivery = selectedDeliveryQuery.data;

                    return (
                      <>
                        <section className="space-y-4">
                          <h3 className="text-sm font-semibold tracking-tight">Delivery overview</h3>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-muted-foreground">Status</p>
                              <div className="mt-1">
                                <StatusBadge status={delivery.status} />
                              </div>
                            </div>

                            <div>
                              <p className="text-muted-foreground">HTTP status</p>
                              <p className="mt-1 font-medium">
                                {delivery.last_http_status ?? "—"}
                              </p>
                            </div>

                            <div className="min-w-0 space-y-1">
                              <p className="text-xs font-medium text-muted-foreground">
                                Event type
                              </p>
                              <p className="break-words text-sm font-medium">
                                {delivery.event_type}
                              </p>
                            </div>

                            <div>
                              <p className="text-muted-foreground">Endpoint</p>
                              <p className="mt-1 break-words font-medium">
                                {delivery.endpoint_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {delivery.endpoint_slug}
                              </p>
                            </div>

                            <div>
                              <p className="text-muted-foreground">Attempts</p>
                              <p className="mt-1 font-medium">
                                {delivery.attempt_count} / {delivery.max_attempts}
                              </p>
                            </div>

                            <div>
                              <p className="text-muted-foreground">Created</p>
                              <p className="mt-1">
                                {formatTimestamp(delivery.created_at)}
                              </p>
                            </div>

                            <div>
                              <p className="text-muted-foreground">Last attempt</p>
                              <p className="mt-1">
                                {formatTimestamp(delivery.last_attempt_at)}
                              </p>
                            </div>

                            <div>
                              <p className="text-muted-foreground">Delivered</p>
                              <p className="mt-1">
                                {formatTimestamp(delivery.delivered_at)}
                              </p>
                            </div>
                          </div>

                          {delivery.status.toLowerCase() === "failed" && (
                            <div className="space-y-3 rounded-lg border p-4">
                              <div>
                                <h4 className="text-sm font-semibold">
                                  Manual retry
                                </h4>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Queue this failed delivery for another attempt.
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={retryMutation.isPending}
                                onClick={() => retryMutation.mutate(delivery.id)}
                                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <RefreshCw
                                  className={`size-4 ${
                                    retryMutation.isPending ? "animate-spin" : ""
                                  }`}
                                />
                                {retryMutation.isPending
                                  ? "Queuing retry..."
                                  : "Retry delivery"}
                              </button>

                              {retryMutation.isSuccess && (
                                <p className="text-sm text-emerald-700">
                                  {retryMutation.data.message}
                                </p>
                              )}

                              {retryMutation.isError && (
                                <p className="text-sm text-destructive">
                                  {retryMutation.error instanceof Error
                                    ? retryMutation.error.message
                                    : "Could not queue the retry. Please try again."}
                                </p>
                              )}
                            </div>
                          )}

                          {delivery.last_error && (
                            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                              <p className="font-semibold">Latest error</p>
                              <p className="mt-1 whitespace-pre-wrap break-words">
                                {delivery.last_error}
                              </p>
                            </div>
                          )}
                        </section>

                        <Separator />

                        <section className="space-y-4">
                          <div>
                            <h3 className="text-sm font-semibold">Attempt history</h3>
                            <p className="text-xs text-muted-foreground">
                              Individual delivery attempts and their responses.
                            </p>
                          </div>

                          {deliveryAttemptsQuery.isPending ? (
                            <div
                              className="space-y-3"
                              role="status"
                              aria-label="Loading attempt history"
                            >
                              {Array.from({ length: 2 }, (_, index) => (
                                <div
                                  key={index}
                                  className="space-y-3 rounded-xl border p-4"
                                >
                                  <Skeleton className="h-4 w-36" />
                                  <Skeleton className="h-4 w-full" />
                                  <Skeleton className="h-12 w-full" />
                                </div>
                              ))}
                            </div>
                          ) : deliveryAttemptsQuery.isError ? (
                            <p className="text-sm text-destructive">
                              Could not load attempt history.
                            </p>
                          ) : !deliveryAttemptsQuery.data?.length ? (
                            <p className="rounded-md border p-4 text-sm text-muted-foreground">
                              No attempts recorded for this delivery yet.
                            </p>
                          ) : (
                            <div className="space-y-4">
                              {deliveryAttemptsQuery.data.map((attempt: DeliveryAttempt) => (
                                <article
                                  key={attempt.id}
                                  className="space-y-4 rounded-xl border bg-card p-4 sm:p-5"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="text-sm font-semibold">
                                        Attempt {attempt.attempt_number}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {formatTimestamp(attempt.attempted_at)}
                                      </p>
                                    </div>

                                    <Badge
                                      variant="outline"
                                      className={
                                        attempt.result.toLowerCase() === "success"
                                          ? statusStyles.delivered
                                          : statusStyles.failed
                                      }
                                    >
                                      {formatStatus(attempt.result)}
                                    </Badge>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3 text-sm">
                                    <div>
                                      <p className="text-muted-foreground">HTTP status</p>
                                      <p className="font-medium">
                                        {attempt.http_status_code ?? "—"}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Response time</p>
                                      <p className="font-medium">
                                        {attempt.response_time_ms != null
                                          ? `${attempt.response_time_ms} ms`
                                          : "—"}
                                      </p>
                                    </div>
                                  </div>

                                  {attempt.error_message && (
                                    <div>
                                      <p className="mb-1 text-xs font-semibold text-destructive">
                                        Error
                                      </p>
                                      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs">
                                        {attempt.error_message}
                                      </pre>
                                    </div>
                                  )}

                                  {attempt.response_body && (
                                    <details className="text-sm">
                                      <summary className="cursor-pointer font-medium">
                                        Response body
                                      </summary>
                                      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed">
                                        {attempt.response_body}
                                      </pre>
                                    </details>
                                  )}
                                </article>
                              ))}
                            </div>
                          )}
                        </section>
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
          <footer className="flex flex-col gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>HookRelay Dashboard</span>
            <span className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${isConnected ? "bg-emerald-500" : "bg-red-500"
                  }`}
              />
              {analyticsQuery.isPending || deliveriesQuery.isPending
                ? "Connecting to backend"
                : isConnected
                  ? "Connected to backend"
                  : "Backend connection issue"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}