'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FileCreationRowProps {
  label: 'Folder' | 'File';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function FileCreationRow({
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
  onCancel,
}: FileCreationRowProps) {
  return (
    <div className="px-6 py-3 border-b border-border flex items-center gap-2 bg-secondary/40 backdrop-blur">
      <Input
        placeholder={placeholder}
        aria-label={`${label} name`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onSubmit();
          if (event.key === 'Escape') onCancel();
        }}
        className="bg-secondary/60 border border-border text-foreground"
        autoFocus
      />
      <Button
        onClick={onSubmit}
        size="sm"
        className="border border-border bg-secondary/60 hover:bg-secondary text-foreground shadow-sm"
      >
        Create
      </Button>
      <Button
        onClick={onCancel}
        size="sm"
        variant="ghost"
        className="hover:bg-secondary/60 text-muted-foreground hover:text-foreground"
      >
        Cancel
      </Button>
    </div>
  );
}
