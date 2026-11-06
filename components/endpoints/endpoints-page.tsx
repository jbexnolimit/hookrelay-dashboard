"use client";

import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import axios from "axios";
import {
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  Plus,
  Search,
  ShieldAlert,
  Webhook,
  XCircle,
} from "lucide-react";

import { DashboardNavigation, MobileDashboardDrawer } from "@/components/dashboard/dashboard-navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  createEndpoint,
  deleteEndpoint,
  getDeliveries,
  getEndpoints,
  updateEndpoint,
} from "@/lib/api";
import type {
  Delivery,
  WebhookEndpoint,
  WebhookEndpointPayload,
} from "@/lib/api";

type EndpointDraft = {
  name: string;
  slug: string;
  url: string;
  eventTypes: string;
  isActive: boolean;
};

const EMPTY_ENDPOINTS: WebhookEndpoint[] = [];
const EMPTY_DELIVERIES: Delivery[] = [];

const emptyDraft: EndpointDraft = {
  name: "",
  slug: "",
  url: "",
  eventTypes: "",
  isActive: true,
};

function normalizeEventTypes(value: string | string[]): string[] {
  const values = typeof value === "string" ? value.split(",") : value;
  return [...new Set(values.map((type) => type.trim()).filter(Boolean))]
    .sort();
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string") return data;

    if (data && typeof data === "object") {
      const messages = Object.entries(data as Record<string, unknown>)
        .map(([field, value]) => {
          const message = Array.isArray(value)
            ? value.join(", ")
            : typeof value === "string"
              ? value
              : "";

          return message ? `${field}: ${message}` : "";
        })
        .filter(Boolean);

      if (messages.length) return messages.join(" · ");
    }

    if (!error.response) {
      return "Unable to reach the API. Check that the backend is running.";
    }

    return error.message || "The request could not be completed.";
  }

  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-slate-200/80 bg-slate-100/80 text-slate-600 dark:border-slate-700/70 dark:bg-slate-800/60 dark:text-slate-300"
      }
    >
      <span className="mr-1.5 size-1.5 rounded-full bg-current" />
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

export function EndpointsPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEndpoint, setEditingEndpoint] =
    useState<WebhookEndpoint | null>(null);
  const [draft, setDraft] = useState<EndpointDraft>(emptyDraft);
  const [formError, setFormError] = useState("");

  const endpointsQuery = useQuery({
    queryKey: ["endpoints"],
    queryFn: () => getEndpoints(),
  });

  const deliveriesQuery = useQuery({
    queryKey: ["deliveries"],
    queryFn: getDeliveries,
  });

  const endpoints = endpointsQuery.data ?? EMPTY_ENDPOINTS;
  const deliveries = deliveriesQuery.data ?? EMPTY_DELIVERIES;

  const deliveryCounts = useMemo(() => {
    const counts = new Map<number, number>();

    for (const delivery of deliveries) {
      counts.set(
        delivery.endpoint,
        (counts.get(delivery.endpoint) ?? 0) + 1,
      );
    }

    return counts;
  }, [deliveries]);

  const filteredEndpoints = useMemo(() => {
    const term = search.trim().toLowerCase();

    return endpoints.filter((endpoint) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && endpoint.is_active) ||
        (statusFilter === "inactive" && !endpoint.is_active);

      const matchesSearch =
        !term ||
        endpoint.name.toLowerCase().includes(term) ||
        endpoint.slug.toLowerCase().includes(term) ||
        endpoint.url.toLowerCase().includes(term) ||
        endpoint.event_types.some((type) =>
          type.toLowerCase().includes(term),
        );

      return matchesStatus && matchesSearch;
    });
  }, [endpoints, search, statusFilter]);

  const createMutation = useMutation({
    mutationFn: createEndpoint,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["endpoints"] });
      setFormOpen(false);
      setFormError("");
      setEditingEndpoint(null);
      setDraft(emptyDraft);
    },
    onError: (error: unknown) => setFormError(getErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number;
      payload: Partial<WebhookEndpointPayload>;
    }) => updateEndpoint(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["endpoints"] });
      setFormOpen(false);
      setFormError("");
      setEditingEndpoint(null);
      setDraft(emptyDraft);
    },
    onError: (error: unknown) => setFormError(getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEndpoint,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["endpoints"] });
      await queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      endpoint,
      isActive,
    }: {
      endpoint: WebhookEndpoint;
      isActive: boolean;
    }) =>
      updateEndpoint(endpoint.id, {
        is_active: isActive,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["endpoints"] });
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const hasEndpointChanges = editingEndpoint
    ? draft.name.trim() !== editingEndpoint.name ||
      draft.slug.trim() !== editingEndpoint.slug ||
      draft.url.trim() !== editingEndpoint.url ||
      draft.isActive !== editingEndpoint.is_active ||
      JSON.stringify(normalizeEventTypes(draft.eventTypes)) !==
        JSON.stringify(normalizeEventTypes(editingEndpoint.event_types))
    : false;

  function openCreateForm() {
    setEditingEndpoint(null);
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(endpoint: WebhookEndpoint) {
    setEditingEndpoint(endpoint);
    setDraft({
      name: endpoint.name,
      slug: endpoint.slug,
      url: endpoint.url,
      eventTypes: endpoint.event_types.join(", "),
      isActive: endpoint.is_active,
    });
    setFormError("");
    setFormOpen(true);
  }

  function submitForm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const eventTypes = [
      ...new Set(
        draft.eventTypes
          .split(",")
          .map((type) => type.trim())
          .filter(Boolean),
      ),
    ];

    if (!draft.name.trim() || !draft.slug.trim() || !draft.url.trim()) {
      setFormError("Name, slug, and destination URL are required.");
      return;
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(draft.url.trim());
    } catch {
      setFormError("Enter a valid destination URL.");
      return;
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      setFormError("The destination URL must use HTTP or HTTPS.");
      return;
    }

    const payload: WebhookEndpointPayload = {
      name: draft.name.trim(),
      slug: draft.slug.trim(),
      url: draft.url.trim(),
      event_types: eventTypes,
      is_active: draft.isActive,
    };

    if (editingEndpoint) {
      updateMutation.mutate({
        id: editingEndpoint.id,
        payload,
      });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleDelete(endpoint: WebhookEndpoint) {
    const count = deliveryCounts.get(endpoint.id) ?? 0;

    if (!deliveriesQuery.isSuccess) return;

    if (count > 0) {
      window.alert(
        `This endpoint has ${count} associated delivery record(s). Deactivate it instead of deleting it.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete endpoint "${endpoint.name}"? This action cannot be undone.`,
    );

    if (confirmed) deleteMutation.mutate(endpoint.id);
  }

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

        <div className="mt-auto border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            Webhook endpoint management
          </p>
        </div>
      </aside>

      <main className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/60 bg-background/70 px-4 shadow-sm backdrop-blur-xl supports-[backdrop-filter]:bg-background/55 sm:px-6 lg:px-8">
          <MobileDashboardDrawer />
          <div>
            <p className="text-sm font-semibold tracking-tight">HookRelay</p>
            <p className="text-xs text-muted-foreground">Endpoints</p>
          </div>
          <ThemeToggle />
        </header>

        <div className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Webhook endpoints
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage destination URLs, subscribed event types, and endpoint status.
              </p>
            </div>

            <Button onClick={openCreateForm}>
              <Plus className="size-4" />
              Add endpoint
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total endpoints</CardDescription>
                <CardTitle className="text-2xl">
                  {endpointsQuery.isPending ? "—" : endpoints.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Registered destinations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active</CardDescription>
                <CardTitle className="text-2xl">
                  {endpointsQuery.isPending
                    ? "—"
                    : endpoints.filter((endpoint) => endpoint.is_active).length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Enabled for delivery processing
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Associated deliveries</CardDescription>
                <CardTitle className="text-2xl">
                  {deliveriesQuery.isSuccess ? deliveries.length : "—"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Delivery records across endpoints
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registered endpoints</CardTitle>
              <CardDescription>
                Search destinations and manage their subscriptions.
              </CardDescription>
              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, slug, URL, or event type..."
                    className="pl-9"
                    aria-label="Search endpoints"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="Filter endpoints by status"
                  className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {endpointsQuery.isPending && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Loading endpoints...
                </div>
              )}

              {endpointsQuery.isError && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <CircleAlert className="size-8 text-destructive" />
                  <p className="font-medium">Unable to load endpoints</p>
                  <p className="text-sm text-muted-foreground">
                    {getErrorMessage(endpointsQuery.error)}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => void endpointsQuery.refetch()}
                  >
                    Try again
                  </Button>
                </div>
              )}

              {endpointsQuery.isSuccess &&
                filteredEndpoints.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <Webhook className="size-8 text-muted-foreground" />
                    <p className="font-medium">
                      {endpoints.length === 0
                        ? "No endpoints yet"
                        : "No matching endpoints"}
                    </p>
                    <p className="max-w-sm text-sm text-muted-foreground">
                      {endpoints.length === 0
                        ? "Create your first endpoint to start configuring webhook destinations."
                        : "Try a different search term or status filter."}
                    </p>
                    {endpoints.length === 0 && (
                      <Button onClick={openCreateForm}>
                        <Plus className="size-4" />
                        Add endpoint
                      </Button>
                    )}
                  </div>
                )}

              {filteredEndpoints.map((endpoint) => {
                const deliveryCount = deliveryCounts.get(endpoint.id) ?? 0;
                const deleting = deleteMutation.isPending &&
                  deleteMutation.variables === endpoint.id;
                const changingStatus =
                  statusMutation.isPending &&
                  statusMutation.variables?.endpoint.id === endpoint.id;

                return (
                  <div
                    key={endpoint.id}
                    className="rounded-xl border bg-background p-4"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{endpoint.name}</h3>
                          <StatusBadge active={endpoint.is_active} />
                          <Badge variant="secondary">
                            {endpoint.event_types.length} event type
                            {endpoint.event_types.length === 1 ? "" : "s"}
                          </Badge>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Slug
                          </p>
                          <code className="text-sm">{endpoint.slug}</code>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">
                            Destination URL
                          </p>
                          <a
                            href={endpoint.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-center gap-1 break-all text-sm text-primary hover:underline"
                          >
                            {endpoint.url}
                            <ExternalLink className="size-3 shrink-0" />
                          </a>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {endpoint.event_types.length > 0 ? (
                            endpoint.event_types.map((type) => (
                              <Badge
                                key={type}
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {type}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No event types configured
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground">
                          Created {formatDate(endpoint.created_at)}
                          {" · "}
                          {deliveryCount} delivery record
                          {deliveryCount === 1 ? "" : "s"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditForm(endpoint)}
                        >
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={changingStatus || statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              endpoint,
                              isActive: !endpoint.is_active,
                            })
                          }
                        >
                          {changingStatus && (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          )}
                          {endpoint.is_active ? "Deactivate" : "Activate"}
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={
                            !deliveriesQuery.isSuccess ||
                            deliveryCount > 0 ||
                            deleteMutation.isPending
                          }
                          title={
                            !deliveriesQuery.isSuccess
                              ? "Delivery records could not be verified"
                              : deliveryCount > 0
                                ? "This endpoint has associated deliveries"
                                : "Delete endpoint"
                          }
                          onClick={() => handleDelete(endpoint)}
                        >
                          {deleting && (
                            <LoaderCircle className="size-3.5 animate-spin" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {deleteMutation.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <p>{getErrorMessage(deleteMutation.error)}</p>
                </div>
              )}

              {statusMutation.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <p>{getErrorMessage(statusMutation.error)}</p>
                </div>
              )}

              {deliveriesQuery.isError && (
                <p className="flex items-center gap-2 text-xs text-amber-700">
                  <ShieldAlert className="size-4 shrink-0" />
                  Delivery records could not be loaded. Deletion is disabled for safety.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Sheet
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setFormError("");
        }}
      >
        <SheetContent className="w-full gap-0 overflow-y-auto p-0 shadow-xl sm:max-w-xl">
          <SheetHeader className="border-b bg-muted/20 px-6 py-5 pr-12">
            <SheetTitle className="text-lg font-semibold tracking-tight">
              {editingEndpoint ? "Edit endpoint" : "Create endpoint"}
            </SheetTitle>
            <SheetDescription>
              Configure the destination URL and the event types it receives.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={submitForm} className="flex flex-1 flex-col">
            <div className="space-y-6 p-6">
              <div className="space-y-2">
                <label htmlFor="endpoint-name" className="text-sm font-semibold tracking-tight">
                  Name
                </label>
                <Input
                  id="endpoint-name"
                  className="h-10 transition-shadow focus-visible:ring-2"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  placeholder="Production order processor"
                  maxLength={120}
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="endpoint-slug" className="text-sm font-semibold tracking-tight">
                  Slug
                </label>
                <Input
                  id="endpoint-slug"
                  className="h-10 transition-shadow focus-visible:ring-2"
                  value={draft.slug}
                  onChange={(event) =>
                    setDraft({ ...draft, slug: event.target.value })
                  }
                  placeholder="production-orders"
                  maxLength={80}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  A unique identifier for this endpoint.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="endpoint-url" className="text-sm font-semibold tracking-tight">
                  Destination URL
                </label>
                <Input
                  id="endpoint-url"
                  className="h-10 transition-shadow focus-visible:ring-2"
                  type="url"
                  value={draft.url}
                  onChange={(event) =>
                    setDraft({ ...draft, url: event.target.value })
                  }
                  placeholder="https://example.com/webhooks"
                  maxLength={1000}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Use a reachable HTTP or HTTPS URL.
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="endpoint-events"
                  className="text-sm font-semibold tracking-tight"
                >
                  Event types
                </label>
                <textarea
                  id="endpoint-events"
                  value={draft.eventTypes}
                  onChange={(event) =>
                    setDraft({ ...draft, eventTypes: event.target.value })
                  }
                  placeholder="order.created, order.updated, payment.completed"
                  rows={4}
                  className="min-h-24 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2.5 text-sm leading-6 outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                />
                <p className="text-xs text-muted-foreground">
                  Separate event types with commas. Leave empty to accept no specific event types.
                </p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(event) =>
                    setDraft({ ...draft, isActive: event.target.checked })
                  }
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium">
                    Endpoint active
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Allow this endpoint to participate in delivery processing.
                  </span>
                </span>
              </label>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <p>{formError}</p>
                </div>
              )}
            </div>

            <div className="mt-auto flex justify-end gap-2 border-t p-4">
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => {
                  setFormOpen(false);
                  setFormError("");
                  setEditingEndpoint(null);
                  setDraft(emptyDraft);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSaving || (Boolean(editingEndpoint) && !hasEndpointChanges)
                }
              >
                {isSaving && (
                  <LoaderCircle className="size-4 animate-spin" />
                )}
                {editingEndpoint ? "Save changes" : "Create endpoint"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
