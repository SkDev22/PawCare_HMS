import { Card, CardContent } from "../../../components/ui/card";

type Tone = "default" | "destructive" | "success" | "warning";

const TONE_CLASS: Record<Tone, string> = {
  default: "",
  destructive: "text-destructive",
  success: "text-emerald-600",
  warning: "text-amber-600",
};

export function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: Tone;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${TONE_CLASS[tone]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-sm text-muted-foreground py-10 text-center">{message}</p>
  );
}
