"use strict";

(function normalizeTreatmentBookingLinks() {
  const treatmentCards = document.querySelectorAll("[data-cal-book]");

  if (treatmentCards.length === 0) return;

  treatmentCards.forEach((card) => {
    const calBook = card.dataset.calBook || "";
    const slug = calBook.replace(/^admin\//, "");
    if (!slug) return;
    card.setAttribute("href", `book.html?t=${encodeURIComponent(slug)}`);
  });
})();
