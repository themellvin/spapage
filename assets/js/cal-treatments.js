"use strict";

(function initializeTreatmentCalPopups() {
  const treatmentCards = document.querySelectorAll("[data-cal-book]");

  if (treatmentCards.length === 0) return;

  const namespace = "spa-treatments";
  const origin = "https://calcom.run.place";
  const uiConfig = {
    cssVarsPerTheme: {
      light: {
        "cal-brand": "#C9A227",
        "cal-text": "#24352D",
        "cal-text-emphasis": "#183B2F",
        "cal-bg": "#F8F3EA",
      },
    },
    hideEventTypeDetails: false,
    layout: "month_view",
    theme: "light",
  };

  treatmentCards.forEach((card) => {
    const calBook = card.dataset.calBook || "";
    const slug = calBook.replace(/^admin\//, "");
    if (!slug) return;
    card.setAttribute("href", `book.html?t=${encodeURIComponent(slug)}`);
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    const card = target instanceof Element
      ? target.closest("[data-cal-book]")
      : null;

    if (!card || typeof window.Cal?.ns?.[namespace] !== "function") return;

    const calLink = card.dataset.calBook;
    if (!calLink) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    window.Cal.ns[namespace]("ui", uiConfig);
    window.Cal.ns[namespace]("modal", {
      calLink,
      config: {
        layout: "month_view",
        useSlotsViewOnSmallScreen: "true",
      },
    });
  }, true);

  (function (C, A, L) {
    const queue = function (api, args) {
      api.q.push(args);
    };

    C.Cal = C.Cal || function () {
      const cal = C.Cal;
      const args = arguments;

      if (!cal.loaded) {
        cal.ns = {};
        cal.q = cal.q || [];
        C.document.head.appendChild(C.document.createElement("script")).src = A;
        cal.loaded = true;
      }

      if (args[0] === L) {
        const api = function () { queue(api, arguments); };
        const name = args[1];
        api.q = api.q || [];
        cal.ns[name] = cal.ns[name] || api;
        queue(cal.ns[name], args);
        queue(cal, ["initNamespace", name]);
      } else {
        queue(cal, args);
      }
    };
  })(window, `${origin}/embed/embed.js`, "init");

  window.Cal("init", namespace, { origin });
  window.Cal.ns[namespace]("ui", uiConfig);
})();
