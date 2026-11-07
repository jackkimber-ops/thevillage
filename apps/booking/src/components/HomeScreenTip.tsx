"use client";

import { useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

// C9 (opening day, from the C9 Booked design): "Keep the village on your phone". Android's Chrome can add
// the icon in one tap; on iPhone it's Safari's Share button, so we show how. Hidden once opened from the icon,
// or after "Not now" on this phone.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global {
  interface Window { villageInstall?: InstallEvent | null }
}

const HIDE = "village:home-screen-tip";
const noSubscribe = () => () => {};

/** In the root layout: keeps Chrome's one-tap install offer, which only fires once per page load. */
export function CatchInstallOffer() {
  useSyncExternalStore(
    (notify) => {
      const keep = (e: Event) => { e.preventDefault(); window.villageInstall = e as InstallEvent; notify(); };
      window.addEventListener("beforeinstallprompt", keep);
      return () => window.removeEventListener("beforeinstallprompt", keep);
    },
    () => null,
    () => null,
  );
  return null;
}

type Phone = "installed" | "iphone" | "android" | "other";

function whichPhone(): Phone {
  const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return "installed";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)) return "iphone";
  if (/Android/.test(ua)) return "android";
  return "other";
}

function saidNotNow(key: string): boolean {
  try {
    return Boolean(localStorage.getItem(key));
  } catch {
    return false; // private mode: show it
  }
}

export type HomeScreenText = Record<"title" | "body" | "bodyIphone" | "showMe" | "add" | "notNow" | "iphone1" | "iphone2" | "iphone3" | "android1" | "android2", string>;

/** `text`: fixed wording instead of the site's language (the staff app is English only). */
export function HomeScreenTip({ always = false, text, hideKey = HIDE }: { always?: boolean; text?: HomeScreenText; hideKey?: string }) {
  const translate = useTranslations("homeScreen");
  const t = (k: keyof HomeScreenText) => (text ? text[k] : translate(k));
  const phone = useSyncExternalStore(noSubscribe, whichPhone, () => "installed" as Phone);
  const notNow = useSyncExternalStore(noSubscribe, () => saidNotNow(hideKey), () => true);
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  // Phones only; `always` (the menu) ignores "Not now".
  if (gone || phone === "installed" || phone === "other" || (notNow && !always)) return null;

  async function add() {
    const offer = window.villageInstall;
    if (!offer) return setOpen(true);
    await offer.prompt();
    window.villageInstall = null;
    if ((await offer.userChoice).outcome === "accepted") setGone(true);
  }

  return (
    <div className="card home-tip">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" width={44} height={44} className="home-tip-icon" />
      <div style={{ flex: 1 }}>
        <strong>{t("title")}</strong>
        <p className="muted small" style={{ margin: "2px 0 0" }}>{t(phone === "iphone" ? "bodyIphone" : "body")}</p>
        {open && (
          <ol className="small home-tip-steps">
            {phone === "iphone" ? (
              <><li>{t("iphone1")}</li><li>{t("iphone2")}</li><li>{t("iphone3")}</li></>
            ) : (
              <><li>{t("android1")}</li><li>{t("android2")}</li></>
            )}
          </ol>
        )}
        <div className="row" style={{ gap: 14, marginTop: 6 }}>
          {!open && (
            <button type="button" className="link-button" onClick={phone === "android" ? add : () => setOpen(true)}>
              {phone === "android" ? t("add") : t("showMe")}
            </button>
          )}
          {!always && (
            <button
              type="button"
              className="link-button muted"
              onClick={() => {
                try { localStorage.setItem(hideKey, "1"); } catch { /* fine */ }
                setGone(true);
              }}
            >
              {t("notNow")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
