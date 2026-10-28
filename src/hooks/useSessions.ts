import { useState, useEffect } from 'react';
import { buildGreeting } from '@/lib/greeting';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logger';
import { useToast } from '@/hooks/use-toast';
import type { Json } from '@/integrations/supabase/types';
import { classifyTask } from '@/lib/taskAssignee';

export interface Session {
  id: string;
  user_id: string;
  patient_id: string;
  title: string | null;
  notes: string | null;
  private_notes: string | null;
  transcript: string | null;
  summary: string | null;
  ai_diagnosis: string | null;
  action_points: string[];
  audio_url: string | null;
  duration_minutes: number | null;
  status: 'in_progress' | 'completed' | 'cancelled';
  started_at: string;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
    allergies?: string | null;
    current_medications?: Json | null;
    conditions_diagnoses?: Json | null;
  };
}

// Helper to notify client when a task is assigned to them
const notifyClientOfTask = async (clientId: string, taskTitle: string, taskId: string) => {
  try {
    const { data: client } = await supabase.from('clients').select('patient_user_id').eq('id', clientId).maybeSingle();
    if (client?.patient_user_id) {
      await supabase.from('notifications').insert({
        user_id: client.patient_user_id,
        title: `📋 New task assigned: ${taskTitle}`,
        description: 'You have been assigned a new task by your healthcare provider.',
        type: 'task_assigned',
        reference_id: taskId,
      });
    }
  } catch (err) { console.error('Error sending task notification:', err); }
};

// Saves session action points as todos, routing each one to the advisor or the
// client. Medication/prescription instructions are dropped — the prescription
// document and medication adherence module already cover them.
const insertActionPointTodos = async (
  actionPoints: string[],
  userId: string,
  sessionId: string,
  clientId?: string | null,
) => {
  const rows = actionPoints
    .map((point) => ({ point, owner: classifyTask(point) }))
    .filter((r) => r.owner !== 'skip')
    .map((r) => ({
      user_id: userId,
      session_id: sessionId,
      patient_id: clientId || null,
      title: r.point,
      priority: 'medium',
      status: 'pending',
      assignee: r.owner,
    }));
  if (rows.length === 0) return;
  await supabase.from('todos').insert(rows as any);
  if (clientId) {
    for (const row of rows) {
      if (row.assignee === 'client') await notifyClientOfTask(clientId, row.title, sessionId);
    }
  }
};


// Helper to transform database session to our Session type
const transformSession = (dbSession: any): Session => ({
  ...dbSession,
  action_points: Array.isArray(dbSession.action_points) 
    ? dbSession.action_points.map((ap: Json) => String(ap))
    : [],
});

export function useSessions(clientId?: string) {
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
          client:clients(id, name, allergies, current_medications, conditions_diagnoses)
        `)
        // Paused drafts are resumable work-in-progress, never session history.
        .neq('status', 'paused')
        .order('started_at', { ascending: false });

      if (clientId) {
        query = query.eq('patient_id', clientId);
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

  const createSession = async (clientId: string, title?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: user.id,
          patient_id: clientId,
          title: title || `Session - ${new Date().toLocaleDateString()}`,
          status: 'in_progress',
        })
        .select(`
          *,
          client:clients(id, name)
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
          client:clients(id, name)
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
    creationData?: { patient_id: string; title: string; started_at: string; audio_url?: string },
    privateNotes?: string,
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Combine transcript and notes for AI analysis
      const fullContent = additionalNotes 
        ? `${content}\n\nAdditional Notes:\n${additionalNotes}`
        : content;

      logger.debug('Completing session with content length:', fullContent?.length);

      // Fetch user's preferred language for AI responses
      const { data: profileData } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', user.id)
        .maybeSingle();
      const preferredLanguage = profileData?.preferred_language || undefined;

      // Generate AI summary from transcript/notes
      const { clientDateContext } = await import('@/lib/clientDate');
      const dateCtx = clientDateContext();
      const { data: summaryData, error: summaryError } = await supabase.functions.invoke('summarize-session', {
        body: { notes: additionalNotes, transcript: content, language: preferredLanguage, ...dateCtx },
      });

      if (summaryError) {
        console.error('AI summary error:', summaryError);
      }

      logger.debug('Summary data received:', JSON.stringify(summaryData, null, 2));
      logger.debug('Action points from summary:', summaryData?.action_points);

      const now = new Date().toISOString();
      const startedAt = creationData?.started_at || now;
      const durationMinutes = Math.round((Date.now() - new Date(startedAt).getTime()) / 60000);
      const clientId = creationData?.patient_id || '';

      const sessionRecord: any = {
        user_id: user.id,
        patient_id: clientId,
        title: creationData?.title || `Session - ${new Date().toLocaleDateString()}`,
        transcript: content,
        notes: additionalNotes || null,
        private_notes: privateNotes || null,
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
        referral: summaryData?.referral || null,
        hospital_admission: summaryData?.hospital_admission || null,
        follow_up_appointment: summaryData?.follow_up_appointment || null,
      };

      let sessionId = id;
      let resultData: any;

      if (sessionId) {
        // Update existing session
        const { data, error } = await supabase
          .from('sessions')
          .update(sessionRecord)
          .eq('id', sessionId)
          .select(`*, client:clients(id, name)`)
          .single();
        if (error) throw error;
        resultData = data;
      } else {
        // Insert new session directly as completed
        const { data, error } = await supabase
          .from('sessions')
          .insert(sessionRecord)
          .select(`*, client:clients(id, name)`)
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

      // The transcript itself becomes a document alongside the generated ones.
      if (sessionId && (content || '').trim()) {
        const { saveSessionTranscriptDocument } = await import('@/features/sessions/lib/transcriptDocument');
        await saveSessionTranscriptDocument({
          userId: user.id,
          sessionId,
          clientId: clientId || null,
          clientName: resultData?.client?.name || null,
          transcript: content,
          sessionTitle: sessionRecord.title,
          sessionDate: startedAt,
        });
      }

      // Auto-execute action points via process-todo-actions
      if (summaryData?.action_points?.length > 0) {
        const actionPointsText = summaryData.action_points.join('. ');
        logger.debug('Auto-executing action points via process-todo-actions:', actionPointsText);
        
        try {
          const { data: processResult, error: processError } = await supabase.functions.invoke('process-todo-actions', {
            body: { text: actionPointsText, session_id: sessionId, ...dateCtx },
          });
          
          if (processError) {
            console.error('Error auto-executing action points:', processError);
            // Fallback: save as pending todos, routed to the right owner
            await insertActionPointTodos(summaryData.action_points, user.id, sessionId!, clientId);
          } else {
            logger.debug('Auto-execution result:', processResult);
            const autoCount = processResult?.results?.filter((r: any) => r.auto_executed).length || 0;
            const manualCount = processResult?.results?.filter((r: any) => !r.auto_executed).length || 0;
            if (autoCount > 0) {
              toast({ title: `✅ ${autoCount} task(s) auto-completed`, description: `${manualCount > 0 ? `${manualCount} task(s) need manual attention` : 'All tasks handled automatically'}` });
            }
          }
        } catch (execError) {
          console.error('Failed to invoke process-todo-actions:', execError);
          // Fallback: save as pending todos, routed to the right owner
          await insertActionPointTodos(summaryData.action_points, user.id, sessionId!, clientId);
        }

      }

      // Auto-create hospital admission document if detected
      if (summaryData?.hospital_admission && clientId) {
        try {
          const admission = summaryData.hospital_admission;
          const [patientRes, profileRes, templateRes] = await Promise.all([
            supabase.from('clients').select('name, physical_address, address, medical_aid, medical_aid_number, id_passport_number, dob, phone, email').eq('id', clientId).maybeSingle(),
            supabase.from('profiles').select('full_name, practice_number, doctor_number, specialty, practice_address').eq('id', user.id).maybeSingle(),
            supabase.from('templates').select('id, name, content, header_footer_template_id').eq('user_id', user.id),
          ]);

          const patientRecord = patientRes.data;
          const profileData = profileRes.data;
          const doctorTemplates = templateRes.data || [];

          const today = new Date().toISOString().split('T')[0];

          // Try to use advisor's Hospital Admission template
          const admissionTemplate = doctorTemplates.find(t => 
            t.name.toLowerCase().includes('hospital admission') || t.name.toLowerCase().includes('admission')
          );

          let admissionContent: string;
          if (admissionTemplate) {
            const replacements: Record<string, string> = {
              'ClientName': patientRecord?.name || 'Unknown',
              'PatientName': patientRecord?.name || 'Unknown',
              'Client Name': patientRecord?.name || 'Unknown',
              'Date': today,
              'SessionDate': today,
              'DoctorName': profileData?.full_name || '',
              'AdvisorName': profileData?.full_name || '',
              'DoctorNumber': profileData?.doctor_number || '',
              'PracticeNumber': profileData?.practice_number || '',
              'RegistrationNumber': profileData?.doctor_number || '',
              'PracticeAddress': (profileData as any)?.practice_address || '',
              'PatientAddress': (patientRecord as any)?.physical_address || (patientRecord as any)?.address || '',
              'ClientAddress': (patientRecord as any)?.physical_address || (patientRecord as any)?.address || '',
              'MedicalAid': (patientRecord as any)?.medical_aid || '',
              'MedicalAidNumber': (patientRecord as any)?.medical_aid_number || '',
              'IDNumber': (patientRecord as any)?.id_passport_number || '',
              'DOB': (patientRecord as any)?.dob || '',
              'Phone': (patientRecord as any)?.phone || '',
              'Email': (patientRecord as any)?.email || '',
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
            admissionContent = admissionContent.replace(/\[[A-Za-z][A-Za-z0-9_ -]*\]/g, '___');
          } else {
            admissionContent = `<h2>Hospital Admission Form</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>Client:</strong> ${patientRecord?.name || 'Unknown'}</p>
<p><strong>Advisor:</strong> ${profileData?.full_name || ''}</p>
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
            patient_id: clientId,
            name: `Hospital Admission - ${patientRecord?.name || 'Client'} - ${today}`,
            content: admissionContent,
            template_name: 'Hospital Admission Form',
            patient_name: patientRecord?.name || null,
            is_draft: true,
            session_id: sessionId,
          } as any).select('id').single();
          logger.debug('Hospital admission document auto-created');

          // Create review todo for the draft document
          if (admissionDoc) {
            await supabase.from('todos').insert({
              user_id: user.id,
              session_id: sessionId,
              patient_id: clientId,
              title: `Review Hospital Admission - ${patientRecord?.name || 'Client'}`,
              document_id: admissionDoc.id,
              task_type: 'document_review',
              priority: 'high',
              status: 'pending',
            } as any);
          }
        } catch (admError) {
          console.error('Error creating admission document:', admError);
        }
      }

      // Auto-create prescription document if detected
      if (summaryData?.prescription && clientId) {
        try {
          const rx = summaryData.prescription;
          const medications = rx.medications || rx.items || [];
          if (medications.length > 0 || rx.medication) {
            const [patientRes, profileRes, templateRes] = await Promise.all([
              supabase.from('clients').select('name, physical_address, address, medical_aid, medical_aid_number, id_passport_number, dob, phone, email, allergies, pharmacy_name').eq('id', clientId).maybeSingle(),
              supabase.from('profiles').select('full_name, practice_number, doctor_number, specialty, practice_address').eq('id', user.id).maybeSingle(),
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
              const medsArr: any[] = medications.length > 0
                ? medications
                : [{ medication: rx.medication, dosage: rx.dosage, frequency: rx.frequency, instructions: rx.instructions }];

              const replacements: Record<string, string> = {
                'ClientName': patientRecord?.name || 'Unknown',
                'PatientName': patientRecord?.name || 'Unknown',
                'Client Name': patientRecord?.name || 'Unknown',
                'Date': today,
                'SessionDate': today,
                'PrescriptionDate': today,
                'DoctorName': docProfile?.full_name || '',
                'AdvisorName': docProfile?.full_name || '',
                'DoctorNumber': docProfile?.doctor_number || '',
                'PracticeNumber': docProfile?.practice_number || '',
                'RegistrationNumber': docProfile?.doctor_number || '',
                'PracticeAddress': docProfile?.practice_address || '',
                'PatientAddress': (patientRecord as any)?.physical_address || (patientRecord as any)?.address || '',
              'ClientAddress': (patientRecord as any)?.physical_address || (patientRecord as any)?.address || '',
                'MedicalAid': (patientRecord as any)?.medical_aid || '',
                'MedicalAidNumber': (patientRecord as any)?.medical_aid_number || '',
                'IDNumber': (patientRecord as any)?.id_passport_number || '',
                'DOB': (patientRecord as any)?.dob || '',
                'Phone': (patientRecord as any)?.phone || '',
                'Email': (patientRecord as any)?.email || '',
                'Allergies': (patientRecord as any)?.allergies || 'None known',
                'Pharmacy': (patientRecord as any)?.pharmacy_name || '',
                'Repeats': String(rx.repeats ?? ''),
                'NumberOfRepeats': String(rx.repeats ?? ''),
                'SpecialInstructions': rx.special_instructions || rx.notes || '',
              };

              // Indexed medication slots (1..max(3, medsArr.length)) — known slot keys
              const slotMax = Math.max(3, medsArr.length);
              const slotKeys = new Set<string>();
              for (let i = 1; i <= slotMax; i++) {
                const m = medsArr[i - 1];
                replacements[`Medication${i}`] = m?.medication || m?.name || '';
                replacements[`Dosage${i}`] = m?.dosage || '';
                replacements[`Quantity${i}`] = m?.quantity || '';
                replacements[`Frequency${i}`] = m?.frequency || '';
                replacements[`Instructions${i}`] = m?.instructions || '';
                slotKeys.add(`Medication${i}`.toLowerCase());
                slotKeys.add(`Dosage${i}`.toLowerCase());
                slotKeys.add(`Quantity${i}`.toLowerCase());
                slotKeys.add(`Frequency${i}`.toLowerCase());
                slotKeys.add(`Instructions${i}`.toLowerCase());
              }

              rxContent = rxTemplate.content;
              for (const [key, value] of Object.entries(replacements)) {
                rxContent = rxContent.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
              }
              // Empty unused indexed slots → blank; other unknown tokens → ___
              rxContent = rxContent.replace(/\[([A-Za-z][A-Za-z0-9_ -]*)\]/g, (_full, token: string) => {
                const norm = token.toLowerCase().replace(/\s+/g, '');
                if (slotKeys.has(norm)) return '';
                return '___';
              });
              // Template path already contains slots — do NOT append duplicate medsHtml
            } else {
              const medsHtml = (medications.length > 0 ? medications : [{ medication: rx.medication, dosage: rx.dosage, frequency: rx.frequency, instructions: rx.instructions }])
                .map((m: any) => `<tr><td>${m.medication || m.name || ''}</td><td>${m.dosage || ''}</td><td>${m.frequency || ''}</td><td>${m.instructions || ''}</td><td>${m.repeats || ''}</td></tr>`)
                .join('');
              rxContent = `<h2>Prescription</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>Client:</strong> ${patientRecord?.name || 'Unknown'}</p>
<p><strong>Advisor:</strong> ${docProfile?.full_name || ''}</p>
<p><strong>Practice Number:</strong> ${docProfile?.practice_number || ''}</p>
<br/>
<table><thead><tr><th>Medication</th><th>Dosage</th><th>Frequency</th><th>Instructions</th><th>Repeats</th></tr></thead><tbody>${medsHtml}</tbody></table>`;
            }

            const { data: rxDoc } = await supabase.from('documents').insert({
              user_id: user.id,
              patient_id: clientId,
              name: `Prescription - ${patientRecord?.name || 'Client'} - ${today}`,
              content: rxContent,
              template_name: 'Prescription',
              patient_name: patientRecord?.name || null,
              is_draft: true,
              session_id: sessionId,
            } as any).select('id').single();
            logger.debug('Prescription document auto-created');

            if (rxDoc) {
              await supabase.from('todos').insert({
                user_id: user.id,
                session_id: sessionId,
                patient_id: clientId,
                title: `Review Prescription - ${patientRecord?.name || 'Client'}`,
                document_id: rxDoc.id,
                task_type: 'document_review',
                priority: 'high',
                status: 'pending',
              } as any);
            }
            // Remove duplicate action_point todos for prescriptions
            await supabase.from('todos')
              .delete()
              .eq('session_id', sessionId!)
              .eq('user_id', user.id)
              .neq('task_type', 'document_review')
              .ilike('title', '%prescription%');
          }
        } catch (rxError) {
          console.error('Error creating prescription document:', rxError);
        }
      }

      // Auto-create medical certificate if detected
      if (summaryData?.medical_certificate && clientId) {
        try {
          const cert = summaryData.medical_certificate;
          const [patientRes, profileRes, templateRes] = await Promise.all([
            supabase.from('clients').select('name, physical_address, address, medical_aid, medical_aid_number, id_passport_number, dob, phone, email').eq('id', clientId).maybeSingle(),
            supabase.from('profiles').select('full_name, practice_number, doctor_number, specialty, practice_address').eq('id', user.id).maybeSingle(),
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
            const fromDate = cert.from_date || cert.start_date || today;
            const toDate = cert.to_date || cert.end_date || today;
            const days = Math.max(1, Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000) + 1);
            const nowTime = new Date().toTimeString().slice(0, 5);
            const nature = cert.diagnosis || cert.reason || '';
            const replacements: Record<string, string> = {
              'ClientName': patientRecord?.name || 'Unknown',
              'PatientName': patientRecord?.name || 'Unknown',
              'Client Name': patientRecord?.name || 'Unknown',
              'Date': today,
              'IssuedDate': today,
              'SessionDate': today,
              'ConsultationDate': today,
              'ConsultationTime': nowTime,
              'SignatureDate': today,
              'DoctorName': docProfile?.full_name || '',
                'AdvisorName': docProfile?.full_name || '',
              'DoctorNumber': docProfile?.doctor_number || '',
              'PracticeNumber': docProfile?.practice_number || '',
              'RegistrationNumber': docProfile?.doctor_number || '',
              'PracticeAddress': docProfile?.practice_address || '',
              'PatientAddress': (patientRecord as any)?.physical_address || (patientRecord as any)?.address || '',
              'ClientAddress': (patientRecord as any)?.physical_address || (patientRecord as any)?.address || '',
              'MedicalAid': (patientRecord as any)?.medical_aid || '',
              'MedicalAidNumber': (patientRecord as any)?.medical_aid_number || '',
              'IDNumber': (patientRecord as any)?.id_passport_number || '',
              'DOB': (patientRecord as any)?.dob || '',
              'Phone': (patientRecord as any)?.phone || '',
              'Email': (patientRecord as any)?.email || '',
              'Diagnosis': nature,
              'NatureOfIllness': nature,
              'FromDate': fromDate,
              'ToDate': toDate,
              'SickLeaveFrom': fromDate,
              'SickLeaveUntil': toDate,
              'Inclusive': '(inclusive)',
              'Days': String(days),
              'Reason': cert.reason || nature,
              'OtherRecommendations': cert.notes || cert.recommendations || '',
            };
            certContent = certTemplate.content;
            for (const [key, value] of Object.entries(replacements)) {
              certContent = certContent.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
            }
            // Anything still unresolved stays as a blank fill-in line rather than
            // littering the clinical body with "___".
            certContent = certContent.replace(/\[[A-Za-z][A-Za-z0-9_ -]*\]/g, '');
          } else {
            certContent = `<h2>Medical Certificate</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>Client:</strong> ${patientRecord?.name || 'Unknown'}</p>
<p><strong>Advisor:</strong> ${docProfile?.full_name || ''}</p>
<p><strong>Practice Number:</strong> ${docProfile?.practice_number || ''}</p>
<br/>
<p>This is to certify that ${patientRecord?.name || 'the client'} was examined on ${today} and is unfit for duty from <strong>${cert.from_date || today}</strong> to <strong>${cert.to_date || today}</strong>.</p>
<br/>
<p><strong>Diagnosis:</strong> ${cert.diagnosis || 'As discussed'}</p>
<p><strong>Reason:</strong> ${cert.reason || ''}</p>`;
          }

          const { data: certDoc } = await supabase.from('documents').insert({
            user_id: user.id,
            patient_id: clientId,
            name: `Medical Certificate - ${patientRecord?.name || 'Client'} - ${today}`,
            content: certContent,
            template_name: 'Medical Certificate',
            patient_name: patientRecord?.name || null,
            is_draft: true,
            session_id: sessionId,
          } as any).select('id').single();
          logger.debug('Medical certificate document auto-created');

          if (certDoc) {
            await supabase.from('todos').insert({
              user_id: user.id,
              session_id: sessionId,
              patient_id: clientId,
              title: `Review Medical Certificate - ${patientRecord?.name || 'Client'}`,
              document_id: certDoc.id,
              task_type: 'document_review',
              priority: 'high',
              status: 'pending',
            } as any);
          }
          // Remove duplicate action_point todos for medical certificates
          await supabase.from('todos')
            .delete()
            .eq('session_id', sessionId!)
            .eq('user_id', user.id)
            .neq('task_type', 'document_review')
            .ilike('title', '%certificate%');
        } catch (certError) {
          console.error('Error creating medical certificate document:', certError);
        }
      }

      // Auto-create referral letter if detected
      if (summaryData?.referral && clientId) {
        try {
          const ref = summaryData.referral;
          const [patientRes, profileRes, templateRes] = await Promise.all([
            supabase.from('clients').select('name, physical_address, address, medical_aid, medical_aid_number, id_passport_number, dob, phone, email').eq('id', clientId).maybeSingle(),
            supabase.from('profiles').select('full_name, practice_number, doctor_number, specialty, practice_address').eq('id', user.id).maybeSingle(),
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
            const specialistName = ref.doctor_name || ref.referred_to || ref.specialist_type || '';
            const reason = ref.reason || ref.diagnosis || '';
            const complaint = ref.clinical_notes || summaryData?.summary || reason;
            const replacements: Record<string, string> = {
              'ClientName': patientRecord?.name || 'Unknown',
              'PatientName': patientRecord?.name || 'Unknown',
              'Client Name': patientRecord?.name || 'Unknown',
              'Date': today,
              'SessionDate': today,
              'ReferralDate': today,
              'SignatureDate': today,
              'DoctorName': docProfile?.full_name || '',
                'AdvisorName': docProfile?.full_name || '',
              'DoctorNumber': docProfile?.doctor_number || '',
              'PracticeNumber': docProfile?.practice_number || '',
              'RegistrationNumber': docProfile?.doctor_number || '',
              'PracticeAddress': docProfile?.practice_address || '',
              'PracticePhone': (docProfile as any)?.phone || '',
              'Specialty': docProfile?.specialty || '',
              'ReferringDoctor': docProfile?.full_name || '',
              'PatientAddress': (patientRecord as any)?.physical_address || (patientRecord as any)?.address || '',
              'ClientAddress': (patientRecord as any)?.physical_address || (patientRecord as any)?.address || '',
              'MedicalAid': (patientRecord as any)?.medical_aid || '',
              'MedicalAidNumber': (patientRecord as any)?.medical_aid_number || '',
              'IDNumber': (patientRecord as any)?.id_passport_number || '',
              'DOB': (patientRecord as any)?.dob || '',
              'PatientDOB': (patientRecord as any)?.dob || '',
              'ClientDOB': (patientRecord as any)?.dob || '',
              'Phone': (patientRecord as any)?.phone || '',
              'PatientContact': (patientRecord as any)?.phone || (patientRecord as any)?.email || '',
              'ClientContact': (patientRecord as any)?.phone || (patientRecord as any)?.email || '',
              'Email': (patientRecord as any)?.email || '',
              'ReferralDoctor': specialistName,
              'SpecialistName': specialistName,
              'SpecialistTitle': ref.doctor_name ? 'Dr' : 'Colleague',
              'SpecialistSpecialty': ref.specialist_type || '',
              'SpecialistAddress': ref.address || '',
              'ReferralReason': reason,
              'ReasonForReferral': reason,
              'Urgency': ref.urgency || 'routine',
              'PresentingComplaint': complaint,
              'RelevantHistory': ref.relevant_history || ref.history || '',
              'CurrentMedications': ref.current_medications || '',
              'Investigations': ref.investigations || '',
              'Diagnosis': ref.diagnosis || '',
              'ClinicalNotes': ref.clinical_notes || '',
            };
            refContent = refTemplate.content;
            for (const [key, value] of Object.entries(replacements)) {
              refContent = refContent.replace(new RegExp(`\\[${key}\\]`, 'gi'), value);
            }
            // Leave unresolved tokens blank instead of stamping "___" across the letter.
            refContent = refContent.replace(/\[[A-Za-z][A-Za-z0-9_ -]*\]/g, '');
          } else {
            refContent = `<h2>Referral Letter</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>From:</strong> ${docProfile?.full_name || ''} (${docProfile?.specialty || ''})</p>
<p><strong>Practice Number:</strong> ${docProfile?.practice_number || ''}</p>
<br/>
<p><strong>To:</strong> ${ref.referred_to || 'Specialist'}</p>
<br/>
<p>${buildGreeting({ fullName: ref.referred_to, isPractitioner: true })},</p>
<p>I am referring <strong>${patientRecord?.name || 'the client'}</strong> for your expert opinion regarding:</p>
<p>${ref.reason || ref.diagnosis || 'As discussed during consultation'}</p>
<br/>
<p><strong>Clinical Notes:</strong> ${ref.clinical_notes || ''}</p>`;
          }

          const { data: refDoc } = await supabase.from('documents').insert({
            user_id: user.id,
            patient_id: clientId,
            name: `Referral Letter - ${patientRecord?.name || 'Client'} - ${today}`,
            content: refContent,
            template_name: 'Referral Letter',
            patient_name: patientRecord?.name || null,
            is_draft: true,
            session_id: sessionId,
          } as any).select('id').single();
          logger.debug('Referral letter document auto-created');

          if (refDoc) {
            await supabase.from('todos').insert({
              user_id: user.id,
              session_id: sessionId,
              patient_id: clientId,
              title: `Review Referral Letter - ${patientRecord?.name || 'Client'}`,
              document_id: refDoc.id,
              task_type: 'document_review',
              priority: 'high',
              status: 'pending',
            } as any);
          }
          // Remove duplicate action_point todos for referrals
          await supabase.from('todos')
            .delete()
            .eq('session_id', sessionId!)
            .eq('user_id', user.id)
            .neq('task_type', 'document_review')
            .ilike('title', '%referral%');
        } catch (refError) {
          console.error('Error creating referral document:', refError);
        }
      }

      // Auto-create client task assignment document if detected
      if (summaryData?.patient_tasks?.tasks?.length > 0 && clientId) {
        try {
          const tasks = summaryData.patient_tasks.tasks;
          const { data: patientRes } = await supabase.from('clients').select('name').eq('id', clientId).maybeSingle();
          const clientName = patientRes?.name || 'Client';
          const today = new Date().toISOString().split('T')[0];

          const tasksHtml = tasks.map((t: any, i: number) => 
            `<p><strong>${i + 1}. ${t.title}</strong></p><p>${t.description || ''}</p><p><em>Frequency: ${t.frequency || 'As needed'}</em> | <em>Vulas: ${t.vulas_reward || 1}</em></p><br/>`
          ).join('');
          const taskDocContent = `<h2>Client Task Assignment</h2>
<p><strong>Date:</strong> ${today}</p>
<p><strong>Client:</strong> ${clientName}</p>
<br/>
<h3>Assigned Tasks</h3>
${tasksHtml}`;

          const { data: taskDoc } = await supabase.from('documents').insert({
            user_id: user.id,
            patient_id: clientId,
            name: `Client Tasks - ${clientName} - ${today}`,
            content: taskDocContent,
            template_name: 'Client Task Assignment',
            patient_name: clientName,
            is_draft: true,
            session_id: sessionId,
          } as any).select('id').single();

          if (taskDoc) {
            await supabase.from('todos').insert({
              user_id: user.id,
              session_id: sessionId,
              patient_id: clientId,
              title: `Review Client Tasks - ${clientName}`,
              document_id: taskDoc.id,
              task_type: 'document_review',
              priority: 'high',
              status: 'pending',
              assignee: 'advisor',
            } as any);
          }

          // The instructions themselves belong on the client's task list
          const patientTaskRows = tasks
            .filter((t: any) => t?.title && classifyTask(t.title) !== 'skip')
            .map((t: any) => ({
              user_id: user.id,
              session_id: sessionId,
              patient_id: clientId,
              title: t.title,
              description: t.description || null,
              priority: 'medium',
              status: 'pending',
              vulas_reward: t.vulas_reward || 1,
              assignee: 'client',
            }));
          if (patientTaskRows.length > 0) {
            await supabase.from('todos').insert(patientTaskRows as any);
            for (const row of patientTaskRows) {
              await notifyClientOfTask(clientId, row.title, sessionId!);
            }
          }

          // Remove duplicate advisor-side action_point todos for exercises/tasks
          await supabase.from('todos')
            .delete()
            .eq('session_id', sessionId!)
            .eq('user_id', user.id)
            .eq('assignee', 'advisor')
            .neq('task_type', 'document_review')
            .ilike('title', '%exercise%');

        } catch (taskError) {
          console.error('Error creating client task assignment:', taskError);
        }
      }

      // Fire-and-forget: refresh DISC personality profile from the new session content.
      if (clientId) {
        supabase.functions
          .invoke('analyze-patient-disc', { body: { patient_id: clientId } })
          .catch((e) => logger.debug('DISC refresh skipped:', e?.message || e));
      }

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

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const filter = clientId
        ? `patient_id=eq.${clientId}`
        : `user_id=eq.${user.id}`;

      channel = supabase
        .channel(`sessions-${clientId || user.id}`)
        .on(
          'postgres_changes' as any,
          { event: '*', schema: 'public', table: 'sessions', filter },
          () => { fetchSessions(); }
        )
        .subscribe();
    };
    setupRealtime();

    const onFocus = () => { fetchSessions(); };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      if (channel) supabase.removeChannel(channel);
    };
  }, [clientId]);

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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('sessions')
          .select(`
            *,
            client:clients(id, name, allergies, current_medications, conditions_diagnoses)
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
  }, [id, refreshKey]);

  const refetch = () => setRefreshKey((k) => k + 1);

  return { session, loading, refetch };
}