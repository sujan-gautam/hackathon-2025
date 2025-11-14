import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  HelpCircle, 
  AlertCircle, 
  FileText, 
  Clock, 
  DollarSign, 
  Briefcase, 
  Ban 
} from "lucide-react";

export type IntentType = 
  | "meeting_request" 
  | "question" 
  | "complaint" 
  | "assignment" 
  | "follow_up" 
  | "billing" 
  | "job_application" 
  | "spam";

interface IntentBadgeProps {
  intent: IntentType;
  confidence?: number;
}

const intentConfig: Record<IntentType, { label: string; icon: any; variant: string }> = {
  meeting_request: { label: "Meeting", icon: Calendar, variant: "default" },
  question: { label: "Question", icon: HelpCircle, variant: "secondary" },
  complaint: { label: "Complaint", icon: AlertCircle, variant: "destructive" },
  assignment: { label: "Assignment", icon: FileText, variant: "default" },
  follow_up: { label: "Follow-up", icon: Clock, variant: "secondary" },
  billing: { label: "Billing", icon: DollarSign, variant: "default" },
  job_application: { label: "Job App", icon: Briefcase, variant: "default" },
  spam: { label: "Spam", icon: Ban, variant: "outline" },
};

export function IntentBadge({ intent, confidence }: IntentBadgeProps) {
  const config = intentConfig[intent];
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant as any} 
      className="gap-1 px-3 py-1 text-xs font-medium"
      data-testid={`badge-intent-${intent}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
      {confidence && (
        <span className="opacity-70">({confidence}%)</span>
      )}
    </Badge>
  );
}
