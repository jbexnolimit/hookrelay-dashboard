"use client";

import {
  Activity,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Command,
  LayoutDashboard,
  Radio,
  RefreshCw,
  Settings2,
  Webhook,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import {
  getAnalyticsSummary,
  getDeliveries,
} from "@/lib/api";
import type { Delivery } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Metric {
  label: string;
  value: string;
  icon: LucideIcon;
  description: string;
}

interface NavigationItem {
  label: string;
  icon: LucideIcon;
  active: boolean;
}

const navigation: NavigationItem[] = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Deliveries", icon: Activity, active: false },
  { label: "Events", icon: Radio, active: false },
  { label: "Endpoints", icon: Webhook, active: false },
  { label: "Analytics", icon: Zap, active: false },
];

const statusStyles: Record<string, string> = {
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  queued: "border-blue-200 bg-blue-50 text-blue-700",
  processing: "border-amber-200 bg-amber-50 text-amber-700",
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
  const analyticsQuery = useQuery({
    queryKey: ["analytics-summary"],
    queryFn: getAnalyticsSummary,
  });

  const deliveriesQuery = useQuery({
    queryKey: ["deliveries"],
    queryFn: getDeliveries,
  });

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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background lg:flex">
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

        <div className="px-4 py-5">
          <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.label}
                  href={
                    item.label === "Overview"
                      ? "/"
                      : `/${item.label.toLowerCase()}`
                  }
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    item.active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-4">
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="mb-2 flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-red-500"
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
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
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
                className={`size-1.5 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              {analyticsQuery.isPending || deliveriesQuery.isPending
                ? "Connecting"
                : isConnected
                  ? "Live data"
                  : "API error"}
            </Badge>

            <Separator
              orientation="vertical"
              className="hidden h-6 sm:block"
            />

            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              <div className="flex size-6 items-center justify-center rounded-md bg-muted">
                <Command className="size-3.5" />
              </div>
              <span className="hidden sm:inline">Developer</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>
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
                    <CardDescription>{metric.label}</CardDescription>
                    <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-semibold tracking-tight">
                      {analyticsQuery.isPending
                        ? "—"
                        : analyticsError
                          ? "—"
                          : metric.value}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
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
                  Time-series activity will be available when the backend
                  provides historical analytics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-[260px] flex-col items-center justify-center rounded-lg border border-dashed text-center">
                  <Activity className="mb-3 size-8 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    No activity timeline available
                  </p>
                  <p className="mt-1 max-w-sm px-4 text-xs text-muted-foreground">
                    Current totals and delivery statuses are available in the
                    dashboard. Historical chart data is not yet provided by
                    the API.
                  </p>
                </div>
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
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead>
                    <tr className="border-y bg-muted/30 text-xs text-muted-foreground">
                      <th className="px-6 py-3 font-medium">Delivery ID</th>
                      <th className="px-6 py-3 font-medium">Event</th>
                      <th className="px-6 py-3 font-medium">Endpoint</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">HTTP</th>
                      <th className="px-6 py-3 font-medium">Created</th>
                    </tr>
                  </thead>

                  <tbody>
                    {deliveriesQuery.isPending ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-muted-foreground"
                        >
                          Loading deliveries...
                        </td>
                      </tr>
                    ) : deliveriesError ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-muted-foreground"
                        >
                          Could not load delivery records.
                        </td>
                      </tr>
                    ) : deliveries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-10 text-center text-muted-foreground"
                        >
                          No deliveries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      deliveries.map((delivery) => (
                        <tr
                          key={delivery.id}
                          className="border-b last:border-0 hover:bg-muted/30"
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

          <footer className="flex flex-col gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>HookRelay Dashboard</span>
            <span className="flex items-center gap-2">
              <span
                className={`size-2 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-red-500"
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