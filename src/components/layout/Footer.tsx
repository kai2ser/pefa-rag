import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-bg-dark text-muted">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-3">
              PEFA Reports AI
            </h3>
            <p className="text-sm leading-relaxed">
              AI-powered semantic search across PEFA (Public Expenditure
              and Financial Accountability) national assessment reports.
            </p>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-3">
              Navigation
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/chat" className="hover:text-white transition-colors">
                  Query
                </Link>
              </li>
              <li>
                <Link href="/stats" className="hover:text-white transition-colors">
                  Statistics
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-lg font-semibold text-white mb-3">
              About
            </h3>
            <p className="text-sm leading-relaxed">
              Reports are sourced from the PEFA Secretariat
              (
              <a
                href="https://www.pefa.org"
                className="hover:text-white transition-colors underline underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                pefa.org
              </a>
              ). This application is not affiliated with PEFA.
            </p>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-white/10 text-center text-xs">
          &copy; {new Date().getFullYear()} PEFA Reports AI.
        </div>
      </div>
    </footer>
  );
}
