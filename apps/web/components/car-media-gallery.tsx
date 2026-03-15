"use client";

import { useEffect, useState } from "react";

import type { CarRow } from "@/lib/api";

type CarMediaGalleryProps = {
  serialNumber: string;
  sources: CarRow["sources"];
  media: CarRow["media"];
};

const supportedExtensions = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "avif",
  "bmp",
  "jfif"
]);

const stronglyPreferredExtensions = ["jpg", "jpeg", "png", "webp", "avif", "gif"];
const sizePenaltyTokens = ["thumb", "thumbnail", "icon", "sprite", "small", "tiny", "preview"];
const sizeBoostTokens = ["large", "full", "original", "hires", "hero", "xl", "xlarge", "2048", "1600", "1200", "1024"];

export function CarMediaGallery({ serialNumber, sources, media }: CarMediaGalleryProps) {
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [leadIndex, setLeadIndex] = useState(0);
  const rankedMedia = rankMedia(media).filter((item) => !failedUrls.includes(item.url));
  const normalizedLeadIndex = rankedMedia.length > 0 ? leadIndex % rankedMedia.length : 0;
  const leadMedia = rankedMedia[normalizedLeadIndex];
  const galleryMedia = rankedMedia.filter((_, index) => index !== normalizedLeadIndex);

  useEffect(() => {
    if (rankedMedia.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setLeadIndex((current) => (current + 1) % rankedMedia.length);
    }, 4200);

    return () => window.clearInterval(timer);
  }, [rankedMedia.length]);

  useEffect(() => {
    if (normalizedLeadIndex >= rankedMedia.length) {
      setLeadIndex(0);
    }
  }, [normalizedLeadIndex, rankedMedia.length]);

  if (!leadMedia) {
    return (
      <div className="dossier-card__hero dossier-card__hero--empty">
        <div className="dossier-card__hero-placeholder">No photos</div>
      </div>
    );
  }

  return (
    <>
      <a className="dossier-card__hero" href={leadMedia.url} rel="noreferrer" target="_blank">
        <img
          alt={leadMedia.caption ?? `${serialNumber} lead image`}
          className="dossier-card__hero-image"
          onError={() => markFailed(leadMedia.url, setFailedUrls)}
          src={leadMedia.url}
        />
        <span className="dossier-card__hero-caption">
          {leadMedia.caption ?? `Lead image from ${sources[0]?.source_name ?? "source"}`}
        </span>
      </a>

      {galleryMedia.length > 0 ? (
        <section className="dossier-panel">
          <div className="dossier-panel__header">
            <h3 className="dossier-panel__title">Images</h3>
            <span className="panel-count">{rankedMedia.length} renderable</span>
          </div>
          <div className="media-grid">
            {galleryMedia.map((item, index) => (
              <a
                className="media-card"
                href={item.url}
                key={`${serialNumber}-${item.url}-${index}`}
                rel="noreferrer"
                target="_blank"
              >
                <img
                  alt={item.caption ?? `${serialNumber} image ${index + 2}`}
                  className="media-card__image"
                  onError={() => markFailed(item.url, setFailedUrls)}
                  src={item.url}
                />
                <span className="media-card__caption">{item.caption ?? `Source image ${index + 2}`}</span>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function markFailed(url: string, setFailedUrls: React.Dispatch<React.SetStateAction<string[]>>) {
  setFailedUrls((current) => (current.includes(url) ? current : [...current, url]));
}

function rankMedia(media: CarRow["media"]) {
  const deduped = new Map<string, CarRow["media"][number]>();

  media.forEach((item) => {
    if (!deduped.has(item.url)) {
      deduped.set(item.url, item);
    }
  });

  return Array.from(deduped.values())
    .filter(isRenderableMedia)
    .sort((left, right) => mediaScore(right) - mediaScore(left));
}

function isRenderableMedia(item: CarRow["media"][number]) {
  const mediaType = item.media_type.toLowerCase();
  const extension = getExtension(item.url);

  if (extension && !supportedExtensions.has(extension)) {
    return false;
  }

  if (mediaType && mediaType !== "photo" && mediaType !== "image" && !mediaType.startsWith("image/")) {
    return false;
  }

  return true;
}

function mediaScore(item: CarRow["media"][number]) {
  const url = item.url.toLowerCase();
  const caption = (item.caption ?? "").toLowerCase();
  const mediaType = item.media_type.toLowerCase();
  const extension = getExtension(item.url);

  let score = 0;

  if (mediaType === "photo" || mediaType === "image" || mediaType.startsWith("image/")) {
    score += 30;
  }

  if (extension) {
    if (supportedExtensions.has(extension)) {
      score += 24;
    }

    const preferredIndex = stronglyPreferredExtensions.indexOf(extension);
    if (preferredIndex >= 0) {
      score += 12 - preferredIndex;
    }
  } else {
    score += 8;
  }

  if (sizeBoostTokens.some((token) => url.includes(token))) {
    score += 10;
  }

  if (sizePenaltyTokens.some((token) => url.includes(token))) {
    score -= 18;
  }

  if (caption.includes("thumbnail") || caption.includes("thumb")) {
    score -= 18;
  }

  if (caption.includes("logo") || caption.includes("registry")) {
    score -= 8;
  }

  if (url.startsWith("http://www.barchetta.cc/") && url.includes("_files/")) {
    score -= 40;
  }

  if (url.includes("/media/local?path=") || url.startsWith("file://")) {
    score += 20;
  }

  return score;
}

function getExtension(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const match = url.pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
    return match?.[1] ?? "";
  } catch {
    const stripped = rawUrl.split("?")[0]?.toLowerCase() ?? "";
    const match = stripped.match(/\.([a-z0-9]+)$/);
    return match?.[1] ?? "";
  }
}
