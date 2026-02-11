import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { FirewallRule } from "./types";

type RuleItemProps = {
  rule: FirewallRule;
  index: number;
  onDelete: (index: number) => void;
  deleting: boolean;
};

const actionColors: Record<string, string> = {
  ALLOW: "text-green-400 bg-green-500/10 border-green-500/30",
  DENY: "text-red-400 bg-red-500/10 border-red-500/30",
  REJECT: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  LIMIT: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
};

export function RuleItem({ rule, index, onDelete, deleting }: RuleItemProps) {
  const actionClass =
    actionColors[rule.action] ||
    "text-muted-foreground bg-secondary/40 border-border";

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/40 border border-border hover:bg-secondary/60 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${actionClass}`}
        >
          {rule.action}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-foreground font-medium truncate">
              {rule.to}
            </span>
            {rule.direction && (
              <span className="text-muted-foreground text-xs">
                ({rule.direction})
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            from {rule.from}
            {rule.v6 && (
              <span className="ml-1 text-muted-foreground">(IPv6)</span>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(index + 1)}
        disabled={deleting}
        className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 flex-shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
