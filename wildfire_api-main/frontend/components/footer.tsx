"use client"

export function Footer() {
  return (
    <footer className="w-full bg-transparent mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="flex items-center justify-center">
          <p className="text-xs md:text-sm text-muted-foreground font-inter text-center">
            © {new Date().getFullYear()} Impact Ventures | PyroPath™ - an interactive, audience-adapted platform
          </p>
        </div>
      </div>
    </footer>
  )
}