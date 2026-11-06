"use client";

import { DashboardNavigation } from "@/components/dashboard/dashboard-navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Radio,
  Search,
  Webhook,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import {
  getEvents,
  getEvent,
  getEventDeliveries,
} from "@/lib/api";
import type { HookEvent, Delivery } from "@/lib/api";

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

const statusStyles: Record<string, string> = {
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  queued: "border-blue-200 bg-blue-50 text-blue-700",
  processing: "border-amber-200 bg-amber-50 text-amber-700",
};

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function relativeTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return formatDistanceToNow(date, { addSuffix: true });
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  return (
    <Badge
      variant="outline"
      className={statusStyles[normalized] ?? ""}
    >
      <span className="mr-1.5 size-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function DeliverySummary({ deliveries }: { deliveries: Delivery[] }) {
  if (deliveries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No deliveries are associated with this event.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {deliveries.map((delivery) => (
        <div
          key={delivery.id}
          className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="font-medium">
              Delivery #{delivery.id}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {delivery.endpoint_name} · {delivery.endpoint_slug}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Attempts: {delivery.attempt_count} / {delivery.max_attempts}
              {delivery.last_http_status != null
                ? ` · HTTP ${delivery.last_http_status}`
                : ""}
            </p>
            {delivery.last_error && (
              <p className="mt-1 break-words text-xs text-red-600">
                {delivery.last_error}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <StatusBadge status={delivery.status} />
            <Link
              href="/deliveries"
              className="text-sm text-primary underline-offset-4 hover:underline"
            >
              All deliveries
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EventsPage() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["events"],
    queryFn: getEvents,
  });

  const selectedEventQuery = useQuery({
    queryKey: ["event", selectedEventId],
    queryFn: () => getEvent(selectedEventId!),
    enabled: selectedEventId !== null,
  });

  const eventDeliveriesQuery = useQuery({
    queryKey: ["event-deliveries", selectedEventId],
    queryFn: () => getEventDeliveries(selectedEventId!),
    enabled: selectedEventId !== null,
  });

  const events = useMemo(
    () => eventsQuery.data ?? [],
    [eventsQuery.data],
  );

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return events;

    return events.filter((event) => {
      return (
        String(event.id).includes(term) ||
        event.event_type.toLowerCase().includes(term) ||
        (event.idempotency_key ?? "").toLowerCase().includes(term) ||
        JSON.stringify(event.payload).toLowerCase().includes(term)
      );
    });
  }, [events, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEvents.length / PAGE_SIZE),
  );
  const safePage = Math.min(currentPage, totalPages);
  const visibleEvents = filteredEvents.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const selectedEvent: HookEvent | undefined = selectedEventQuery.data;
  const selectedDeliveries: Delivery[] = eventDeliveriesQuery.data ?? [];

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
            Webhook event history
          </p>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-64">
        <header className="flex h-16 items-center justify-between border-b bg-background px-5 sm:px-8">
          <div>
            <p className="text-sm font-medium">HookRelay</p>
            <p className="text-xs text-muted-foreground">Events</p>
          </div>
          <ThemeToggle />
        </header>

        <div className="space-y-6 p-5 sm:p-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Inspect received events and follow their webhook deliveries.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total events</CardDescription>
                <CardTitle className="text-2xl">
                  {eventsQuery.isPending ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    events.length
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Events recorded by HookRelay
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Matching events</CardDescription>
                <CardTitle className="text-2xl">
                  {eventsQuery.isPending ? (
                    <Skeleton className="h-7 w-20" />
                  ) : (
                    filteredEvents.length
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Based on your current search
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Event history</CardTitle>
              <CardDescription>
                Select an event to inspect its payload and delivery results.
              </CardDescription>
              <div className="relative pt-2">
                <Search className="absolute left-3 top-5 size-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search event ID, type, idempotency key, or payload..."
                  className="pl-9"
                />
              </div>
            </CardHeader>

            <CardContent>
              {eventsQuery.isPending ? (
                <div
                  className="space-y-3 py-4"
                  role="status"
                  aria-label="Loading events"
                >
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="space-y-3 rounded-lg border p-4">
                      <div className="flex items-center justify-between gap-4">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  ))}
                </div>
              ) : eventsQuery.isError ? (
                <div className="py-10 text-center">
                  <p className="text-sm font-medium">Unable to load events.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Check the backend connection and try again.
                  </p>
                </div>
              ) : visibleEvents.length === 0 ? (
                <div className="py-10 text-center">
                  <Radio className="mx-auto size-8 text-muted-foreground" />
                  <p className="mt-3 text-sm font-medium">No events found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {search
                      ? "Try a different search term."
                      : "Events will appear here when they are received."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleEvents.map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => setSelectedEventId(event.id)}
                      className="w-full rounded-lg border bg-background p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">
                              {event.event_type}
                            </span>
                            <Badge variant="secondary">#{event.id}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {relativeTimestamp(event.created_at)}
                          </p>
                          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                            {event.idempotency_key
                              ? `Key: ${event.idempotency_key}`
                              : "No idempotency key"}
                          </p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1 text-sm text-primary">
                          Inspect event
                          <ChevronRight className="size-4" />
                        </span>
                      </div>
                    </button>
                  ))}

                  <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {filteredEvents.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}
                      {"–"}
                      {Math.min(safePage * PAGE_SIZE, filteredEvents.length)}
                      {" of "}
                      {filteredEvents.length} events
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={safePage <= 1}
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        className="inline-flex size-9 items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronLeft className="size-4" />
                      </button>
                      <span className="text-sm text-muted-foreground">
                        Page {safePage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={safePage >= totalPages}
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        className="inline-flex size-9 items-center justify-center rounded-md border disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Sheet
        open={selectedEventId !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null);
        }}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
          <SheetHeader className="border-b px-6 py-5">
            <SheetTitle>
              {selectedEvent
                ? `${selectedEvent.event_type} #${selectedEvent.id}`
                : "Event details"}
            </SheetTitle>
            <SheetDescription>
              Inspect the stored event and its associated deliveries.
            </SheetDescription>
          </SheetHeader>

          {selectedEventQuery.isPending ? (
            <div
              className="space-y-5 px-6 py-8"
              role="status"
              aria-label="Loading event details"
            >
              <Skeleton className="h-5 w-40" />
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : selectedEventQuery.isError ? (
            <p className="px-6 py-8 text-sm text-red-600">
              Unable to load event details. Close this panel and try again.
            </p>
          ) : selectedEvent ? (
            <div className="space-y-6 px-6 py-6">
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Event metadata</h3>
                <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Event ID</p>
                    <p className="mt-1 font-medium">#{selectedEvent.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Event type</p>
                    <p className="mt-1 break-all font-medium">
                      {selectedEvent.event_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="mt-1 text-sm">
                      {formatTimestamp(selectedEvent.created_at)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {relativeTimestamp(selectedEvent.created_at)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Idempotency key</p>
                    <p className="mt-1 break-all font-mono text-xs">
                      {selectedEvent.idempotency_key ?? "Not provided"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Payload</h3>
                <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs leading-5">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </section>

              <section className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold">Related deliveries</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Delivery status and latest recorded result for each endpoint.
                  </p>
                </div>

                {eventDeliveriesQuery.isPending ? (
                  <div
                    className="space-y-3"
                    role="status"
                    aria-label="Loading related deliveries"
                  >
                    {Array.from({ length: 2 }, (_, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      >
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-28" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : eventDeliveriesQuery.isError ? (
                  <p className="text-sm text-red-600">
                    Unable to load deliveries for this event.
                  </p>
                ) : (
                  <DeliverySummary deliveries={selectedDeliveries} />
                )}
              </section>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                Event records are read-only in this view.
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
