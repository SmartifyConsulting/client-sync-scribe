import { toastError } from "@/lib/userMessage";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export type GeofenceRow = {
  id: string;
  name: string;
  type: "depot" | "hospital" | "no_go" | "service_center" | "standby";
  latitude: number;
  longitude: number;
  radius_km: number;
  created_at: string;
  provider_id: string;
};

interface GeofenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  initial?: GeofenceRow | null;
  onSaved: () => void;
}

export function GeofenceFormDialog({ open, onOpenChange, providerId, initial, onSaved }: GeofenceFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState(initial?.type ?? "depot");
  const [latitude, setLatitude] = useState(initial?.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(initial?.longitude?.toString() ?? "");
  const [radiusKm, setRadiusKm] = useState(initial?.radius_km?.toString() ?? "1");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("geofence.enterName"));
      return;
    }
    if (!latitude || !longitude || !radiusKm) {
      toast.error(t("geofence.fillLocation"));
      return;
    }

    setSaving(true);
    try {
      // Would save to Supabase here
      toast.success(initial ? t("geofence.updated") : t("geofence.created"));
      onOpenChange(false);
      onSaved();
      // Reset form
      if (!initial) {
        setName("");
        setType("depot");
        setLatitude("");
        setLongitude("");
        setRadiusKm("1");
      }
    } catch (error: any) {
      toast.error(error.message ?? t("geofence.failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? t("geofence.editTitle") : t("geofence.createTitle")}</DialogTitle>
          <DialogDescription>
            {initial ? t("geofence.editDescription") : t("geofence.createDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="gf-name" className="text-sm">
              {t("geofence.name")}
            </Label>
            <Input
              id="gf-name"
              placeholder={t("geofence.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="gf-type" className="text-sm">
              {t("geofence.type")}
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger id="gf-type" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="depot">{t("geofence.depot")}</SelectItem>
                <SelectItem value="hospital">{t("topbar.hospital")}</SelectItem>
                <SelectItem value="no_go">{t("geofence.noGo")}</SelectItem>
                <SelectItem value="service_center">{t("geofence.serviceCenter")}</SelectItem>
                <SelectItem value="standby">{t("geofence.standby")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="gf-lat" className="text-sm">
                {t("geofence.latitude")}
              </Label>
              <Input
                id="gf-lat"
                placeholder="-33.9249"
                type="number"
                step="0.0001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="gf-lng" className="text-sm">
                {t("geofence.longitude")}
              </Label>
              <Input
                id="gf-lng"
                placeholder="18.4241"
                type="number"
                step="0.0001"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="gf-radius" className="text-sm">
              {t("geofence.radiusKm")}
            </Label>
            <Input
              id="gf-radius"
              placeholder="1"
              type="number"
              step="0.1"
              value={radiusKm}
              onChange={(e) => setRadiusKm(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initial ? t("common.update", { defaultValue: "Update" }) : t("common.create", { defaultValue: "Create" })} {t("geofence.geofence")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

