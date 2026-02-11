"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import type { ShareForm } from "./types";

type ManualAddFormProps = {
  form: ShareForm;
  onFormChange: (form: ShareForm) => void;
  formError: string | null;
  addingShare: string | null;
  onSubmit: () => void;
  onCancel: () => void;
};

export function ManualAddForm({
  form,
  onFormChange,
  formError,
  addingShare,
  onSubmit,
  onCancel,
}: ManualAddFormProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-secondary/40 p-4 space-y-3">
        <div className="text-sm text-foreground">
          Enter the SMB share details manually
        </div>
        <Input
          placeholder="Host (e.g. nas.local or 192.168.1.100)"
          value={form.host}
          onChange={(e) => onFormChange({ ...form, host: e.target.value })}
          className="bg-secondary/60 border-border text-foreground placeholder:text-muted-foreground h-10"
        />
        <Input
          placeholder="Share name (e.g. Media, Documents)"
          value={form.share}
          onChange={(e) => onFormChange({ ...form, share: e.target.value })}
          className="bg-secondary/60 border-border text-foreground placeholder:text-muted-foreground h-10"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Username (optional)"
            value={form.username}
            onChange={(e) => onFormChange({ ...form, username: e.target.value })}
            className="bg-secondary/60 border-border text-foreground placeholder:text-muted-foreground h-10"
          />
          <Input
            type="password"
            placeholder="Password (optional)"
            value={form.password}
            onChange={(e) => onFormChange({ ...form, password: e.target.value })}
            className="bg-secondary/60 border-border text-foreground placeholder:text-muted-foreground h-10"
          />
        </div>
      </div>

      {formError && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-100">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>{formError}</div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={onCancel}
          className="text-foreground border border-border"
        >
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={addingShare === "manual" || !form.host || !form.share}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {addingShare === "manual" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Add Share
        </Button>
      </div>
    </div>
  );
}
