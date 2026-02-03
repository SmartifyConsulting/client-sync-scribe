/**
 * Anatomy Demo Page
 * Full-screen view for verifying medical-grade SVG anatomy systems
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MedicalAnatomyViewer } from "@/components/drawings/anatomy/MedicalAnatomyViewer";

export default function AnatomyDemo() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Medical Anatomy Viewer</h1>
          <p className="text-xs text-muted-foreground">
            Clinical-grade SVG anatomy systems with layer controls and structure selection
          </p>
        </div>
      </div>

      {/* Full-screen Anatomy Viewer */}
      <div className="flex-1 min-h-0">
        <MedicalAnatomyViewer className="h-full" />
      </div>
    </div>
  );
}
