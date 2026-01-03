// src/app/menu/DQMenu.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/app/auth/login/actions";

type Item = {
  id: "record" | "signup" | "login" | "logout";
  label: string;
  visible: boolean;
  action: () => void;
};

export default function DQMenu({ isLoggedIn }: { isLoggedIn: boolean }) {
  const router = useRouter();
  const logoutFormRef = useRef<HTMLFormElement | null>(null);

  const items = useMemo<Item[]>(() => {
    return [
      {
        id: "record",
        label: "きろくをする",
        visible: isLoggedIn,
        action: () => router.push("/record"), // ← あなたの記録ページ（表）へ
      },
      {
        id: "signup",
        label: "新規登録する",
        visible: !isLoggedIn,
        action: () => router.push("/auth/signup"),
      },
      {
        id: "login",
        label: "ログインする",
        visible: !isLoggedIn,
        action: () => router.push("/auth/login"),
      },
      {
        id: "logout",
        label: "ログアウトする",
        visible: isLoggedIn,
        action: () => logoutFormRef.current?.requestSubmit(),
      },
    ];
  }, [isLoggedIn, router]);

  const visibleItems = useMemo(() => items.filter((x) => x.visible), [items]);

  const [cursor, setCursor] = useState(0);

  // 表示項目が変わった時にカーソルを安全位置に
  useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(visibleItems.length - 1, 0)));
  }, [visibleItems.length]);

  // ↑↓ Enter の操作
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (visibleItems.length === 0) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => (c - 1 + visibleItems.length) % visibleItems.length);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => (c + 1) % visibleItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        visibleItems[cursor]?.action();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cursor, visibleItems]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black p-6">
      {/* 隠しログアウトフォーム（Enterで発火させる） */}
      <form ref={logoutFormRef} action={logout} className="hidden" />

      <div className="w-full max-w-xl space-y-4">
        <div className="text-white font-mono text-xl tracking-wider">
          oktm&apos;s Adventure Log
        </div>

        {/* ダイアログ風 */}
        <div className="text-white font-mono">
          <div className="rounded-2xl border-2 border-white p-5 shadow-[0_0_0_2px_rgba(255,255,255,0.25)]">
            <div className="mb-3 text-sm opacity-90">
              コマンド？（↑↓でえらぶ / Enterでけってい）
            </div>

            <ul className="space-y-2">
              {visibleItems.map((it, idx) => {
                const active = idx === cursor;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => it.action()}
                      className={[
                        "w-full text-left rounded px-2 py-1",
                        "hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30",
                        active ? "bg-white/10" : "",
                      ].join(" ")}
                    >
                      <span className="inline-block w-6">
                        {active ? (
                          <span className="inline-block animate-pulse">▶</span>
                        ) : (
                          " "
                        )}
                      </span>
                      <span className="tracking-widest">{it.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
