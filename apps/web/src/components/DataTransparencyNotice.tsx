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
      <AlertTitle>Open-data planning view only</AlertTitle>
      <AlertDescription>
        Infrastructure layers are based on OpenStreetMap and may be incomplete
        or outdated. This map supports early exploration and does not replace
        engineering, grid, land, environmental, water, cooling, permitting,
        cybersecurity, or public consultation review.
      </AlertDescription>
    </Alert>
  );
}
