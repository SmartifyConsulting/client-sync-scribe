import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Search, Phone, Mail, BedDouble } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useHospitalNetwork,
  distanceKm,
  type HospitalNetworkRow,
} from "../../../hooks/useHospitalNetwork";

const ER_STATUS_TONE: Record<string, string> = {
  open: "bg-success/10 text-success",
  accepting: "bg-success/10 text-success",
  diverting: "bg-warning/10 text-warning",
  closed: "bg-muted text-muted-foreground",
};

function erStatusLabel(row: HospitalNetworkRow) {
  if (!row.accepting_patients) return "Not Accepting";
  const s = (row.er_capacity_status || "").toLowerCase();
  if (s.includes("divert")) return "Diverting";
  if (s.includes("closed")) return "Closed";
  return "Accepting";
}

function erStatusTone(row: HospitalNetworkRow) {
  if (!row.accepting_patients) return ER_STATUS_TONE.closed;
  const s = (row.er_capacity_status || "open").toLowerCase();
  return ER_STATUS_TONE[s] ?? ER_STATUS_TONE.accepting;
}

interface Props {
  /** When true, only accepting hospitals are listed (used by dispatch pickers). */
  acceptingOnly?: boolean;
  /** Hide outer page header (used inside Admin tab). */
  embedded?: boolean;
}

export default function HospitalNetworkScreen({
  acceptingOnly = false,
  embedded = false,
}: Props) {
  const { data = [], isLoading } = useHospitalNetwork({ acceptingOnly });
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "distance">("name");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setCoords(null),
      { enableHighAccuracy: false, timeout: 4000, maximumAge: 60_000 },
    );
  }, []);

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = data.filter((h) =>
      !q
        ? true
        : [h.name, h.city, h.address].some((v) =>
            (v || "").toLowerCase().includes(q),
          ),
    );

    const withDist = list.map((h) => {
      const km =
        coords && h.latitude != null && h.longitude != null
          ? distanceKm(coords, { lat: h.latitude, lng: h.longitude })
          : null;
      return { ...h, _km: km };
    });

    if (sortBy === "distance" && coords) {
      withDist.sort(
        (a, b) =>
          (a._km ?? Number.POSITIVE_INFINITY) -
          (b._km ?? Number.POSITIVE_INFINITY),
      );
    } else {
      withDist.sort((a, b) => a.name.localeCompare(b.name));
    }
    return withDist;
  }, [data, searchQuery, sortBy, coords]);

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Partnerships
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hospital Network
          </h1>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${rows.length} hospitals`}
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search hospitals, city, address…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Sort: Name</SelectItem>
            <SelectItem value="distance" disabled={!coords}>
              Sort: Distance
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {acceptingOnly
            ? "No hospitals are currently accepting patients."
            : "No hospitals match your search."}
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((h) => {
            const accepting = !!h.accepting_patients;
            return (
              <Card
                key={h.id}
                className={`rounded-xl border shadow-sm ${
                  accepting ? "" : "opacity-60"
                }`}
              >
                <CardHeader className="py-3 flex flex-row items-start justify-between space-y-0 gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold truncate">
                      {h.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {[h.address, h.city, h.state]
                        .filter(Boolean)
                        .join(", ") || "—"}
                      {h._km != null && (
                        <span className="ml-1">· {h._km.toFixed(1)} km</span>
                      )}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${erStatusTone(
                      h,
                    )}`}
                  >
                    {erStatusLabel(h)}
                  </span>
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Beds available</p>
                      <p className="font-semibold flex items-center gap-1 mt-0.5">
                        <BedDouble className="h-3.5 w-3.5" />
                        {h.beds_available ?? "—"}
                        {h.bed_capacity ? (
                          <span className="text-muted-foreground">
                            /{h.bed_capacity}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ER beds</p>
                      <p className="font-semibold mt-0.5">
                        {h.er_beds_available ?? "—"}
                      </p>
                    </div>
                    <div className="truncate">
                      <p className="text-muted-foreground">Phone</p>
                      <p className="font-medium flex items-center gap-1 mt-0.5 truncate">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        {h.contact_phone || "—"}
                      </p>
                    </div>
                    <div className="truncate">
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium flex items-center gap-1 mt-0.5 truncate">
                        <Mail className="h-3.5 w-3.5 shrink-0" />
                        {h.contact_email || "—"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
