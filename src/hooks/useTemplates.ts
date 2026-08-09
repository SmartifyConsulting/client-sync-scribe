import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface Template {
  id: string;
  user_id?: string;
  name: string;
  description: string | null;
  category: string | null;
  content: string;
  logo_url: string | null;
  logo_position: { x: number; y: number } | null;
  font_family: string | null;
  is_default: boolean;
  header_footer_template_id: string | null;
  header_template_id: string | null;
  footer_template_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateInput {
  name: string;
  description?: string;
  category?: string;
  content: string;
  logo_url?: string;
  logo_position?: { x: number; y: number };
  font_family?: string;
  header_footer_template_id?: string;
  header_template_id?: string;
  footer_template_id?: string;
}

// Default templates that come with the app
const defaultTemplates: Omit<Template, "id" | "user_id">[] = [
  {
    name: "Medical Certificate",
    description: "Certificate for patients to substantiate absence from work",
    category: "Certificate",
    content: `MEDICAL CERTIFICATE

Practice Number: [PracticeNumber]

Doctor Registration Number: [DoctorNumber]

Practice Address: [PracticeAddress]

I have today examined:

Patient: [PatientName]

Of: [PatientAddress]

Date of consultation: [ConsultationDate]

Time of Consultation: [ConsultationTime]

Nature of illness or injury: [NatureOfIllness]

..............................................................................................................

..............................................................................................................

Recommended sick leave from: [SickLeaveFrom] until [SickLeaveUntil] [Inclusive]

Other information / recommendations: [OtherRecommendations]

..............................................................................................................

..............................................................................................................

..............................................................................................................

[DoctorSignature]

[DoctorName]

Date: [SignatureDate]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
    header_footer_template_id: null,
    header_template_id: null,
    footer_template_id: null,
  },
  {
    name: "Referral Letter",
    description: "Letter for referring patients to specialists",
    category: "Letter",
    content: `REFERRAL LETTER

Date: [ReferralDate]

To: [SpecialistName]
    [SpecialistSpecialty]
    [SpecialistAddress]

Dear [SpecialistTitle] [SpecialistName],

RE: REFERRAL OF PATIENT - [PatientName]

Patient Details:
- Name: [PatientName]
- Contact: [PatientContact]

I am writing to refer the above-named patient for your expert opinion and management.

PRESENTING COMPLAINT
[PresentingComplaint]

I would be grateful if you could see this patient at your earliest convenience. Please do not hesitate to contact me if you require any further information.

Yours sincerely,

[DoctorSignature]

[DoctorName]
Practice Number: [PracticeNumber]
Tel: [PracticePhone]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
    header_footer_template_id: null,
    header_template_id: null,
    footer_template_id: null,
  },
  {
    name: "Prescription",
    description: "Template for medication prescriptions",
    category: "Prescription",
    content: `PRESCRIPTION

Date: [PrescriptionDate]

PATIENT DETAILS

Name: [PatientName]

Medical Aid: [MedicalAid]

Medical Aid Number: [MedicalAidNumber]

Rx:

---

1. [Medication1]

   Dosage: [Dosage1]

   Quantity: [Quantity1]

   Instructions: [Instructions1]

2. [Medication2]

   Dosage: [Dosage2]

   Quantity: [Quantity2]

   Instructions: [Instructions2]

3. [Medication3]

   Dosage: [Dosage3]

   Quantity: [Quantity3]

   Instructions: [Instructions3]

Repeats: [NumberOfRepeats]

Special Instructions: [SpecialInstructions]

[DoctorSignature]

Prescribing Doctor: [DoctorName]

Registration Number: [DoctorNumber]

Date: [SignatureDate]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
    header_footer_template_id: null,
    header_template_id: null,
    footer_template_id: null,
  },
  {
    name: "General Letterhead",
    description: "Blank letterhead template for custom documents",
    category: "General",
    content: `[DOCUMENT TITLE]

Practice Number: [PracticeNumber]

Doctor Registration Number: [DoctorNumber]

Practice Address: [PracticeAddress]

Date: [Date]

[Content]

[DoctorSignature]

[DoctorName]

Date: [SignatureDate]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
    header_footer_template_id: null,
    header_template_id: null,
    footer_template_id: null,
  },
  {
    name: "Invoice",
    description: "Billing invoice for patient services",
    category: "Invoice",
    content: `INVOICE

TAX Invoice Number: [InvoiceNumber]

Date: [InvoiceDate]

BILL TO:

Patient: [PatientName]

Address: [PatientAddress]

Medical Aid: [MedicalAid]

Medical Aid Number: [MedicalAidNumber]

SERVICES PROVIDED
-----------------
[Services]

AMOUNT DUE
----------
Total: [TotalAmount]

Payment Terms: Due within 30 days

Bank Details: [BankDetails]

Thank you.

[DoctorSignature]

[DoctorName]

[PracticeNumber]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
    header_footer_template_id: null,
    header_template_id: null,
    footer_template_id: null,
  },
  {
    name: "Hospital Admission Form",
    description: "Form for requesting hospital admission for a patient",
    category: "Admission",
    content: `HOSPITAL ADMISSION FORM

Practice Address: [PracticeAddress]
Practice No: [PracticeNumber]
Registration No: [DoctorNumber]

─────────────────────────────────────

ADMISSION DETAILS

Admitting Doctor: [DoctorName]
Practice Number: [PracticeNumber]
Hospital: [Hospital]
Date of Admission: [AdmissionDate]

─────────────────────────────────────

DIAGNOSIS DETAILS — ICD-10 CODES

[ICD10Codes]

─────────────────────────────────────

PROCEDURE DETAILS

Date of Procedure: [ProcedureDate]
Procedure Description: [ProcedureDescription]

[ProcedureCodes]

─────────────────────────────────────

PATIENT SPECIAL INSTRUCTIONS

[SpecialInstructions]

─────────────────────────────────────

Patient: [PatientName]

[DoctorSignature]

[DoctorName]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
    header_footer_template_id: null,
    header_template_id: null,
    footer_template_id: null,
  },
  {
    name: "General Exercise Programme",
    description: "Structured exercise plan the patient follows between visits",
    category: "Lifestyle",
    content: `EXERCISE PROGRAMME

Patient: [PatientName]
Date: [ConsultationDate]
Prescribed by: [DoctorName]

GOAL
[Goal]

FREQUENCY
Sessions per week: [SessionsPerWeek]
Duration per session: [SessionDuration]

WARM-UP (5-10 minutes)
[WarmUp]

MAIN PROGRAMME
1. [Exercise1] — [Sets1] sets x [Reps1] reps
2. [Exercise2] — [Sets2] sets x [Reps2] reps
3. [Exercise3] — [Sets3] sets x [Reps3] reps
4. [Exercise4] — [Sets4] sets x [Reps4] reps

COOL-DOWN / STRETCHES
[CoolDown]

PRECAUTIONS
[Precautions]

REVIEW DATE
[ReviewDate]

[DoctorSignature]

[DoctorName]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
    header_footer_template_id: null,
    header_template_id: null,
    footer_template_id: null,
  },
  {
    name: "General Eating Plan",
    description: "Daily eating plan with targets and guidance for the patient",
    category: "Lifestyle",
    content: `EATING PLAN

Patient: [PatientName]
Date: [ConsultationDate]
Prescribed by: [DoctorName]

GOAL
[Goal]

DAILY TARGETS
Energy: [DailyCalories]
Protein: [Protein]
Carbohydrates: [Carbohydrates]
Fat: [Fat]
Water: [WaterIntake]

BREAKFAST
[Breakfast]

MID-MORNING SNACK
[MorningSnack]

LUNCH
[Lunch]

AFTERNOON SNACK
[AfternoonSnack]

DINNER
[Dinner]

FOODS TO LIMIT OR AVOID
[FoodsToAvoid]

NOTES
[Notes]

REVIEW DATE
[ReviewDate]

[DoctorSignature]

[DoctorName]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
    header_footer_template_id: null,
    header_template_id: null,
    footer_template_id: null,
  },
];


export function useTemplates() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    } else {
      // Show default templates for non-authenticated users
      setTemplates(
        defaultTemplates.map((t, index) => ({
          ...t,
          id: `default-${index}`,
        })),
      );
      setLoading(false);
    }
  }, [user]);

  const fetchTemplates = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching templates:", error);
      // Fall back to default templates
      setTemplates(
        defaultTemplates.map((t, index) => ({
          ...t,
          id: `default-${index}`,
        })),
      );
    } else if (data && data.length > 0) {
      // Parse logo_position from JSON
      const parsedTemplates = data.map((t) => ({
        ...t,
        logo_position: t.logo_position as { x: number; y: number } | null,
        header_footer_template_id: (t as any).header_footer_template_id ?? null,
        header_template_id: (t as any).header_template_id ?? null,
        footer_template_id: (t as any).footer_template_id ?? null,
      }));

      // Check for missing default templates and seed them
      const existingNames = new Set(data.map(t => t.name));
      const missingDefaults = defaultTemplates.filter(dt => !existingNames.has(dt.name));

      if (missingDefaults.length > 0) {
        const toInsert = missingDefaults.map(t => ({ ...t, user_id: user.id }));
        const { data: newData } = await supabase.from("templates").insert(toInsert).select();
        if (newData) {
          const newParsed = newData.map(t => ({
            ...t,
            logo_position: t.logo_position as { x: number; y: number } | null,
            header_template_id: (t as any).header_template_id ?? null,
            footer_template_id: (t as any).footer_template_id ?? null,
          }));
          setTemplates([...parsedTemplates, ...newParsed]);
          return;
        }
      }

      // One-time reconcile: refresh untouched default templates that lack the
      // new [DoctorSignature] placeholder so the signature renders above the
      // doctor name on rollout.
      const stale = parsedTemplates.filter(
        (t) =>
          t.is_default &&
          !(t.content || "").includes("[DoctorSignature]") &&
          t.updated_at === t.created_at,
      );
      if (stale.length > 0) {
        const updated = await Promise.all(
          stale.map(async (t) => {
            const fresh = defaultTemplates.find((dt) => dt.name === t.name);
            if (!fresh) return t;
            const { data: upd } = await supabase
              .from("templates")
              .update({ content: fresh.content, updated_at: new Date().toISOString() })
              .eq("id", t.id)
              .eq("user_id", user.id)
              .select()
              .single();
            return upd
              ? {
                  ...upd,
                  logo_position: upd.logo_position as { x: number; y: number } | null,
                  header_template_id: (upd as any).header_template_id ?? null,
                  footer_template_id: (upd as any).footer_template_id ?? null,
                }
              : t;
          }),
        );
        const byId = new Map(updated.map((u) => [u.id, u]));
        setTemplates(parsedTemplates.map((t) => byId.get(t.id) || t));
        return;
      }

      setTemplates(parsedTemplates);
    } else {
      // No templates yet, seed with defaults
      await seedDefaultTemplates();
    }
    setLoading(false);
  };

  const seedDefaultTemplates = async () => {
    if (!user) return;

    const templatesWithUserId = defaultTemplates.map((t) => ({
      ...t,
      user_id: user.id,
    }));

    const { data, error } = await supabase.from("templates").insert(templatesWithUserId).select();

    if (error) {
      console.error("Error seeding templates:", error);
      setTemplates(
        defaultTemplates.map((t, index) => ({
          ...t,
          id: `default-${index}`,
        })),
      );
    } else if (data) {
      const parsedTemplates = data.map((t) => ({
        ...t,
        logo_position: t.logo_position as { x: number; y: number } | null,
        header_footer_template_id: (t as any).header_footer_template_id ?? null,
        header_template_id: (t as any).header_template_id ?? null,
        footer_template_id: (t as any).footer_template_id ?? null,
      }));
      setTemplates(parsedTemplates);
    }
  };

  const createTemplate = async (input: TemplateInput): Promise<Template | null> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create templates",
        variant: "destructive",
      });
      return null;
    }

    const { data, error } = await supabase
      .from("templates")
      .insert({
        user_id: user.id,
        name: input.name,
        description: input.description || null,
        category: input.category || null,
        content: input.content,
        logo_url: input.logo_url || null,
        logo_position: input.logo_position || null,
        font_family: input.font_family || "sans",
        is_default: false,
        header_footer_template_id: input.header_footer_template_id || null,
        header_template_id: input.header_template_id || null,
        footer_template_id: input.footer_template_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating template:", error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
      return null;
    }

    const newTemplate: Template = {
      ...data,
      logo_position: data.logo_position as { x: number; y: number } | null,
      header_footer_template_id: (data as any).header_footer_template_id ?? null,
    };
    setTemplates([...templates, newTemplate]);
    toast({
      title: "Template Created",
      description: `"${input.name}" has been saved`,
    });
    return newTemplate;
  };

  const updateTemplate = async (id: string, input: Partial<TemplateInput>): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase
      .from("templates")
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating template:", error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
      return false;
    }

    const updatedTemplate: Template = {
      ...data,
      logo_position: data.logo_position as { x: number; y: number } | null,
      header_footer_template_id: (data as any).header_footer_template_id ?? null,
    };
    setTemplates(templates.map((t) => (t.id === id ? updatedTemplate : t)));
    toast({
      title: "Template Updated",
      description: `"${data.name}" has been saved`,
    });
    return true;
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase.from("templates").delete().eq("id", id).eq("user_id", user.id);

    if (error) {
      console.error("Error deleting template:", error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
      return false;
    }

    setTemplates(templates.filter((t) => t.id !== id));
    toast({
      title: "Template Deleted",
      description: "The template has been removed",
    });
    return true;
  };

  return {
    templates,
    loading,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
