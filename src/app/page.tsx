import Link from "next/link";
import { COLLECTIONS } from "@/lib/collections";
import Footer from "@/components/layout/Footer";

export default function Home() {
  const collection = COLLECTIONS.pefa;

  return (
    <>
      {/* Hero */}
      <section className="bg-primary py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white max-w-3xl leading-tight">
            AI-Powered Search for PEFA Reports
          </h1>
          <p className="mt-6 text-lg text-white/80 max-w-2xl leading-relaxed">
            Query the latest national Public Expenditure and Financial
            Accountability assessments using natural language. Compare PEFA
            scores across countries, surface reform recommendations, and
            navigate hundreds of pages of PFM diagnostics in seconds.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/chat"
              className="rounded-md bg-white px-6 py-3 text-sm font-semibold text-primary shadow-sm hover:bg-white/90 transition-colors"
            >
              Start Querying
            </Link>
            <Link
              href="/stats"
              className="rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              View Statistics
            </Link>
          </div>
        </div>
      </section>

      {/* Collection */}
      <section className="py-20 bg-bg-light/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Document Collection
          </p>
          <h2 className="font-heading text-3xl font-bold mt-2 text-foreground">
            Latest National PEFA Assessments
          </h2>
          <p className="mt-4 text-muted max-w-2xl">
            The corpus mirrors the official PEFA Secretariat catalogue of
            most-recent final national assessments. Public reports are
            ingested as full text with chunk-level vector embeddings;
            non-public reports remain catalogued for reference but are not
            searchable.
          </p>
          <div className="mt-12 max-w-2xl">
            <div className="relative rounded-xl border border-border bg-white p-8 shadow-sm">
              <h3 className="font-heading text-xl font-semibold text-foreground">
                {collection.displayName}
              </h3>
              <p className="mt-3 text-sm text-muted leading-relaxed">
                {collection.description}
              </p>
              <Link
                href={`/chat?collection=${collection.id}`}
                className="mt-6 inline-flex items-center text-sm font-medium text-accent hover:text-primary transition-colors"
              >
                Query this collection
                <svg
                  className="ml-1 h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-accent">
            Capabilities
          </p>
          <h2 className="font-heading text-3xl font-bold mt-2 text-foreground">
            Built for PFM Practitioners
          </h2>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: "Cross-Country Comparison",
                desc: "Search semantically across all PEFA reports at once. Compare scores, reforms, and findings between countries in one query.",
              },
              {
                title: "Source Citations",
                desc: "Every response cites the country, year, and page number of each PEFA assessment it draws on.",
              },
              {
                title: "Indicator-Aware",
                desc: "Tuned to PEFA's indicator framework (PI-1 through PI-31, HLG-1) and four-point scoring (A, B, C, D and +).",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-white p-8 shadow-sm"
              >
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm text-muted leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
