type InfoRowProps = {
  label: string;
  value?: string | number | null;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex">
      <span className="w-36 text-muted-foreground">{label}</span>
      <span className="text-foreground">{value ?? "Unknown"}</span>
    </div>
  );
}
