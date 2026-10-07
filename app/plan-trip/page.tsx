import { redirect } from "next/navigation";

// Stand-in for the final Plan a Trip URL. Until that page moves here, visitors
// are sent on to /plan with the same query (for example ?draft=<id>), so links
// to /plan-trip already work.
export default async function PlanTripPage({ searchParams }: PageProps<"/plan-trip">) {
  const query = new URLSearchParams();
  Object.entries(await searchParams).forEach(([key, value]) => {
    [value].flat().forEach((entry) => {
      if (entry !== undefined) query.append(key, entry);
    });
  });

  redirect(query.size > 0 ? `/plan?${query}` : "/plan");
}
