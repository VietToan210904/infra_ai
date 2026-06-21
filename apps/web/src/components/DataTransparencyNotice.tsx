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
      <AlertTitle>Open-data and synthetic planning view only</AlertTitle>
      <AlertDescription>
        Real layers come from OpenStreetMap or public datasets and may be
        incomplete or outdated. Synthetic layers are demo placeholders. This map
        supports early exploration and does not replace engineering, grid, land,
        environmental, water, cooling, permitting, cybersecurity, or public
        consultation review.
      </AlertDescription>
    </Alert>
  );
}
