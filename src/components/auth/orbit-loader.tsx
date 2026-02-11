"use client";

export function OrbitLoader() {
  return (
    <div className="relative h-16 w-16">
      <div className="absolute inset-0 rounded-full border border-border/60" />
      <div className="absolute inset-1 animate-spin rounded-full border-2 border-muted-foreground/45 border-t-transparent" />
      <div className="absolute inset-3 rounded-full bg-secondary/65 blur-2xl" />
      <div className="absolute inset-0 flex items-center justify-center text-foreground">
        <div className="h-5 w-5 animate-ping rounded-full bg-primary/85" />
      </div>
    </div>
  );
}
