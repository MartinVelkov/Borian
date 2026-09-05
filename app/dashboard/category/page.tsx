import { PageHeader } from "@/components/dashboard/page-header";
import { CategoryStep } from "@/components/dashboard/category-step";

export default function CategoryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Турнири"
        title="Категории"
        description="Управлявай категориите към избрания турнир."
      />
      <CategoryStep />
    </>
  );
}
