import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { planningFocusOptions } from "@/data/planningOptions";
import type { InfrastructureIntent } from "@/types/site";

interface InfrastructureSelectorProps {
  value: InfrastructureIntent;
  onChange: (value: InfrastructureIntent) => void;
}

export function InfrastructureSelector({
  value,
  onChange,
}: InfrastructureSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase text-muted-foreground">
        Planning focus
      </label>
      <Select
        value={value}
        onValueChange={(next) => onChange(next as InfrastructureIntent)}
      >
        <SelectTrigger aria-label="Planning focus">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {planningFocusOptions.map(([optionValue, label]) => (
            <SelectItem key={optionValue} value={optionValue}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
