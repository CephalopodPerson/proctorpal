"use client";

// Renders question-attached media: image or YouTube embed.
// We pass `?rel=0&modestbranding=1` to YouTube to suppress related videos
// and most overlays. The student can still try to fullscreen the player —
// FullscreenGuard ignores element-level fullscreen and only fires on
// document exit, so that's fine.

import Image from "next/image";

export function QuestionMedia({
  imageUrl,
  youtubeId,
}: {
  imageUrl: string | null;
  youtubeId: string | null;
}) {
  if (!imageUrl && !youtubeId) return null;
  return (
    <div className="my-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {imageUrl && (
        <div className="relative w-full aspect-[16/9]">
          <Image src={imageUrl} alt="" fill className="object-contain" />
        </div>
      )}
      {youtubeId && (
        <div className="relative w-full aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`}
            title="Question video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
            className="absolute inset-0 h-full w-full"
          />
        </div>
      )}
    </div>
  );
}
