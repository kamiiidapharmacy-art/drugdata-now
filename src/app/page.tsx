import { DisclaimerBanner } from "@/components/DisclaimerBanner";
import { Header } from "@/components/Header";
import { DrugExplorer } from "@/components/DrugExplorer";
import { queryDrugs } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { latestVerifiedDate } = await queryDrugs({ limit: 1 });
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <DisclaimerBanner latestVerifiedDate={latestVerifiedDate} />
      <Header latestVerifiedDate={latestVerifiedDate} />
      <DrugExplorer />
    </div>
  );
}
