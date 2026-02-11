interface MetricCardProps {
  label: string;
  value: string;
  total?: string;
  percentage: number;
  detail?: string;
  color?: 'cyan' | 'green' | 'yellow' | 'red';
}

export function MetricCard({ label, value, total, percentage, detail, color = 'cyan' }: MetricCardProps) {
  const colorClasses = {
    cyan: 'bg-cyan-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="truncate text-[12px] font-semibold leading-tight tracking-[-0.02em] text-muted-foreground">
        {label}
      </div>
      <div className="flex items-baseline justify-between gap-4 truncate text-[17px] leading-tight">
        <div className="flex items-baseline gap-1 truncate">
          <span className="truncate text-[17px] font-bold leading-none tracking-[-0.04em] text-foreground">
          {value}
          </span>
          {total && (
            <span className="hidden truncate text-[14px] font-bold leading-none tracking-[-0.03em] text-muted-foreground sm:block">
              / {total}
            </span>
          )}
        </div>
        {detail && (
          <span className="truncate text-xs font-medium tracking-[-0.03em] text-muted-foreground">
            {detail}
          </span>
        )}
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary/60">
        <div
          className={`h-full transition-all duration-700 rounded-full ${colorClasses[color]}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}
