"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const authDisabled = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";

type NavItem = {
  href: Route;
  label: string;
  match?: string;
};

const navItems: NavItem[] = [
  { href: "/cars?search=true", label: "Search", match: "/cars" },
  { href: "/cars?sort=recently_imported_desc", label: "Cars", match: "/cars" },
  { href: "/research", label: "Research", match: "/research" },
  { href: "/admin/chassis-seed", label: "Seed", match: "/admin/chassis-seed" },
  { href: "/admin/scope", label: "Scope", match: "/admin/scope" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/sources", label: "Sources" },
  { href: "/request-lab", label: "Lab" },
  { href: "/settings", label: "Settings" }
] as const;

export function TopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandActive = pathname === "/dashboard";
  const isCarsRoute = pathname === "/cars";
  const hasSearchState = hasCarsSearchState(searchParams);

  return (
    <nav className="topnav">
      <Link className={`topnav__brand${brandActive ? " topnav__brand--active" : ""}`} href="/dashboard">
        <span className="topnav__brandcopy">
          <span className="topnav__brandtext">DigitalBarnFinds</span>
          <span className="topnav__brandsub">Registry</span>
        </span>
      </Link>
      <div className="topnav__menu">
        {navItems.map((item) => {
          const active =
            item.label === "Search"
              ? isCarsRoute && hasSearchState
              : item.label === "Cars"
                ? isCarsRoute && !hasSearchState
                : item.label === "Research"
                  ? pathname === "/research" || pathname.includes("/provenance")
                  : item.match
                    ? pathname.startsWith(item.match)
                    : pathname === item.href;
          return (
            <Link
              key={`${item.href}-${item.label}`}
              className={`pill${active ? " pill--active" : ""}`}
              href={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
      {authDisabled ? null : (
        <a className="signout signout--nav" href="/api/auth/signout?callbackUrl=/signin">
          Sign out
        </a>
      )}
    </nav>
  );
}

function hasCarsSearchState(searchParams: URLSearchParams) {
  const meaningfulKeys = [
    "q",
    "query",
    "make",
    "model",
    "source",
    "serial_number",
    "score_min",
    "last_seen_before",
    "dark_now",
    "has_images",
    "candidates_only",
    "search"
  ];
  return meaningfulKeys.some((key) => searchParams.get(key));
}
