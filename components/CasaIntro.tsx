"use client";

import { useEffect, useState } from "react";

export default function CasaIntro() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let finished = false;

    const finishIntro = () => {
      if (finished) return;
      finished = true;
      document.documentElement.classList.add("casa-intro-finished");
      setVisible(false);
    };

    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem("casa-intro-seen") === "true";
    } catch {
      // O intro continua a funcionar mesmo quando o browser bloqueia storage.
    }

    if (alreadySeen) {
      finishIntro();
      return;
    }

    const failsafeTimer = window.setTimeout(finishIntro, 6000);
    const exitTimer = window.setTimeout(() => {
      setExiting(true);
    }, 1500);

    const hideTimer = window.setTimeout(() => {
      try {
        sessionStorage.setItem("casa-intro-seen", "true");
      } catch {
        // A preferência de sessão é opcional; esconder o intro não é.
      } finally {
        finishIntro();
      }
    }, 2100);

    return () => {
      window.clearTimeout(failsafeTimer);
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`casa-intro ${exiting ? "casa-intro-exit" : ""}`}
      aria-label="CASA"
      role="status"
    >
      <div className="casa-intro-content">
        <div className="casa-intro-logo">CASA</div>

        <div className="casa-intro-line">
          <span />
        </div>

        <p className="casa-intro-caption">
          A CULTURA MUSICAL TEM CASA
        </p>
      </div>
    </div>
  );
}