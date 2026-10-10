"use strict";

(function initializeCalBookingPage() {
  const container = document.getElementById("cal-all-treatments");

  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const shortTreatment = params.get("t");
  const legacyCalLink = params.get("calLink");
  const legacySegments = (legacyCalLink || "").split("/").filter(Boolean);
  const routeMatch = window.location.pathname.match(/(?:^|\/)book\/([a-z0-9-]+)\/?$/i);
  const slug = shortTreatment || routeMatch?.[1] || legacySegments[legacySegments.length - 1] || "";
  const title = document.getElementById("bookingTreatmentTitle");
  const origin = "https://calcom.run.place";
  const namespace = "spa-booking";
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

  if (
    (slug && !/^[a-z0-9-]+$/i.test(slug)) ||
    legacySegments.some((segment) => !/^[a-z0-9-]+$/i.test(segment))
  ) {
    showBookingError("This treatment booking link is invalid.");
    return;
  }

  const calLink = shortTreatment
    ? `admin/${slug}`
    : legacySegments.length
      ? legacySegments.join("/")
      : "admin";

  if (title && slug !== "admin") {
    title.textContent = slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  function showBookingError(message) {
    const notice = document.createElement("p");
    notice.className = "cal-booking-error";
    notice.setAttribute("role", "status");
    notice.textContent = message;
    container.replaceChildren(notice);
  }

  function startEmbed() {
    if (typeof window.Cal !== "function" || !window.Cal.ns) {
      showBookingError("The booking calendar did not load. Use the direct Cal.com link below.");
      return;
    }

    const cal = window.Cal.ns[namespace];
    cal("inline", {
      elementOrSelector: "#cal-all-treatments",
      calLink,
      config: {
        layout: "month_view",
        useSlotsViewOnSmallScreen: "true",
      },
    });
    cal("ui", uiConfig);
  }

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
        const script = C.document.createElement("script");
        script.src = A;
        script.async = true;
        script.onload = startEmbed;
        script.onerror = function () {
          showBookingError("The booking calendar could not connect. Use the direct Cal.com link below.");
        };
        C.document.head.appendChild(script);
        cal.loaded = true;
      }
      if (args[0] === L) {
        const api = function () { queue(api, arguments); };
        const name = args[1];
        api.q = api.q || [];
        cal.ns[name] = cal.ns[name] || api;
        queue(cal.ns[name], args);
        queue(cal, ["initNamespace", name]);
        return;
      }
      queue(cal, args);
    };
  })(window, `${origin}/embed/embed.js`, "init");

  window.Cal("init", namespace, { origin });
  window.Cal.ns[namespace]("ui", uiConfig);

  const fallback = document.createElement("a");
  fallback.href = `${origin}/${calLink.split("/").map(encodeURIComponent).join("/")}`;
  fallback.target = "_blank";
  fallback.rel = "noopener noreferrer";
  fallback.className = "cal-booking-fallback";
  fallback.textContent = "Open this treatment directly on Calcom.run.place";
  container.after(fallback);
})();
