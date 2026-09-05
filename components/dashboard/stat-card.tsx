import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function StatCard({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
