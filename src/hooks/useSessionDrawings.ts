import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * Canvas Element Types
 * Structured for persistence and future export compatibility
 */
export interface CanvasElement {
  id: string;
  type: "path" | "anatomy" | "text" | "shape";
  data: {
    // Path data
    points?: { x: number; y: number }[];
    isMarker?: boolean;
    // Anatomy data
    assetId?: string;
    visibleLayers?: string[];
    rotation?: number;
    // Text data
    text?: string;
    fontWeight?: string;
    fontFamily?: string;
    tags?: string[];
    createdAt?: string;
    // Shape data
    shapeType?: "line" | "arrow" | "circle" | "rectangle";
    endX?: number;
    endY?: number;
    // Generic
    [key: string]: any;
  };
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Canvas Data Structure
 * Export-ready format with metadata support
 */
export interface CanvasData {
  elements: CanvasElement[];
  backgroundColor?: string;
  /** Schema version for future migrations */
  schemaVersion?: string;
  /** Last modified timestamp */
  lastModified?: string;
}

/**
 * Session Drawing Record
 * Represents a persisted drawing with versioning
 */
export interface SessionDrawing {
  id: string;
  session_id: string | null;
  patient_id: string;
  doctor_id: string;
  canvas_data: CanvasData;
  version: number;
  is_current: boolean;
  created_at: string;
  updated_at: string;
}

/** Current schema version for data migrations */
export const CANVAS_SCHEMA_VERSION = "1.0";

export function useSessionDrawings(patientId: string, sessionId?: string | null) {
  const { toast } = useToast();
  const [drawings, setDrawings] = useState<SessionDrawing[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<SessionDrawing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchDrawings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("session_drawings")
        .select("*")
        .eq("patient_id", patientId)
        .order("version", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const transformedData = (data || []).map((d) => ({
        ...d,
        canvas_data: (d.canvas_data as unknown as CanvasData) || { elements: [] },
      })) as SessionDrawing[];

      setDrawings(transformedData);
      
      // Set current drawing (latest or session-specific)
      if (sessionId) {
        const sessionDrawing = transformedData.find(d => d.session_id === sessionId);
        setCurrentDrawing(sessionDrawing || null);
      } else {
        const current = transformedData.find(d => d.is_current) || transformedData[0] || null;
        setCurrentDrawing(current);
      }
    } catch (error: any) {
      console.error("Error fetching drawings:", error);
    } finally {
      setLoading(false);
    }
  }, [patientId, sessionId]);

  const saveDrawing = useCallback(async (canvasData: CanvasData, createNewVersion = false) => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Enrich canvas data with schema version and timestamp
      const enrichedCanvasData: CanvasData = {
        ...canvasData,
        schemaVersion: CANVAS_SCHEMA_VERSION,
        lastModified: new Date().toISOString(),
      };

      if (currentDrawing && !createNewVersion) {
        // Update existing drawing
        const { data, error } = await supabase
          .from("session_drawings")
          .update({ 
            canvas_data: JSON.parse(JSON.stringify(enrichedCanvasData)),
            updated_at: new Date().toISOString()
          })
          .eq("id", currentDrawing.id)
          .select()
          .single();

        if (error) throw error;

        const updated = {
          ...data,
          canvas_data: data.canvas_data as unknown as CanvasData,
        } as SessionDrawing;

        setCurrentDrawing(updated);
        setDrawings(prev => prev.map(d => d.id === updated.id ? updated : d));
      } else {
        // Mark all previous versions as not current
        if (drawings.length > 0) {
          await supabase
            .from("session_drawings")
            .update({ is_current: false })
            .eq("patient_id", patientId);
        }

        // Get next version number
        const nextVersion = drawings.length > 0 
          ? Math.max(...drawings.map(d => d.version)) + 1 
          : 1;

        // Create new drawing
        const { data, error } = await supabase
          .from("session_drawings")
          .insert([{
            patient_id: patientId,
            session_id: sessionId || null,
            doctor_id: user.id,
            canvas_data: JSON.parse(JSON.stringify(enrichedCanvasData)),
            version: nextVersion,
            is_current: true,
          }])
          .select()
          .single();

        if (error) throw error;

        const newDrawing = {
          ...data,
          canvas_data: data.canvas_data as unknown as CanvasData,
        } as SessionDrawing;

        setCurrentDrawing(newDrawing);
        setDrawings(prev => [newDrawing, ...prev.map(d => ({ ...d, is_current: false }))]);
        
        toast({
          title: "Drawing Saved",
          description: `Version ${nextVersion} created`,
        });
      }
    } catch (error: any) {
      console.error("Error saving drawing:", error);
      toast({
        title: "Error",
        description: "Failed to save drawing",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [currentDrawing, drawings, patientId, sessionId, toast]);

  const loadVersion = useCallback((version: number) => {
    const drawing = drawings.find(d => d.version === version);
    if (drawing) {
      setCurrentDrawing(drawing);
    }
  }, [drawings]);

  const deleteDrawing = useCallback(async (drawingId: string) => {
    try {
      const { error } = await supabase
        .from("session_drawings")
        .delete()
        .eq("id", drawingId);

      if (error) throw error;

      setDrawings(prev => prev.filter(d => d.id !== drawingId));
      if (currentDrawing?.id === drawingId) {
        const remaining = drawings.filter(d => d.id !== drawingId);
        setCurrentDrawing(remaining[0] || null);
      }

      toast({
        title: "Deleted",
        description: "Drawing version deleted",
      });
    } catch (error: any) {
      console.error("Error deleting drawing:", error);
      toast({
        title: "Error",
        description: "Failed to delete drawing",
        variant: "destructive",
      });
    }
  }, [currentDrawing, drawings, toast]);

  useEffect(() => {
    if (patientId) {
      fetchDrawings();
    }
  }, [patientId, sessionId, fetchDrawings]);

  return {
    drawings,
    currentDrawing,
    loading,
    saving,
    saveDrawing,
    loadVersion,
    deleteDrawing,
    refetch: fetchDrawings,
  };
}
