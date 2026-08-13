import { useParams } from "react-router-dom";
import { MaeveChat } from "../components/MaeveChat";

export default function AskMaeveSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  if (!sessionId) return null;
  return <MaeveChat key={sessionId} sessionId={sessionId} />;
}
