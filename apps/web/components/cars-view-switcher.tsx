"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type CarsViewSwitcherProps = {
  activeView: "cards" | "data";
  cardsHref: string;
  dataHref: string;
};

export function CarsViewSwitcher({ activeView, cardsHref, dataHref }: CarsViewSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pendingView =
    isPending && activeView === "cards"
      ? "data"
      : isPending && activeView === "data"
        ? "cards"
        : null;

  const navigate = (targetView: "cards" | "data", href: string) => {
    if (activeView === targetView || isPending) {
      return;
    }

    startTransition(() => {
      router.push(href as Route);
    });
  };

  const renderOption = (
    targetView: "cards" | "data",
    label: string,
    hint: string,
    href: string,
  ) => {
    const isActive = activeView === targetView;
    const isLoading = pendingView === targetView;

    return (
      <button
        aria-busy={isLoading}
        className={`view-switcher__option${isActive ? " view-switcher__option--active" : ""}${isLoading ? " view-switcher__option--pending" : ""}`}
        disabled={isPending}
        onClick={() => navigate(targetView, href)}
        type="button"
      >
        <span className="view-switcher__label-row">
          <span className="view-switcher__label">{label}</span>
          {isLoading ? <span aria-hidden="true" className="view-switcher__spinner" /> : null}
        </span>
        <span className="view-switcher__hint">{isLoading ? "loading results" : hint}</span>
      </button>
    );
  };

  return (
    <div aria-label="View mode" className="view-switcher">
      {renderOption("cards", "Web view", "cards and dossier layout", cardsHref)}
      {renderOption("data", "Data view", "table and export workflow", dataHref)}
    </div>
  );
}
