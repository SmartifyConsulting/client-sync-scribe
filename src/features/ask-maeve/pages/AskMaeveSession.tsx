import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { MaeveChat } from "../components/MaeveChat";
import { MaeveRecap } from "../components/MaeveRecap";

export default function AskMaeveSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const fresh = Boolean((location.state as { fresh?: boolean } | null)?.fresh);
  const [resume, setResume] = useState<"talk" | "type" | null>(null);

  if (!sessionId) return null;

  // A brand-new exploration goes straight into the chat. Opening a past one
  // shows the recap first, until the patient chooses how to continue.
  if (!fresh && !resume) {
    return <MaeveRecap key={sessionId} sessionId={sessionId} onContinue={setResume} />;
  }

  return <MaeveChat key={sessionId} sessionId={sessionId} initialMode={resume ?? undefined} />;
}
