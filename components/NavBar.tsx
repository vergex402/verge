export default function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 py-3 md:px-8 md:py-4">
      <div className="bg-[#171719] rounded-2xl shadow-lg shadow-black/20 w-auto px-4 py-2 max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <img
              src="/verge-logo.jpeg"
              alt="Verge"
              className="h-7 w-7 md:h-8 md:w-8 rounded-lg"
              width={32}
              height={32}
            />
            <span className="font-[var(--font-display)] text-sm font-medium text-white md:text-base">
              verge
            </span>
          </a>

          {/* Center links */}
          <div className="hidden items-center gap-6 md:flex">
            <a href="#how" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              How it works
            </a>
            <a href="#networks" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Networks
            </a>
            <a href="#pricing" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Pricing
            </a>
            <a href="/docs" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">
              Docs
            </a>
            <a
              href="https://github.com/vergex402/verge"
              target="_blank"
              rel="noopener"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
            >
              GitHub
            </a>
            <a
              href="https://www.npmjs.com/package/@vergex402/express"
              target="_blank"
              rel="noopener"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
            >
              npm
            </a>
            <a
              href="https://x.com/vergesnowy402"
              target="_blank"
              rel="noopener"
              className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
            >
              Twitter
            </a>
            <a
              href="/verge"
              className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
            >
              $VERGE
            </a>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <a
              href="/app"
              className="bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-emerald-400"
            >
              Get access
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
