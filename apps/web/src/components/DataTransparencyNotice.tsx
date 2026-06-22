import { AlertTriangle } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export function DataTransparencyNotice() {
  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Planning data disclosure</AlertTitle>
      <AlertDescription>
        This map combines open-data and demo planning layers to support early
        AI-infrastructure review. Scores are decision-support signals, not
        verified capacity, permits, funding, or construction feasibility. Use
        the Human Review Workspace to validate sources with responsible
        agencies and domain experts.
      </AlertDescription>
    </Alert>
  );
}
