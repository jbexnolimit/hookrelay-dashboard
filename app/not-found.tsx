import Link from "next/link";
import { ArrowLeft, ArrowRight, Webhook } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Webhook className="size-7" />
        </div>

        <p className="mt-8 text-sm font-semibold tracking-[0.2em] text-muted-foreground">
          ERROR 404
        </p>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Page not found
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">
          We couldn&apos;t find the page you requested. It may have moved,
          or the feature may not be available yet.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ArrowLeft className="size-4" />
            Back to overview
          </Link>

          <Link
            href="/deliveries"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
          >
            View deliveries
            <ArrowRight className="size-4" />
          </Link>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          HookRelay Dashboard
        </p>
      </div>
    </main>
  );
}
