"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Activity,
  LayoutDashboard,
  Menu,
  Radio,
  Webhook,
  Zap,
} from "lucide-react";

const navigation = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Deliveries", href: "/deliveries", icon: Activity },
  { label: "Events", href: "/events", icon: Radio },
  { label: "Endpoints", href: "/endpoints", icon: Webhook },
  { label: "Analytics", href: "/analytics", icon: Zap },
];

export function DashboardNavigation() {
  const pathname = usePathname();

  return (
    <div className="px-4 py-5">
      <div className="mb-3 px-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Workspace
        </p>
      </div>

      <nav className="space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function MobileDashboardDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation menu"
            />
          }
        >
          <Menu className="size-5" />
        </SheetTrigger>

        <SheetContent
          side="left"
          className="w-72 max-w-[85vw] gap-0 p-0"
        >
          <SheetHeader className="border-b pr-12">
            <SheetTitle>HookRelay</SheetTitle>
            <SheetDescription>
              Navigate your workspace
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 py-5">
            <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Workspace
            </p>

            <nav aria-label="Mobile dashboard navigation" className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
