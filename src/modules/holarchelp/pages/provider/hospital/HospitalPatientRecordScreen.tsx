import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, User, HeartPulse, Pill, ShieldAlert, Phone, BedDouble } from "lucide-react";

type PatientRow = Record<string, any>;

const asList = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? v : v?.name || v?.condition || v?.medication || v?.title || ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
};

const age = (dob?: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

const Section = ({
  icon: Icon,
  title,
  items,
  empty = "None recorded",
}: {
  icon: any;
  title: string;
  items: string[];
  empty?: string;
}) => (
  <Card className="overflow-hidden">
    <CardHeader className="bg-primary px-4 py-2">
      <CardTitle className="flex items-center gap-2 text-xs font-semibold text-white">
        <Icon className="h-3.5 w-3.5" /> {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 text-xs">
      {items.length ? (
        <ul className="space-y-1">
          {items.map((i, idx) => (
            <li key={idx} className="flex gap-2">
              <span className="text-primary">•</span>
              <span>{i}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">{empty}</p>
      )}
    </CardContent>
  </Card>
);

export default function HospitalPatientRecordScreen() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: p }, { data: adm }] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId!).maybeSingle(),
        supabase
          .from("hospital_inpatient_admissions")
          .select("id, status, admitted_at, discharged_at, bed_number, reason, ward_id, hospital_wards(name)")
          .eq("patient_id", patientId!)
          .order("admitted_at", { ascending: false }),
      ]);
      if (cancelled) return;
      setPatient(p ?? null);
      setAdmissions(adm ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const contacts = useMemo(() => {
    if (!patient) return [] as string[];
    const list: string[] = [];
    if (patient.next_of_kin_name) {
      list.push(
        `${patient.next_of_kin_name}${patient.next_of_kin_relationship ? ` (${patient.next_of_kin_relationship})` : ""}${
          patient.next_of_kin_phone ? ` · ${patient.next_of_kin_phone}` : ""
        }`,
      );
    }
    if (patient.emergency_contact_name) {
      list.push(
        `${patient.emergency_contact_name}${
          patient.emergency_contact_relationship ? ` (${patient.emergency_contact_relationship})` : ""
        }${patient.emergency_contact_phone ? ` · ${patient.emergency_contact_phone}` : ""}`,
      );
    }
    for (const c of Array.isArray(patient.emergency_contacts) ? patient.emergency_contacts : []) {
      if (c?.name) list.push(`${c.name}${c.relationship ? ` (${c.relationship})` : ""}${c.phone ? ` · ${c.phone}` : ""}`);
    }
    return list;
  }, [patient]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="space-y-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/provider/hospital/admissions">
            <ArrowLeft className="mr-1 h-4 w-4" /> Admissions
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          This patient record is not available to your hospital. Records are visible while the patient is admitted here.
        </p>
      </div>
    );
  }

  const patientAge = age(patient.dob);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/provider/hospital/admissions">
          <ArrowLeft className="mr-1 h-4 w-4" /> Admissions
        </Link>
      </Button>

      <Card className="overflow-hidden">
        <CardHeader className="bg-primary px-4 py-3">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-white">
            <span className="flex items-center gap-2 text-base font-bold">
              <User className="h-4 w-4" /> {patient.name}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              Read-only hospital view
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-6 gap-y-2 p-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Age", patientAge != null ? `${patientAge}` : "—"],
            ["Gender", patient.gender || "—"],
            ["Date of birth", patient.dob || "—"],
            ["Blood type", patient.blood_type || "—"],
            ["Phone", patient.phone || "—"],
            ["Email", patient.email || "—"],
            ["Medical aid", patient.medical_aid || "—"],
            ["Member no.", patient.medical_aid_number || "—"],
          ].map(([label, value]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="w-24 shrink-0 font-bold">{label}</span>
              <span className="truncate text-muted-foreground">{value as string}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <Section icon={HeartPulse} title="Conditions & diagnoses" items={asList(patient.conditions_diagnoses)} />
        <Section icon={ShieldAlert} title="Allergies" items={asList(patient.allergies)} />
        <Section icon={Pill} title="Current medications" items={asList(patient.current_medications)} />
        <Section icon={Phone} title="Emergency contacts" items={contacts} />
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="bg-primary px-4 py-2">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold text-white">
            <BedDouble className="h-3.5 w-3.5" /> Admissions at this hospital
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {admissions.length ? (
            <ul className="divide-y">
              {admissions.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
                  <span className="font-semibold">
                    {a.hospital_wards?.name || "Unassigned"} · Bed {a.bed_number || "—"}
                  </span>
                  <span className="text-muted-foreground">
                    <span className="capitalize">{a.status}</span> · {new Date(a.admitted_at).toLocaleString()}
                    {a.reason ? ` · ${a.reason}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-xs text-muted-foreground">No admissions recorded.</p>
          )}
        </CardContent>
      </Card>

      {patient.notes ? (
        <Card className="overflow-hidden">
          <CardHeader className="bg-primary px-4 py-2">
            <CardTitle className="text-xs font-semibold text-white">Clinical overview</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap p-4 text-xs">{patient.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}
