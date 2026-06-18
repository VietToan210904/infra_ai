import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { InfrastructureType } from "@/types/site";

const infrastructureOptions: Array<{
  value: InfrastructureType;
  label: string;
}> = [
  {
    value: "PUBLIC_AI_COMPUTE_HUB",
    label: "Public-sector AI compute hub",
  },
  {
    value: "REGIONAL_AI_DATA_CENTER",
    label: "Regional AI data center",
  },
];

interface InfrastructureSelectorProps {
  value: InfrastructureType;
  onChange: (value: InfrastructureType) => void;
}

export function InfrastructureSelector({
  value,
  onChange,
}: InfrastructureSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase text-muted-foreground">
        Infrastructure type
      </label>
      <Select value={value} onValueChange={(next) => onChange(next as InfrastructureType)}>
        <SelectTrigger aria-label="Infrastructure type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {infrastructureOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
