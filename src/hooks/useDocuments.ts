import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Document {
  id: string;
  user_id: string;
  patient_id: string | null;
  template_id: string | null;
  name: string;
  content: string;
  template_name: string | null;
  patient_name: string | null;
  created_at: string;
  updated_at: string;
  email_sent_at: string | null;
}

export interface DocumentInput {
  patient_id?: string;
  template_id?: string;
  name: string;
  content: string;
  template_name?: string;
  patient_name?: string;
}

export function useDocuments(patientId?: string, options?: { allOwners?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    } else {
      setDocuments([]);
      setLoading(false);
    }
  }, [user, patientId, options?.allOwners]);

  const fetchDocuments = async () => {
    if (!user) return;

    setLoading(true);
    let query = supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (patientId) {
      query = query.eq('patient_id', patientId);
    } else if (!options?.allOwners) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching documents:', error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const createDocument = async (input: DocumentInput): Promise<Document | null> => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create documents",
        variant: "destructive",
      });
      return null;
    }

    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        patient_id: input.patient_id || null,
        template_id: input.template_id || null,
        name: input.name,
        content: input.content,
        template_name: input.template_name || null,
        patient_name: input.patient_name || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating document:', error);
      toast({
        title: "Error",
        description: "Failed to save document",
        variant: "destructive",
      });
      return null;
    }

    setDocuments([data, ...documents]);
    toast({
      title: "Document Saved",
      description: `"${input.name}" has been saved`,
    });
    return data;
  };

  const updateDocument = async (id: string, input: Partial<DocumentInput>): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase
      .from('documents')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error",
        description: "Failed to update document",
        variant: "destructive",
      });
      return false;
    }

    setDocuments(documents.map(d => d.id === id ? data : d));
    toast({
      title: "Document Updated",
      description: `"${data.name}" has been updated`,
    });
    return true;
  };

  const deleteDocument = async (id: string): Promise<boolean> => {
    if (!user) return false;

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
      return false;
    }

    setDocuments(documents.filter(d => d.id !== id));
    toast({
      title: "Document Deleted",
      description: "The document has been removed",
    });
    return true;
  };

  return {
    documents,
    loading,
    fetchDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
  };
}
