import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SectorReadiness } from "@/types/site";

interface SectorReadinessTableProps {
  sectors: SectorReadiness[];
}

export function SectorReadinessTable({ sectors }: SectorReadinessTableProps) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Sector readiness</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Public-sector demand view across Saigon service domains.
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sector</TableHead>
            <TableHead>Level</TableHead>
            <TableHead className="text-right">Score</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sectors.map((sector) => (
            <TableRow key={sector.name}>
              <TableCell className="font-medium">{sector.name}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant="secondary">{sector.level}</Badge>
                  <p className="max-w-[260px] text-xs text-muted-foreground">
                    {sector.mainGap}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {sector.score}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
}
