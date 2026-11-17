"use client";
import { useEffect, useState } from "react";
import { getPhoto } from "@/lib/photos";

export function Photo({ id }: { id: string }) {
  const [url, setUrl] = useState("");
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    let objectUrl = "";
    let active = true;
    getPhoto(id)
      .then((blob) => {
        if (!active) return;
        if (blob) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        } else setMissing(true);
      })
      .catch(() => {
        if (active) setMissing(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id]);
  if (!url)
    return (
      <span className="muted">
        {missing ? "写真は削除済み、または読み込めません" : "写真を読み込み中…"}
      </span>
    );
  // Local IndexedDB blobs are already resized before saving.
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="photo"
        src={url}
        alt={id.startsWith("sample-") ? "サンプル画像（架空）" : "チェック項目の添付写真"}
      />
    </a>
  );
}
