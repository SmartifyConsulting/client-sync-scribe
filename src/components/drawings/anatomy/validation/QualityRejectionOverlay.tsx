/**
 * Quality Rejection Overlay
 * UI component displayed when anatomy asset fails quality validation
 */

import React from "react";
import { AlertTriangle, XCircle, Info, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QualityValidationResult, QualityViolation } from "./AnatomyQualityValidator";

interface QualityRejectionOverlayProps {
  validationResult: QualityValidationResult;
  assetName: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const QualityRejectionOverlay: React.FC<QualityRejectionOverlayProps> = ({
  validationResult,
  assetName,
  onRetry,
  onDismiss,
}) => {
  const { isValid, score, violations, warnings } = validationResult;

  if (isValid) return null;

  const criticalViolations = violations.filter(v => v.severity === "critical");
  const majorViolations = violations.filter(v => v.severity === "major");
  const minorViolations = violations.filter(v => v.severity === "minor");

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="max-w-lg w-full mx-4 bg-card border border-destructive/50 rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-destructive/30 bg-destructive/10">
          <XCircle className="h-6 w-6 text-destructive" />
          <div className="flex-1">
            <h3 className="font-semibold text-destructive">Asset Quality Rejected</h3>
            <p className="text-sm text-muted-foreground">{assetName}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-destructive">{score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-80 p-4">
          {/* Critical Violations */}
          {criticalViolations.length > 0 && (
            <div className="mb-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-destructive mb-2">
                <span className="w-2 h-2 rounded-full bg-destructive" />
                Critical Issues ({criticalViolations.length})
              </h4>
              {criticalViolations.map((violation, idx) => (
                <ViolationCard key={idx} violation={violation} />
              ))}
            </div>
          )}

          {/* Major Violations */}
          {majorViolations.length > 0 && (
            <div className="mb-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-warning mb-2">
                <span className="w-2 h-2 rounded-full bg-warning" />
                Major Issues ({majorViolations.length})
              </h4>
              {majorViolations.map((violation, idx) => (
                <ViolationCard key={idx} violation={violation} />
              ))}
            </div>
          )}

          {/* Minor Violations */}
          {minorViolations.length > 0 && (
            <div className="mb-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                Minor Issues ({minorViolations.length})
              </h4>
              {minorViolations.map((violation, idx) => (
                <ViolationCard key={idx} violation={violation} />
              ))}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mb-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
                <AlertTriangle className="h-3 w-3" />
                Warnings
              </h4>
              <ul className="space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground pl-4">
                    • {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quality Standards Info */}
          <Alert className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle className="text-sm">Clinical Quality Standards</AlertTitle>
            <AlertDescription className="text-xs">
              Anatomy visualizations must meet medical atlas quality standards including:
              anatomically accurate proportions, visible landmarks, proper articulations,
              layered structure, and clinical-grade color accuracy.
            </AlertDescription>
          </Alert>
        </ScrollArea>

        {/* Footer */}
        <div className="flex gap-2 p-4 border-t">
          {onDismiss && (
            <Button variant="outline" onClick={onDismiss} className="flex-1">
              Dismiss
            </Button>
          )}
          {onRetry && (
            <Button onClick={onRetry} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Validation
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface ViolationCardProps {
  violation: QualityViolation;
}

const ViolationCard: React.FC<ViolationCardProps> = ({ violation }) => {
  const borderColor = 
    violation.severity === "critical" ? "border-destructive/50" :
    violation.severity === "major" ? "border-warning/50" :
    "border-muted-foreground/50";

  return (
    <div className={`mb-2 p-3 rounded-md border ${borderColor} bg-muted/50`}>
      <div className="flex items-start gap-2">
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
          {violation.code}
        </code>
        <div className="flex-1">
          <p className="text-sm font-medium">{violation.message}</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium">Fix: </span>
            {violation.remediation}
          </p>
        </div>
      </div>
    </div>
  );
};

export default QualityRejectionOverlay;
