"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { japanNow } from "@/lib/dates";
import { ensureToday } from "@/lib/checklist";
import { restore, storageKey } from "@/lib/storage";
import { seedPhoto } from "@/lib/photos";
import type { Data } from "@/lib/types";

type AppContext = {
  data: Data | null;
  now: string;
  notice: string;
  offline: boolean;
  update: (change: (data: Data) => Data) => void;
  notify: (message: string) => void;
};
const Context = createContext<AppContext | null>(null);
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const currentData = useRef<Data | null>(null);
  const [now, setNow] = useState("");
  const [notice, notify] = useState("");
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(async () => {
      const current = japanNow();
      let raw: string | null = null;
      try {
        raw = localStorage.getItem(storageKey);
      } catch {
        notify("端末の保存領域を利用できません。変更はこの画面を閉じると失われます。");
      }
      const restored = restore(raw, current);
      const initial = ensureToday(restored.data, current);
      if (!active) return;
      setNow(current);
      currentData.current = initial;
      setData(initial);
      setOffline(!navigator.onLine);
      if (restored.recovered) notify("保存データが壊れていたため、既定データに戻しました。");
      try {
        localStorage.setItem(storageKey, JSON.stringify(initial));
      } catch {
        notify("保存できませんでした。端末の空き容量や保存設定を確認してください。");
      }
      if (initial.checks.some((c) => c.items.some((i) => i.photos.includes("sample-fridge")))) {
        try {
          await seedPhoto();
        } catch (e) {
          if (active) notify(String(e));
        }
      }
    });
    const timer = setInterval(() => {
      const current = japanNow();
      setNow(current);
      setData((previous) => {
        if (!previous) return previous;
        const next = ensureToday(previous, current);
        currentData.current = next;
        if (next !== previous) {
          try {
            localStorage.setItem(storageKey, JSON.stringify(next));
          } catch {
            queueMicrotask(() => notify("新しい営業日の記録を保存できませんでした。"));
          }
        }
        return next;
      });
    }, 15000);
    const connection = () => setOffline(!navigator.onLine);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => notify("オフライン機能を準備できませんでした。"));
    }
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, []);
  function update(change: (previous: Data) => Data) {
    if (!currentData.current) return;
    const next = change(currentData.current);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      notify("保存できませんでした。変更は反映していません。空き容量を確認してください。");
      return;
    }
    currentData.current = next;
    setData(next);
    setNow(japanNow());
  }
  return (
    <Context.Provider value={{ data, now, notice, offline, update, notify }}>
      {children}
    </Context.Provider>
  );
}
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("AppProvider is required");
  return value;
}
