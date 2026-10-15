"use client"

import Link from "next/link"
import Image from "next/image"

export function Header() {
  return (
  <header className="sticky top-0 z-50 text-foreground mt-4 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800">
  <div className="w-full flex items-center justify-center px-5 py-4">
        <Link href="/" className="flex items-center">
          <span className="font-cinzel text-3xl sm:text-4xl font-medium tracking-widest text-orange-500 drop-shadow-sm">
            PYRO
          </span>
          <Image
            src="/PyroPathLogo1.png"
            alt="PyroPath logo"
            width={40}
            height={40}
            className="rounded-sm translate-y-3"
            priority
          />
          <span className="font-cinzel text-3xl sm:text-4xl font-medium tracking-widest text-orange-400 drop-shadow-sm">
            PATH
          </span>
        </Link>
      </div>
    </header>
  )
}
