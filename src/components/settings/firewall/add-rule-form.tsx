"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { AddRuleFormData } from "./types";

type AddRuleFormProps = {
  onAdd: (data: AddRuleFormData) => void;
  loading: boolean;
};

const DEFAULT_FORM: AddRuleFormData = {
  port: "",
  protocol: "any",
  action: "allow",
  from: "any",
  direction: "in",
};

const selectClass =
  "h-9 w-full bg-input border border-border rounded-md px-3 text-foreground text-sm appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring/30";

export function AddRuleForm({ onAdd, loading }: AddRuleFormProps) {
  const [form, setForm] = useState<AddRuleFormData>(DEFAULT_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.port.trim()) return;
    onAdd(form);
    setForm(DEFAULT_FORM);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 p-4 rounded-xl bg-secondary/40 border border-border"
    >
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Port</Label>
          <Input
            value={form.port}
            onChange={(e) => setForm({ ...form, port: e.target.value })}
            placeholder="80 or 8000:8080"
            className="h-9 bg-input border-border text-foreground text-sm placeholder:text-muted-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Protocol</Label>
          <select
            value={form.protocol}
            onChange={(e) => setForm({ ...form, protocol: e.target.value as AddRuleFormData["protocol"] })}
            className={selectClass}
          >
            <option value="any">Any</option>
            <option value="tcp">TCP</option>
            <option value="udp">UDP</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Action</Label>
          <select
            value={form.action}
            onChange={(e) => setForm({ ...form, action: e.target.value as AddRuleFormData["action"] })}
            className={selectClass}
          >
            <option value="allow">Allow</option>
            <option value="deny">Deny</option>
            <option value="reject">Reject</option>
            <option value="limit">Limit</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
            placeholder="any or IP/CIDR"
            className="h-9 bg-input border-border text-foreground text-sm placeholder:text-muted-foreground"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Direction</Label>
          <select
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value as AddRuleFormData["direction"] })}
            className={selectClass}
          >
            <option value="in">Incoming</option>
            <option value="out">Outgoing</option>
          </select>
        </div>
      </div>
      <Button
        type="submit"
        disabled={loading || !form.port.trim()}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Rule
      </Button>
    </form>
  );
}
