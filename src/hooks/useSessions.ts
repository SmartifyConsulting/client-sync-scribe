import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';

export interface Session {
  id: string;
  user_id: string;
  patient_id: string;
  title: string | null;
  notes: string | null;
  transcript: string | null;
  summary: string | null;
  action_points: string[];
  audio_url: string | null;
  duration_minutes: number | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  patient?: {
    id: string;
    name: string;
  };
}

// Helper to transform database session to our Session type
const transformSession = (dbSession: any): Session => ({
  ...dbSession,
  action_points: Array.isArray(dbSession.action_points) 
    ? dbSession.action_points.map((ap: Json) => String(ap))
    : [],
});

export function useSessions(patientId?: string) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('sessions')
        .select(`
          *,
          patient:patients(id, name)
        `)
        .order('started_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setSessions((data || []).map(transformSession));
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (patientId: string, title?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          patient_id: patientId,
          title: title || `Session - ${new Date().toLocaleDateString()}`,
          status: 'in_progress',
        })
        .select(`
          *,
          patient:patients(id, name)
        `)
        .single();

      if (error) throw error;
      
      const transformedData = transformSession(data);
      setSessions((prev) => [transformedData, ...prev]);
      toast({ title: 'Session Started', description: 'New session has been created' });
      return transformedData;
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create session',
        variant: 'destructive',
      });
      return null;
    }
  };

  const updateSession = async (id: string, updates: Partial<Omit<Session, 'action_points'>> & { action_points?: string[] }) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          patient:patients(id, name)
        `)
        .single();

      if (error) throw error;
      
      const transformedData = transformSession(data);
      setSessions((prev) => prev.map((s) => (s.id === id ? transformedData : s)));
      return transformedData;
    } catch (error: any) {
      console.error('Error updating session:', error);
      toast({
        title: 'Error',
        description: 'Failed to update session',
        variant: 'destructive',
      });
      return null;
    }
  };

const completeSession = async (
    id: string | null, 
    content: string, 
    additionalNotes?: string, 
    visitCategory?: string,
    creationData?: { patient_id: string; title: string; started_at: string; audio_url?: string }
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Combine transcript and notes for AI analysis
      const fullContent = additionalNotes 
        ? `${content}\n\nAdditional Notes:\n${additionalNotes}`
        : content;

      console.log('Completing session with content length:', fullContent?.length);

      // Fetch user's preferred language for AI responses
      const { data: profileData } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .maybeSingle();
      const preferredLanguage = profileData?.preferred_language || undefined;

      // Generate AI summary from transcript/notes
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('summarize-session', {
        body: { notes: additionalNotes, transcript: content, language: preferredLanguage },
      });

      if (summaryError) {
        console.error('AI summary error:', summaryError);
      }

      console.log('Summary data received:', JSON.stringify(summaryData, null, 2));
      console.log('Action points from summary:', summaryData?.action_points);

      const now = new Date().toISOString();
      const startedAt = creationData?.started_at || now;
      const durationMinutes = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
      const patientId = creationData?.patient_id || '';

      const sessionRecord: any = {
        user_id: user.id,
        patient_id: patientId,
        title: creationData?.title || `Session - ${new Date().toLocaleDateString()}`,
        transcript: content,
        notes: additionalNotes || null,
        status: 'completed',
        started_at: startedAt,
        ended_at: now,
        duration_minutes: durationMinutes,
        audio_url: creationData?.audio_url || null,
      };

      if (summaryData && !summaryData.error) {
        sessionRecord.summary = summaryData.summary;
        sessionRecord.action_points = summaryData.action_points || [];
      }

      // Store extracted documents metadata for return
      const extractedDocuments = {
        medical_certificate: summaryData?.medical_certificate || null,
        prescription: summaryData?.prescription || null,
        invoice: summaryData?.invoice || null,
        referral: summaryData?.referral || null,
        hospital_admission: summaryData?.hospital_admission || null,
      };

      let sessionId = id;
      let resultData: any;

      if (sessionId) {
        // Update existing session
        const { data, error } = await supabase
          .from('sessions')
          .update(sessionRecord)
          .eq('id', sessionId)
          .select(`*, patient:patients(id, name)`)
          .single();
        if (error) throw error;
        resultData = data;
      } else {
        // Insert new session directly as completed
        const { data, error } = await supabase
          .from('sessions')
          .insert(sessionRecord)
          .select(`*, patient:patients(id, name)`)
          .single();
        if (error) throw error;
        resultData = data;
        sessionId = resultData.id;
      }

      const transformedData = { ...transformSession(resultData), _extractedDocuments: extractedDocuments };
      setSessions((prev) => {
        const exists = prev.some(s => s.id === sessionId);
        if (exists) return prev.map(s => s.id === sessionId ? transformedData : s);
        return [transformedData, ...prev];
      });

      // Auto-execute action points via process-todo-actions
      if (summaryData?.action_points?.length > 0) {
        const actionPointsText = summaryData.action_points.join('. ');
        console.log('Auto-executing action points via process-todo-actions:', actionPointsText);
        
        try {
          const { data: processResult, error: processError } = await supabase.functions.invoke('process-todo-actions', {
            body: { text: actionPointsText },
          });
          
          if (processError) {
            console.error('Error auto-executing action points:', processError);
            // Fallback: save as pending todos
            const todosToInsert = summaryData.action_points.map((point: string) => ({
              user_id: user.id,
              session_id: sessionId,
              patient_id: patientId || null,
              title: point,
              priority: 'medium',
              status: 'pending',
            }));
            await supabase.from('todos').insert(todosToInsert);
          } else {
            console.log('Auto-execution result:', processResult);
            const autoCount = processResult?.results?.filter((r: any) => r.auto_executed).length || 0;
            const manualCount = processResult?.results?.filter((r: any) => !r.auto_executed).length || 0;
            if (autoCount > 0) {
              toast({ title: `✅ ${autoCount} task(s) auto-completed`, description: `${manualCount > 0 ? `${manualCount} task(s) need manual attention` : 'All tasks handled automatically'}` });
            }
          }
        } catch (execError) {
          console.error('Failed to invoke process-todo-actions:', execError);
          // Fallback: save as pending todos
          const todosToInsert = summaryData.action_points.map((point: string) => ({
            user_id: user.id,
            session_id: sessionId,
            patient_id: patientId || null,
            title: point,
            priority: 'medium',
            status: 'pending',
          }));
          await supabase.from('todos').insert(todosToInsert);
        }
      }

      // Auto-create hospital admission document if detected
      if (summaryData?.hospital_admission && patientId) {
        try {
          const admission = summaryData.hospital_admission;
          const [patientRes, profileRes, templateRes] = await Promise.all([
            supabase.from('patients').select('name').eq('id', patientId).maybeSingle(),
            supabase.from('profiles').select('full_name, practice_number, doctor_number, specialty').eq('id', user.id).maybeSingle(),
            supabase.from('templates').select('id, name, content, header_footer_template_id').eq('user_id', user.id),
          ]);

          const patientRecord = patientRes.data;
          const profileData = profileRes.data;
          const doctorTemplates = templateRes.data || [];

          const today = new Date().toISOString().split('T')[0];

          // Try to use doctor's Hospital Admission template
          const admissionTemplate = doctorTemplates.find(t => 
            t.name.toLowerCase().includes('hospital admission') || t.name.toLowerCase().includes('admission')
          );

          let admissionContent: string;
          if (admissionTemplate) {
            const replacements: Record<string, string> = {
              'ClientName': patientRecord?.name || 'Unknown',
              'PatientName': patientRecord?.name || 'Unknown',
              'Patient Name': patientRecord?.name || 'Unknown',
              'Date': today,
              'SessionDate': today,
              'DoctorName': profileData?.full_name || '',
              'PracticeNumber': profileData?.practice_number || '',
              'RegistrationNumber': profileData?.doctor_number || '',
              'AdmissionDate': admission.admission_date || 'TBD',
              'Hospital': admission.hospital_name || 'TBD',
              'Diagnosis': admission.diagnosis || '',
              'Procedure': admission.procedure || 'To be determined',
              'SpecialInstructions': admission.special_instructions || 'None',
            };
            admissionContent = admissionTemplate.content;
            for (const [key, value] of Object.entries(replacements)) {
              admissionContent = admissionContent.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
            }
          } else {
            admissionContent = `<h2>Hospital Admission Form</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>Patient:</strong> ${patientRecord?.name || 'Unknown'}</p>
<p><strong>Doctor:</strong> ${profileData?.full_name || ''}</p>
<p><strong>Practice Number:</strong> ${profileData?.practice_number || ''}</p>
<p><strong>Registration Number:</strong> ${profileData?.doctor_number || ''}</p>
<br/>
<h3>Admission Details</h3>
<p><strong>Admission Date:</strong> ${admission.admission_date || 'TBD'}</p>
<p><strong>Hospital:</strong> ${admission.hospital_name || 'TBD'}</p>
<br/>
<h3>Diagnosis</h3>
<p>${admission.diagnosis}</p>
<br/>
<h3>Procedure</h3>
<p>${admission.procedure || 'To be determined'}</p>
<br/>
<h3>Special Instructions</h3>
<p>${admission.special_instructions || 'None'}</p>`;
          }

          const { data: admissionDoc } = await supabase.from('documents').insert({
            user_id: user.id,
            patient_id: patientId,
            name: `Hospital Admission - ${patientRecord?.name || 'Patient'} - ${today}`,
            content: admissionContent,
            template_name: 'Hospital Admission Form',
            patient_name: patientRecord?.name || null,
            is_draft: true,
            session_id: sessionId,
          } as any).select('id').single();
          console.log('Hospital admission document auto-created');

          // Create review todo for the draft document
          if (admissionDoc) {
            await supabase.from('todos').insert({
              user_id: user.id,
              session_id: sessionId,
              patient_id: patientId,
              title: `Review & Send: Hospital Admission - ${patientRecord?.name || 'Patient'}`,
              document_id: admissionDoc.id,
              task_type: 'document_review',
              priority: 'high',
              status: 'pending',
            } as any);
          }
          toast({ title: '🏥 Admission Form Created', description: 'Hospital admission form was auto-generated from the session' });
        } catch (admError) {
          console.error('Error creating admission document:', admError);
        }
      }

      // Auto-create prescription document if detected
      if (summaryData?.prescription && patientId) {
        try {
          const rx = summaryData.prescription;
          const medications = rx.medications || rx.items || [];
          if (medications.length > 0 || rx.medication) {
            const [patientRes, profileRes, templateRes] = await Promise.all([
              supabase.from('patients').select('name').eq('id', patientId).maybeSingle(),
              supabase.from('profiles').select('full_name, practice_number, doctor_number, specialty').eq('id', user.id).maybeSingle(),
              supabase.from('templates').select('id, name, content, header_footer_template_id').eq('user_id', user.id),
            ]);

            const patientRecord = patientRes.data;
            const docProfile = profileRes.data;
            const doctorTemplates = templateRes.data || [];
            const today = new Date().toISOString().split('T')[0];

            const rxTemplate = doctorTemplates.find(t =>
              t.name.toLowerCase().includes('prescription')
            );

            let rxContent: string;
            if (rxTemplate) {
              const replacements: Record<string, string> = {
                'ClientName': patientRecord?.name || 'Unknown',
                'PatientName': patientRecord?.name || 'Unknown',
                'Patient Name': patientRecord?.name || 'Unknown',
                'Date': today,
                'SessionDate': today,
                'DoctorName': docProfile?.full_name || '',
                'PracticeNumber': docProfile?.practice_number || '',
                'RegistrationNumber': docProfile?.doctor_number || '',
              };
              rxContent = rxTemplate.content;
              for (const [key, value] of Object.entries(replacements)) {
                rxContent = rxContent.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
              }
              // Append medications list
              const medsList = (medications.length > 0 ? medications : [{ medication: rx.medication, dosage: rx.dosage, frequency: rx.frequency, instructions: rx.instructions }])
                .map((m: any) => `<p><strong>${m.medication || m.name}</strong> — ${m.dosage || ''} ${m.frequency || ''} ${m.instructions ? `(${m.instructions})` : ''}</p>`)
                .join('');
              rxContent += `\n${medsList}`;
            } else {
              const medsHtml = (medications.length > 0 ? medications : [{ medication: rx.medication, dosage: rx.dosage, frequency: rx.frequency, instructions: rx.instructions }])
                .map((m: any) => `<tr><td>${m.medication || m.name || ''}</td><td>${m.dosage || ''}</td><td>${m.frequency || ''}</td><td>${m.instructions || ''}</td></tr>`)
                .join('');
              rxContent = `<h2>Prescription</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>Patient:</strong> ${patientRecord?.name || 'Unknown'}</p>
<p><strong>Doctor:</strong> ${docProfile?.full_name || ''}</p>
<p><strong>Practice Number:</strong> ${docProfile?.practice_number || ''}</p>
<br/>
<table><thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Instructions</th></tr></thead><tbody>${medsHtml}</tbody></table>`;
            }

            const { data: rxDoc } = await supabase.from('documents').insert({
              user_id: user.id,
              patient_id: patientId,
              name: `Prescription - ${patientRecord?.name || 'Patient'} - ${today}`,
              content: rxContent,
              template_name: 'Prescription',
              patient_name: patientRecord?.name || null,
              is_draft: true,
              session_id: sessionId,
            } as any).select('id').single();
            console.log('Prescription document auto-created');

            if (rxDoc) {
              await supabase.from('todos').insert({
                user_id: user.id,
                session_id: sessionId,
                patient_id: patientId,
                title: `Review & Send: Prescription - ${patientRecord?.name || 'Patient'}`,
                document_id: rxDoc.id,
                task_type: 'document_review',
                priority: 'high',
                status: 'pending',
              } as any);
            }
            toast({ title: '💊 Prescription Created', description: 'Prescription was auto-generated from the session' });
          }
        } catch (rxError) {
          console.error('Error creating prescription document:', rxError);
        }
      }

      // Auto-create medical certificate if detected
      if (summaryData?.medical_certificate && patientId) {
        try {
          const cert = summaryData.medical_certificate;
          const [patientRes, profileRes, templateRes] = await Promise.all([
            supabase.from('patients').select('name').eq('id', patientId).maybeSingle(),
            supabase.from('profiles').select('full_name, practice_number, doctor_number, specialty').eq('id', user.id).maybeSingle(),
            supabase.from('templates').select('id, name, content').eq('user_id', user.id),
          ]);

          const patientRecord = patientRes.data;
          const docProfile = profileRes.data;
          const doctorTemplates = templateRes.data || [];
          const today = new Date().toISOString().split('T')[0];

          const certTemplate = doctorTemplates.find(t =>
            t.name.toLowerCase().includes('medical certificate')
          );

          let certContent: string;
          if (certTemplate) {
            const replacements: Record<string, string> = {
              'ClientName': patientRecord?.name || 'Unknown',
              'PatientName': patientRecord?.name || 'Unknown',
              'Patient Name': patientRecord?.name || 'Unknown',
              'Date': today,
              'SessionDate': today,
              'DoctorName': docProfile?.full_name || '',
              'PracticeNumber': docProfile?.practice_number || '',
              'RegistrationNumber': docProfile?.doctor_number || '',
              'Diagnosis': cert.diagnosis || '',
              'FromDate': cert.from_date || today,
              'ToDate': cert.to_date || today,
              'Reason': cert.reason || '',
            };
            certContent = certTemplate.content;
            for (const [key, value] of Object.entries(replacements)) {
              certContent = certContent.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
            }
          } else {
            certContent = `<h2>Medical Certificate</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>Patient:</strong> ${patientRecord?.name || 'Unknown'}</p>
<p><strong>Doctor:</strong> ${docProfile?.full_name || ''}</p>
<p><strong>Practice Number:</strong> ${docProfile?.practice_number || ''}</p>
<br/>
<p>This is to certify that ${patientRecord?.name || 'the patient'} was examined on ${today} and is unfit for duty from <strong>${cert.from_date || today}</strong> to <strong>${cert.to_date || today}</strong>.</p>
<br/>
<p><strong>Diagnosis:</strong> ${cert.diagnosis || 'As discussed'}</p>
<p><strong>Reason:</strong> ${cert.reason || ''}</p>`;
          }

          const { data: certDoc } = await supabase.from('documents').insert({
            user_id: user.id,
            patient_id: patientId,
            name: `Medical Certificate - ${patientRecord?.name || 'Patient'} - ${today}`,
            content: certContent,
            template_name: 'Medical Certificate',
            patient_name: patientRecord?.name || null,
            is_draft: true,
            session_id: sessionId,
          } as any).select('id').single();
          console.log('Medical certificate document auto-created');

          if (certDoc) {
            await supabase.from('todos').insert({
              user_id: user.id,
              session_id: sessionId,
              patient_id: patientId,
              title: `Review & Send: Medical Certificate - ${patientRecord?.name || 'Patient'}`,
              document_id: certDoc.id,
              task_type: 'document_review',
              priority: 'high',
              status: 'pending',
            } as any);
          }
          toast({ title: '📋 Medical Certificate Created', description: 'Medical certificate was auto-generated from the session' });
        } catch (certError) {
          console.error('Error creating medical certificate document:', certError);
        }
      }

      // Auto-create referral letter if detected
      if (summaryData?.referral && patientId) {
        try {
          const ref = summaryData.referral;
          const [patientRes, profileRes, templateRes] = await Promise.all([
            supabase.from('patients').select('name').eq('id', patientId).maybeSingle(),
            supabase.from('profiles').select('full_name, practice_number, doctor_number, specialty').eq('id', user.id).maybeSingle(),
            supabase.from('templates').select('id, name, content').eq('user_id', user.id),
          ]);

          const patientRecord = patientRes.data;
          const docProfile = profileRes.data;
          const doctorTemplates = templateRes.data || [];
          const today = new Date().toISOString().split('T')[0];

          const refTemplate = doctorTemplates.find(t =>
            t.name.toLowerCase().includes('referral')
          );

          let refContent: string;
          if (refTemplate) {
            const replacements: Record<string, string> = {
              'ClientName': patientRecord?.name || 'Unknown',
              'PatientName': patientRecord?.name || 'Unknown',
              'Patient Name': patientRecord?.name || 'Unknown',
              'Date': today,
              'SessionDate': today,
              'DoctorName': docProfile?.full_name || '',
              'PracticeNumber': docProfile?.practice_number || '',
              'RegistrationNumber': docProfile?.doctor_number || '',
              'ReferralDoctor': ref.referred_to || '',
              'ReferralReason': ref.reason || '',
              'Diagnosis': ref.diagnosis || '',
            };
            refContent = refTemplate.content;
            for (const [key, value] of Object.entries(replacements)) {
              refContent = refContent.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
            }
          } else {
            refContent = `<h2>Referral Letter</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>From:</strong> ${docProfile?.full_name || ''} (${docProfile?.specialty || ''})</p>
<p><strong>Practice Number:</strong> ${docProfile?.practice_number || ''}</p>
<br/>
<p><strong>To:</strong> ${ref.referred_to || 'Specialist'}</p>
<br/>
<p>Dear Colleague,</p>
<p>I am referring <strong>${patientRecord?.name || 'the patient'}</strong> for your expert opinion regarding:</p>
<p>${ref.reason || ref.diagnosis || 'As discussed during consultation'}</p>
<br/>
<p><strong>Clinical Notes:</strong> ${ref.clinical_notes || ''}</p>`;
          }

          const { data: refDoc } = await supabase.from('documents').insert({
            user_id: user.id,
            patient_id: patientId,
            name: `Referral Letter - ${patientRecord?.name || 'Patient'} - ${today}`,
            content: refContent,
            template_name: 'Referral Letter',
            patient_name: patientRecord?.name || null,
            is_draft: true,
            session_id: sessionId,
          } as any).select('id').single();
          console.log('Referral letter document auto-created');

          if (refDoc) {
            await supabase.from('todos').insert({
              user_id: user.id,
              session_id: sessionId,
              patient_id: patientId,
              title: `Review & Send: Referral Letter - ${patientRecord?.name || 'Patient'}`,
              document_id: refDoc.id,
              task_type: 'document_review',
              priority: 'high',
              status: 'pending',
            } as any);
          }
          toast({ title: '📨 Referral Letter Created', description: 'Referral letter was auto-generated from the session' });
        } catch (refError) {
          console.error('Error creating referral document:', refError);
        }
      }

      // Auto-generate invoice after session completion
      if (patientId) {
        try {
          const [patientRes, profileRes, templateRes] = await Promise.all([
            supabase.from('patients').select('name').eq('id', patientId).maybeSingle(),
            supabase.from('profiles').select('full_name, practice_number, doctor_number, practice_address').eq('id', user.id).maybeSingle(),
            supabase.from('templates').select('id, name, content').eq('user_id', user.id),
          ]);

          const patientRecord = patientRes.data;
          const docProfile = profileRes.data;
          const doctorTemplates = templateRes.data || [];
          const today = new Date().toISOString().split('T')[0];

          const invoiceTemplate = doctorTemplates.find(t =>
            t.name.toLowerCase().includes('invoice')
          );

          let invoiceContent: string;
          if (invoiceTemplate) {
            const replacements: Record<string, string> = {
              'ClientName': patientRecord?.name || 'Unknown',
              'PatientName': patientRecord?.name || 'Unknown',
              'Date': today,
              'SessionDate': today,
              'DoctorName': docProfile?.full_name || '',
              'PracticeNumber': docProfile?.practice_number || '',
              'PracticeAddress': docProfile?.practice_address || '',
            };
            invoiceContent = invoiceTemplate.content;
            for (const [key, value] of Object.entries(replacements)) {
              invoiceContent = invoiceContent.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
            }
          } else {
            invoiceContent = `<h2>Invoice</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>Patient:</strong> ${patientRecord?.name || 'Unknown'}</p>
<p><strong>Doctor:</strong> ${docProfile?.full_name || ''}</p>
<p><strong>Practice Number:</strong> ${docProfile?.practice_number || ''}</p>
<br/>
<p><strong>Description:</strong> Consultation on ${today}</p>
<p><strong>Amount:</strong> [To be completed]</p>`;
          }

          const { data: invoiceDoc } = await supabase.from('documents').insert({
            user_id: user.id,
            patient_id: patientId,
            name: `Invoice - ${patientRecord?.name || 'Patient'} - ${today}`,
            content: invoiceContent,
            template_name: 'Invoice',
            patient_name: patientRecord?.name || null,
            is_draft: true,
            session_id: sessionId,
          } as any).select('id').single();
          console.log('Invoice document auto-created');

          if (invoiceDoc) {
            await supabase.from('todos').insert({
              user_id: user.id,
              session_id: sessionId,
              patient_id: patientId,
              title: `Review & Send: Invoice - ${patientRecord?.name || 'Patient'}`,
              document_id: invoiceDoc.id,
              task_type: 'document_review',
              priority: 'high',
              status: 'pending',
            } as any);
          }
          toast({ title: '🧾 Invoice Created', description: 'Invoice was auto-generated for review' });
        } catch (invError) {
          console.error('Error creating invoice document:', invError);
        }
      }

      if (visitCategory && patientId) {
        const { data: configData } = await supabase
          .from('gamification_config')
          .select('lollipops_awarded')
          .eq('visit_category', visitCategory)
          .eq('is_active', true)
          .maybeSingle();
        
        const lollipopsToAward = configData?.lollipops_awarded || 1;

        const { data: patientData } = await supabase
          .from('patients')
          .select('patient_user_id')
          .eq('id', patientId)
          .maybeSingle();

        const { data: rewardData, error: rewardError } = await supabase
          .from('patient_rewards')
          .insert({
            patient_id: patientId,
            session_id: sessionId,
            reward_type: 'lollipop',
            visit_category: visitCategory,
            lollipops_count: lollipopsToAward,
            awarded_by: user.id,
          })
          .select()
          .single();

        if (rewardError) {
          console.error('Error awarding moola:', rewardError);
        } else {
          console.log('Moola awarded for:', visitCategory, 'count:', lollipopsToAward);
          
          if (patientData?.patient_user_id) {
            await supabase.from('notifications').insert({
              user_id: patientData.patient_user_id,
              title: `Ⓜ️ You earned ${lollipopsToAward} Moola${lollipopsToAward > 1 ? 's' : ''}!`,
              description: `Great job! You received ${lollipopsToAward} Moola${lollipopsToAward > 1 ? 's' : ''} for your ${visitCategory}.`,
              type: 'reward',
              reference_id: rewardData.id,
            });
          }

          toast({ 
            title: `Ⓜ️ ${lollipopsToAward} Moola${lollipopsToAward > 1 ? 's' : ''} Awarded!`, 
            description: `Patient earned ${lollipopsToAward} Moola${lollipopsToAward > 1 ? 's' : ''} for their ${visitCategory}` 
          });
        }
      }

      toast({ title: 'Session Completed', description: 'Session saved with AI summary and action items added to to-do list' });
      return transformedData;
    } catch (error: any) {
      console.error('Error completing session:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete session',
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteSession = async (id: string) => {
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', id);

      if (error) throw error;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Success', description: 'Session deleted successfully' });
      return true;
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete session',
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [patientId]);

  return {
    sessions,
    loading,
    fetchSessions,
    createSession,
    updateSession,
    completeSession,
    deleteSession,
  };
}

export function useSession(id: string) {
  const { toast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sessions')
          .select(`
            *,
            patient:patients(id, name)
          `)
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        
        if (data) {
          setSession(transformSession(data));
        }
      } catch (error: any) {
        console.error('Error fetching session:', error);
        toast({
          title: 'Error',
          description: 'Failed to load session',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchSession();
  }, [id]);

  return { session, loading };
}