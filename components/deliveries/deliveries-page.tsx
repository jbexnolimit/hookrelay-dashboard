"use client";

import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Webhook,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getDeliveries,
  getDelivery,
  getDeliveryAttempts,
  retryDelivery,
} from "@/lib/api";
import type { DeliveryAttempt } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const PAGE_SIZE = 10;

function formatTimestamp(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const styles: Record<string, string> = {
    delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
    failed: "border-red-200 bg-red-50 text-red-700",
    processing: "border-amber-200 bg-amber-50 text-amber-700",
    queued: "border-blue-200 bg-blue-50 text-blue-700",
    pending: "border-blue-200 bg-blue-50 text-blue-700",
  };

  return (
    <Badge
      variant="outline"
      className={styles[normalized] ?? ""}
    >
      {status}
    </Badge>
  );
}

function AttemptResultBadge({ result }: { result: string }) {
  const success = result.toLowerCase() === "success";

  return (
    <Badge
      variant="outline"
      className={
        success
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }
    >
      {result}
    </Badge>
  );
}

export function DeliveriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<number | null>(
    null,
  );

  const deliveriesQuery = useQuery({
    queryKey: ["deliveries"],
    queryFn: getDeliveries,
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

  const deliveries = useMemo(
    () => deliveriesQuery.data ?? [],
    [deliveriesQuery.data],
  );

  const filteredDeliveries = useMemo(() => {
    const term = search.trim().toLowerCase();

    return deliveries.filter((delivery) => {
      const matchesStatus =
        statusFilter === "all" ||
        delivery.status.toLowerCase() === statusFilter;

      const matchesSearch =
        !term ||
        String(delivery.id).includes(term) ||
        delivery.event_type.toLowerCase().includes(term) ||
        delivery.endpoint_name.toLowerCase().includes(term) ||
        delivery.endpoint_slug.toLowerCase().includes(term) ||
        String(delivery.event).includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [deliveries, search, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredDeliveries.length / PAGE_SIZE),
  );

  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const visibleDeliveries = filteredDeliveries.slice(
    startIndex,
    startIndex + PAGE_SIZE,
  );

  const delivery = selectedDeliveryQuery.data;

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background lg:flex">
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

        <div className="mt-auto border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Webhook delivery management
          </p>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b bg-background px-5 sm:px-8">
          <div>
            <p className="text-sm font-medium">HookRelay</p>
            <p className="text-xs text-muted-foreground">
              Delivery management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">
              {deliveriesQuery.isError ? "Connection issue" : "Deliveries"}
            </Badge>
            <ThemeToggle />
          </div>
        </header>

        <div className="space-y-6 p-5 sm:p-8">
          <div>
            <p className="text-sm text-muted-foreground">
              Overview / Deliveries
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Deliveries
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Search webhook deliveries, inspect attempts, and retry failures.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total",
                value: deliveries.length,
              },
              {
                label: "Delivered",
                value: deliveries.filter(
                  (item) => item.status.toLowerCase() === "delivered",
                ).length,
              },
              {
                label: "Processing / queued",
                value: deliveries.filter((item) =>
                  ["processing", "queued", "pending"].includes(
                    item.status.toLowerCase(),
                  ),
                ).length,
              },
              {
                label: "Failed",
                value: deliveries.filter(
                  (item) => item.status.toLowerCase() === "failed",
                ).length,
              },
            ].map((metric) => (
              <Card key={metric.label} className="gap-2 py-4">
                <CardHeader className="pb-0">
                  <CardDescription>{metric.label}</CardDescription>
                  <CardTitle className="text-2xl">
                    {deliveriesQuery.isPending ? (
                      <Skeleton className="h-7 w-20" />
                    ) : (
                      metric.value
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b py-5">
              <CardTitle>All deliveries</CardTitle>
              <CardDescription>
                Select a row to inspect delivery details and attempt history.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search ID, event, or endpoint..."
                    className="pl-9"
                  />
                </div>

                <select
                  aria-label="Filter deliveries by status"
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="delivered">Delivered</option>
                  <option value="queued">Queued</option>
                  <option value="processing">Processing</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {deliveriesQuery.isPending ? (
                <div
                  className="space-y-4 py-4"
                  role="status"
                  aria-label="Loading deliveries"
                >
                  {Array.from({ length: 5 }, (_, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 border-b pb-4 last:border-0"
                    >
                      <Skeleton className="h-4 w-20 shrink-0" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="hidden h-4 w-28 sm:block" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : deliveriesQuery.isError ? (
                <div className="space-y-3 py-10 text-center">
                  <p className="text-sm text-destructive">
                    Could not load deliveries. Check that the backend is
                    running, then try again.
                  </p>
                  <button
                    type="button"
                    onClick={() => void deliveriesQuery.refetch()}
                    className="text-sm font-medium underline underline-offset-4"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="px-3 py-3 font-medium">Delivery</th>
                          <th className="px-3 py-3 font-medium">Event</th>
                          <th className="px-3 py-3 font-medium">Endpoint</th>
                          <th className="px-3 py-3 font-medium">Status</th>
                          <th className="px-3 py-3 font-medium">Attempts</th>
                          <th className="px-3 py-3 font-medium">HTTP</th>
                          <th className="px-3 py-3 font-medium">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleDeliveries.map((item) => (
                          <tr
                            key={item.id}
                            tabIndex={0}
                            onClick={() => {
                              setSelectedDeliveryId(item.id);
                              retryMutation.reset();
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                setSelectedDeliveryId(item.id);
                                retryMutation.reset();
                              }
                            }}
                            className="cursor-pointer border-b transition-colors hover:bg-muted/50 focus-visible:bg-muted/50"
                          >
                            <td className="px-3 py-4 font-medium">
                              #{item.id}
                            </td>
                            <td className="max-w-48 px-3 py-4">
                              <p className="truncate font-medium">
                                {item.event_type}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Event #{item.event}
                              </p>
                            </td>
                            <td className="max-w-48 px-3 py-4">
                              <p className="truncate">{item.endpoint_name}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {item.endpoint_slug}
                              </p>
                            </td>
                            <td className="px-3 py-4">
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="px-3 py-4 tabular-nums">
                              {item.attempt_count} / {item.max_attempts}
                            </td>
                            <td className="px-3 py-4 tabular-nums">
                              {item.last_http_status ?? "—"}
                            </td>
                            <td className="px-3 py-4 text-muted-foreground">
                              {formatTimestamp(item.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredDeliveries.length === 0 && (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      No deliveries match your search and filters.
                    </p>
                  )}

                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      {filteredDeliveries.length === 0
                        ? "No results"
                        : `Showing ${startIndex + 1}–${Math.min(
                            startIndex + PAGE_SIZE,
                            filteredDeliveries.length,
                          )} of ${filteredDeliveries.length} deliveries`}
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={safePage <= 1}
                        onClick={() =>
                          setCurrentPage((page) => Math.max(1, page - 1))
                        }
                        className="inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="size-4" />
                        Previous
                      </button>
                      <span className="text-xs text-muted-foreground">
                        Page {safePage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={safePage >= totalPages}
                        onClick={() =>
                          setCurrentPage((page) =>
                            Math.min(totalPages, page + 1),
                          )
                        }
                        className="inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Sheet
        open={selectedDeliveryId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedDeliveryId(null);
            retryMutation.reset();
          }
        }}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>Delivery #{selectedDeliveryId ?? ""}</SheetTitle>
            <SheetDescription>
              Delivery metadata, retry controls, and webhook attempt history.
            </SheetDescription>
          </SheetHeader>

          {selectedDeliveryQuery.isPending ? (
            <div
              className="space-y-5 px-6 py-8"
              role="status"
              aria-label="Loading delivery details"
            >
              <Skeleton className="h-5 w-40" />
              <div className="grid gap-4 sm:grid-cols-2">
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
          ) : selectedDeliveryQuery.isError || !delivery ? (
            <div className="space-y-3 px-6 py-8">
              <p className="text-sm text-destructive">
                Could not load delivery details.
              </p>
              <button
                type="button"
                onClick={() => void selectedDeliveryQuery.refetch()}
                className="text-sm font-medium underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="space-y-6 px-6 py-6">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold">Delivery overview</h3>

                <div className="grid grid-cols-2 gap-x-4 gap-y-5 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">
                      <StatusBadge status={delivery.status} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">HTTP status</p>
                    <p className="mt-1 font-medium">
                      {delivery.last_http_status ?? "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Event type</p>
                    <p className="mt-1 break-words font-medium">
                      {delivery.event_type}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Event #{delivery.event}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Endpoint</p>
                    <p className="mt-1 break-words font-medium">
                      {delivery.endpoint_name}
                    </p>
                    <p className="break-words text-xs text-muted-foreground">
                      {delivery.endpoint_slug}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Attempts</p>
                    <p className="mt-1 font-medium">
                      {delivery.attempt_count} / {delivery.max_attempts}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Automatic retry limit
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="mt-1">{formatTimestamp(delivery.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last attempt</p>
                    <p className="mt-1">
                      {formatTimestamp(delivery.last_attempt_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Delivered</p>
                    <p className="mt-1">
                      {formatTimestamp(delivery.delivered_at)}
                    </p>
                  </div>
                </div>

                {delivery.status.toLowerCase() === "failed" && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <div>
                      <h4 className="text-sm font-semibold">Manual retry</h4>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Queue another attempt for this failed delivery. Manual
                        retries may exceed the automatic retry limit.
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
                  <div className="break-words rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-semibold">Latest error</p>
                    <p className="mt-1 whitespace-pre-wrap">
                      {delivery.last_error}
                    </p>
                  </div>
                )}
              </section>

              <Separator />

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Attempt history</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Individual attempts and their responses.
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
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">
                      Could not load attempt history.
                    </p>
                    <button
                      type="button"
                      onClick={() => void deliveryAttemptsQuery.refetch()}
                      className="text-sm font-medium underline underline-offset-4"
                    >
                      Try again
                    </button>
                  </div>
                ) : !deliveryAttemptsQuery.data?.length ? (
                  <p className="rounded-md border p-4 text-sm text-muted-foreground">
                    No attempts recorded for this delivery yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {deliveryAttemptsQuery.data.map(
                      (attempt: DeliveryAttempt) => (
                        <article
                          key={attempt.id}
                          className="space-y-3 rounded-xl border p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold">
                                Attempt {attempt.attempt_number}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatTimestamp(attempt.attempted_at)}
                              </p>
                            </div>
                            <AttemptResultBadge result={attempt.result} />
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                HTTP status
                              </p>
                              <p className="mt-1">
                                {attempt.http_status_code ?? "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Response time
                              </p>
                              <p className="mt-1">
                                {attempt.response_time_ms == null
                                  ? "—"
                                  : `${attempt.response_time_ms} ms`}
                              </p>
                            </div>
                          </div>

                          {attempt.error_message && (
                            <div className="break-words rounded-md bg-muted p-3 text-xs">
                              <p className="font-medium">Error</p>
                              <p className="mt-1 whitespace-pre-wrap">
                                {attempt.error_message}
                              </p>
                            </div>
                          )}

                          {attempt.response_body && (
                            <details className="text-xs">
                              <summary className="cursor-pointer font-medium">
                                Response body
                              </summary>
                              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3">
                                {attempt.response_body}
                              </pre>
                            </details>
                          )}
                        </article>
                      ),
                    )}
                  </div>
                )}
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
