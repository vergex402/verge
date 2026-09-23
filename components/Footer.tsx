export default function Footer() {
  return (
    <footer className="border-t border-[#2a2a2e] bg-[#171719] relative z-20">
      <div className="max-w-7xl mx-auto px-3 md:px-5 lg:px-8 py-12 md:py-14">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src="/verge-logo.jpeg"
                alt="Verge"
                className="w-6 h-6 rounded-md"
                width={24}
                height={24}
              />
              <span className="text-[17px] font-medium text-white">
                verge
              </span>
            </div>
            <p className="text-[13px] text-gray-500 leading-relaxed max-w-[420px]">
              Multichain HTTP 402 payment rails for software and AI agents.
              <br />&copy; {new Date().getFullYear()} Verge Labs &middot; MIT Licensed
            </p>
          </div>

          {/* Nav columns */}
          <div className="flex flex-wrap gap-x-10 gap-y-6 text-[13px]">
            <FooterCol
              title="Platform"
              links={[
                { href: "/docs", label: "Docs" },
                { href: "#how", label: "How it works" },
                { href: "#pricing", label: "Pricing" },
                { href: "/app", label: "Dashboard" },
              ]}
            />
            <FooterCol
              title="Payments"
              links={[
                { href: "#how", label: "Instant" },
                { href: "#how", label: "Batched" },
                { href: "#pricing", label: "Self-host" },
              ]}
            />
            <FooterCol
              title="Open Source"
              links={[
                { href: "https://github.com/vergex402/verge", label: "GitHub" },
                { href: "https://www.npmjs.com/package/@vergex402/express", label: "npm · @vergex402/express" },
                { href: "https://www.npmjs.com/package/@vergex402/hono", label: "npm · @vergex402/hono" },
                { href: "https://github.com/vergex402/verge/releases", label: "Releases" },
              ]}
            />
            <FooterCol
              title="Community"
              links={[
                { href: "https://x.com/vergesnowyx402", label: "X / Twitter" },
                { href: "https://www.x402.org", label: "x402.org" },
                { href: "https://ponsralph.xyz", label: "$VERGE on Pons" },
                { href: "/app", label: "Early access" },
              ]}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-gray-500 mb-3">
        {title}
      </div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              target={l.href.startsWith("http") ? "_blank" : undefined}
              rel={l.href.startsWith("http") ? "noopener" : undefined}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
