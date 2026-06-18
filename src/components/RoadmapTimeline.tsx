import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { RoadmapItem } from "@/types/site";

interface RoadmapTimelineProps {
  roadmap: RoadmapItem[];
}

export function RoadmapTimeline({ roadmap }: RoadmapTimelineProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Strategic roadmap</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Phased implementation plan for city AI infrastructure readiness.
        </p>
      </div>
      <Accordion type="multiple" defaultValue={roadmap.map((item) => item.horizon)}>
        {roadmap.map((item) => (
          <AccordionItem key={item.horizon} value={item.horizon}>
            <AccordionTrigger>{item.horizon}</AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {item.actions.map((action) => (
                  <li key={action} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
