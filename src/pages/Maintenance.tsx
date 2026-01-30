export default function Maintenance() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <div className="flex max-w-xl flex-col items-center gap-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Maintenance mode
        </p>
        <h1 className="text-3xl font-semibold">We’ll be right back.</h1>
        <p className="text-sm text-muted-foreground">
          Teachmo is temporarily offline while we complete urgent maintenance. Please check back
          soon.
        </p>
      </div>
    </main>
  );
}
