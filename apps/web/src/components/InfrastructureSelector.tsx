import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { planningFocusDetails, planningFocusOptions } from "@/data/planningOptions";
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
          <SelectValue>
            {planningFocusDetails[value].label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[min(92vw,360px)]">
          {planningFocusOptions.map(([optionValue, label]) => (
            <SelectItem key={optionValue} value={optionValue}>
              <div className="flex min-w-0 flex-col gap-0.5 py-1">
                <span className="truncate">{label}</span>
                <span className="max-w-[300px] whitespace-normal text-xs leading-snug text-muted-foreground">
                  {planningFocusDetails[optionValue].description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {planningFocusDetails[value].example}
      </p>
    </div>
  );
}
