"use strict";

/* =========================================================
   TREATMENT CAROUSEL
   ========================================================= */

(function initialiseTreatmentCarousel() {
  const carousel = document.getElementById("treatmentCarousel");
  const status = document.getElementById("treatmentCarouselStatus");
  const controls = Array.from(
    document.querySelectorAll("[data-carousel-direction]")
  );

  if (!carousel) {
    return;
  }

  /*
   * Do not use :scope > here.
   * This works even if the cards are later wrapped in another element.
   */
  const cards = Array.from(
    carousel.querySelectorAll(".treatment-card")
  );

  if (cards.length === 0) {
    console.warn("Treatment carousel: no treatment cards found.");
    return;
  }

  let currentPage = 0;
  const cardsPerPage = 6;

  function getTotalPages() {
    return Math.ceil(cards.length / cardsPerPage);
  }

  function updateControls(totalPages) {
    controls.forEach((button) => {
      const direction = Number(
        button.dataset.carouselDirection
      );

      button.disabled =
        (direction === -1 && currentPage === 0) ||
        (direction === 1 && currentPage === totalPages - 1);
    });
  }

  function renderCarousel() {
    const totalPages = getTotalPages();

    if (currentPage > totalPages - 1) {
      currentPage = Math.max(totalPages - 1, 0);
    }

    const firstIndex = currentPage * cardsPerPage;
    const lastIndex = firstIndex + cardsPerPage;

    cards.forEach((card, index) => {
      const shouldShow =
        index >= firstIndex &&
        index < lastIndex;

      card.classList.toggle(
        "treatment-card-hidden",
        !shouldShow
      );

      card.setAttribute(
        "aria-hidden",
        String(!shouldShow)
      );
    });

    carousel.classList.add("is-ready");

    if (status) {
      const firstTreatment = cards.length === 0
        ? 0
        : firstIndex + 1;

      const lastTreatment = Math.min(
        lastIndex,
        cards.length
      );

      status.textContent =
        `Showing ${firstTreatment}-${lastTreatment} of ${cards.length} treatments`;
    }

    updateControls(totalPages);
  }

  controls.forEach((button) => {
    button.addEventListener("click", () => {
      const direction = Number(
        button.dataset.carouselDirection
      );

      const totalPages = getTotalPages();
      const nextPage = currentPage + direction;

      if (nextPage < 0 || nextPage >= totalPages) {
        return;
      }

      currentPage = nextPage;
      renderCarousel();

      document
        .getElementById("treatments")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    });
  });

  let resizeTimer;

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);

    resizeTimer = window.setTimeout(() => {
      renderCarousel();
    }, 150);
  });

  renderCarousel();

})();

/* =========================================================
   CURRENT YEAR
   ========================================================= */

(function setCurrentYear() {
  const yearElements = document.querySelectorAll(
    "[data-current-year]"
  );

  const currentYear = new Date().getFullYear();

  yearElements.forEach((element) => {
    element.textContent = String(currentYear);
  });
})();

