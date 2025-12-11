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
}

// Default templates that come with the app
const defaultTemplates: Omit<Template, "id" | "user_id">[] = [
  {
    name: "Medical Certificate",
    description: "Certificate for patients to substantiate absence from work",
    category: "Certificate",
    content: `MEDICAL CERTIFICATE
===================

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


Doctor's Name: [DoctorName]

Doctor's Signature: ................................................ Date: [SignatureDate]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
  },
  {
    name: "Referral Letter",
    description: "Letter for referring patients to specialists",
    category: "Letter",
    content: `REFERRAL LETTER
===============

Practice Number: [PracticeNumber]
Doctor Registration Number: [DoctorNumber]
Practice Address: [PracticeAddress]

Date: [ReferralDate]

To: [SpecialistName]
    [SpecialistSpecialty]
    [SpecialistAddress]

Dear [SpecialistTitle] [SpecialistName],

RE: REFERRAL OF PATIENT - [PatientName]

Patient Details:
- Name: [PatientName]
- Date of Birth: [PatientDOB]
- Contact: [PatientContact]
- Address: [PatientAddress]

I am writing to refer the above-named patient for your expert opinion and management.

PRESENTING COMPLAINT
--------------------
[PresentingComplaint]

RELEVANT HISTORY
----------------
[RelevantHistory]

CURRENT MEDICATIONS
-------------------
[CurrentMedications]

INVESTIGATIONS PERFORMED
------------------------
[Investigations]

REASON FOR REFERRAL
-------------------
[ReasonForReferral]

I would be grateful if you could see this patient at your earliest convenience. Please do not hesitate to contact me if you require any further information.

Yours sincerely,


[DoctorName]
Practice Number: [PracticeNumber]
Tel: [PracticePhone]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
  },
  {
    name: "Prescription",
    description: "Template for medication prescriptions",
    category: "Prescription",
    content: `PRESCRIPTION
============

Practice Number: [PracticeNumber]
Doctor Registration Number: [DoctorNumber]
Practice Address: [PracticeAddress]
Tel: [PracticePhone]

Date: [PrescriptionDate]

PATIENT DETAILS
---------------
Name: [PatientName]
Date of Birth: [PatientDOB]
Address: [PatientAddress]
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


Prescribing Doctor: [DoctorName]
Registration Number: [DoctorNumber]

Signature: ................................................

Date: [SignatureDate]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
  },
  {
    name: "General Letterhead",
    description: "Blank letterhead template for custom documents",
    category: "General",
    content: `[DOCUMENT TITLE]
================

Practice Number: [PracticeNumber]
Doctor Registration Number: [DoctorNumber]
Practice Address: [PracticeAddress]

Date: [Date]

[Content]




Signature: ................................................

[DoctorName]
Date: [SignatureDate]`,
    logo_url: null,
    logo_position: null,
    font_family: "sans",
    is_default: true,
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
      }));
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

    const newTemplate = {
      ...data,
      logo_position: data.logo_position as { x: number; y: number } | null,
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

    const updatedTemplate = {
      ...data,
      logo_position: data.logo_position as { x: number; y: number } | null,
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
