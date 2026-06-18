import { AlertTriangle } from "lucide-react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

export function HumanReviewWarning() {
  return (
    <Alert variant="warning">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Human review required</AlertTitle>
      <AlertDescription>
        InfraAI SiteCompass does not approve construction, issue permits,
        allocate funding, guarantee grid capacity, or replace engineering and
        environmental review.
      </AlertDescription>
    </Alert>
  );
}
