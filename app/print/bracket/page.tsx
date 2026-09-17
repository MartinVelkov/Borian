import { Suspense } from "react";
import { PrintBracketContent } from "./print-bracket-content";

export default function PrintBracketPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-white p-6 text-slate-600">
          Зареждане на схемата...
        </main>
      }
    >
      <PrintBracketContent />
    </Suspense>
  );
}
