import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-xl border border-border/70 bg-background/65 px-3 py-1 text-sm shadow-sm transition-[border-color,box-shadow,background-color] outline-none placeholder:text-muted-foreground/80 focus-visible:border-primary/50 focus-visible:bg-background focus-visible:ring-4 focus-visible:ring-primary/10 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/50 disabled:opacity-50 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/10 dark:bg-background/35 dark:focus-visible:bg-background/60",
        className
      )}
      {...props}
    />
  )
}

export { Input }
