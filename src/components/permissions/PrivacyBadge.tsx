import { Shield, CheckCircle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { getSharedItems, getPrivateItems } from "./PermissionTransparencyModal";

export function PrivacyBadge() {
  const { t } = useTranslation();
  const sharedItems = getSharedItems(t);
  const privateItems = getPrivateItems(t);
  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
          <Shield className="h-3.5 w-3.5" />
          Privacy
        </button>
      </HoverCardTrigger>
      <HoverCardContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Data Sharing Summary</p>
          </div>

          <div>
            <p className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Shared with Care Team
            </p>
            <div className="space-y-1">
              {sharedItems.map((item) => (
                <p key={item.label} className="text-xs text-muted-foreground pl-4">
                  {item.label}
                </p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              <XCircle className="h-4 w-4 text-destructive" />
              Private — Not Shared
            </p>
            <div className="space-y-1">
              {privateItems.map((item) => (
                <p key={item.label} className="text-xs text-foreground pl-4">
                  {item.label}
                </p>
              ))}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
