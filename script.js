// script.js · LITHIST
// 1) Doble clic / doble toque = ampliar (tarjetas normales: toda la tarjeta;
//    "Ilustración" y "Cambio de dinastía": solo sobre la foto o sobre el texto)
// 2) Secciones no disponibles = sello "NO DISPONIBLE"

(function () {
  "use strict";

  /* ---------- MODAL ---------- */
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML =
    '<div class="modal__panel" role="dialog" aria-modal="true" aria-label="Vista ampliada">' +
    '<button type="button" class="modal__close" aria-label="Cerrar">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5L19 19M19 5L5 19"/></svg>' +
    "</button>" +
    '<div class="modal__content"></div>' +
    "</div>";
  document.body.appendChild(modal);

  const content = modal.querySelector(".modal__content");
  const closeBtn = modal.querySelector(".modal__close");
  let lastFocus = null;

  const isOpen = function () {
    return modal.classList.contains("open");
  };

  function show(node) {
    lastFocus = document.activeElement;
    content.replaceChildren(node);
    content.scrollTop = 0;
    modal.classList.add("open");
    document.body.classList.add("no-scroll");
    closeBtn.focus({ preventScroll: true });
  }

  function closeModal() {
    if (!isOpen()) return;
    modal.classList.remove("open");
    document.body.classList.remove("no-scroll");
    content.replaceChildren();
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function cleanClone(el) {
    const c = el.cloneNode(true);
    c.removeAttribute("id");
    c.removeAttribute("tabindex");
    return c;
  }

  function newCardWrapper() {
    const w = document.createElement("div");
    w.className = "card modal-card";
    return w;
  }

  // Solo el texto de la tarjeta (títulos + párrafos), en grande
  function openText(card) {
    const w = newCardWrapper();
    card
      .querySelectorAll(":scope > .kicker, :scope > h2, :scope > h3, :scope > .text")
      .forEach(function (el) {
        w.appendChild(cleanClone(el));
      });
    show(w);
  }

  // Solo la imagen, en grande y a color
  function openImage(fig) {
    const img = fig && fig.querySelector("img");
    if (!img) return;
    const f = document.createElement("figure");
    f.className = "modal-figure";

    const big = document.createElement("img");
    big.src = img.currentSrc || img.src;
    big.alt = img.alt;
    f.appendChild(big);

    const cap = fig.querySelector("figcaption");
    if (cap) {
      const fc = document.createElement("figcaption");
      fc.textContent = cap.textContent;
      f.appendChild(fc);
    }

    const link = document.createElement("a");
    link.className = "modal-figure__link";
    link.href = big.src;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Abrir en pestaña nueva ↗";
    f.appendChild(link);

    show(f);
  }

  // Tarjeta normal: si solo tiene foto -> imagen; si no -> tarjeta completa
  function openCard(card) {
    const fig = card.querySelector(".photo");
    if (fig && !card.querySelector(".text")) {
      openImage(fig);
      return;
    }
    const w = newCardWrapper();
    Array.from(card.children).forEach(function (el) {
      w.appendChild(cleanClone(el));
    });
    show(w);
  }

  /* ---------- DETECCIÓN DE DOBLE CLIC (también con el dedo) ---------- */
  const DOUBLE_MS = 450;
  let last = { card: null, zone: null, time: 0 };

  function isDouble(card, zone) {
    const now = Date.now();
    const dbl = last.card === card && last.zone === zone && now - last.time < DOUBLE_MS;
    last = dbl ? { card: null, zone: null, time: 0 } : { card: card, zone: zone, time: now };
    return dbl;
  }

  document.addEventListener("click", function (e) {
    if (isOpen()) return;
    if (e.target.closest("a")) return; // los enlaces no cuentan
    const card = e.target.closest(".card");
    if (!card) return;
    if (card.hasAttribute("data-interactive")) return; // el juego no se amplía con doble clic

    // Tarjetas partidas: la foto y el texto se amplían por separado
    if (card.hasAttribute("data-split")) {
      const fig = e.target.closest(".photo");
      if (fig) {
        if (isDouble(card, "image")) openImage(fig);
      } else if (e.target.closest(".text, .kicker, h2, h3")) {
        if (isDouble(card, "text")) openText(card);
      } else {
        last = { card: null, zone: null, time: 0 }; // clic en zona vacía: no hace nada
      }
      return;
    }

    if (isDouble(card, "card")) openCard(card);
  });

  // Teclado: Enter sobre la tarjeta (texto) o sobre la foto enfocada (imagen)
  document.querySelectorAll(".card[data-split] .photo").forEach(function (f) {
    f.setAttribute("tabindex", "0");
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (isOpen()) {
      // mantener el foco dentro del modal
      if (e.key === "Tab") {
        const f = modal.querySelectorAll("button, a[href]");
        const first = f[0],
          lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          first.focus();
        }
      }
      return;
    }
    if (e.key !== "Enter") return;
    const t = e.target;
    if (t.classList.contains("card")) {
      if (t.hasAttribute("data-split")) openText(t);
      else openCard(t);
    } else if (t.classList.contains("photo") && t.closest("[data-split]")) {
      openImage(t);
    }
  });

  // Cerrar: botón ✕ o clic en el fondo oscuro (solo si el clic empezó y acabó fuera)
  let downOnBackdrop = false;
  modal.addEventListener("pointerdown", function (e) {
    downOnBackdrop = e.target === modal;
  });
  modal.addEventListener("click", function (e) {
    if (e.target.closest(".modal__close") || (e.target === modal && downOnBackdrop)) {
      closeModal();
    }
  });

  /* ---------- SECCIONES NO DISPONIBLES ---------- */
  const stamp = document.getElementById("stamp");
  let stampTimer;
  document.querySelectorAll(".sections button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.dataset.disponible === "no") {
        stamp.classList.remove("show");
        void stamp.offsetWidth; // reinicia la animación
        stamp.classList.add("show");
        clearTimeout(stampTimer);
        stampTimer = setTimeout(function () {
          stamp.classList.remove("show");
        }, 1800);
      } else {
        document.querySelectorAll(".sections button").forEach(function (b) {
          b.classList.toggle("active", b === btn);
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });

  /* ---------- FECHA DE HOY ---------- */
  const fechaEl = document.getElementById("fecha");
  if (fechaEl) {
    const hoy = new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    fechaEl.textContent = hoy.charAt(0).toUpperCase() + hoy.slice(1);
  }

  /* ---------- JUEGO: NOTICIAS FALSAS DEL SIGLO XVIII ---------- */
  // Todas las noticias salen de los artículos de esta misma página.
  // [titular, ¿es verdadera?, explicación]
  const NOTICIAS = [
    ["La Ilustración fue un movimiento intelectual del siglo XVIII.", true,
      "Verdadera. Promovió la transición del absolutismo a los movimientos políticos y sociales liberales."],
    ["La Guerra de Sucesión Española empezó tras la muerte de Felipe V.", false,
      "Falsa. Empezó tras la muerte de Carlos II, el último rey de la casa de Austria, que no dejó descendencia."],
    ["Los tratados de Utrecht (1713) y de Rastatt (1714) pusieron fin a la Guerra de Sucesión.", true,
      "Verdadera. Después Felipe V fue el primer rey de la dinastía de los Borbones."],
    ["El Neoclasicismo se basó en la cultura egipcia.", false,
      "Falsa. Se basó en la cultura grecorromana, intelectual y refinada."],
    ["Las fábulas tenían dos partes: una narrativa y otra reflexiva con la moraleja.", true,
      "Verdadera. La primera parte cuenta la historia y la segunda expone la moraleja."],
    ["Los protagonistas de las fábulas eran personas reales de la corte.", false,
      "Falsa. Eran animales que representaban a los seres humanos."],
    ["La poesía neoclásica se popularizó a partir de 1750.", true,
      "Verdadera. Se caracterizaba por el equilibrio, la claridad y la elegancia."],
    ["La literatura neoclásica evitaba la moraleja y la intención didáctica.", false,
      "Falsa. Destacaba la importancia de la educación y solía tener moraleja."]
  ];
  const lista = document.getElementById("nf-lista");
  const marcador = document.getElementById("nf-marcador");
  const reiniciar = document.getElementById("nf-reiniciar");

  if (lista && marcador && reiniciar) {
    const TOTAL = NOTICIAS.filter(function (n) { return !n[1]; }).length;
    let halladas = 0;
    let fallos = 0;

    const barajar = function (arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    };

    const pintarMarcador = function (final) {
      if (final) {
        marcador.textContent = "¡Buen olfato de periodista! Has descubierto las " + TOTAL +
          " noticias falsas" + (fallos ? " con " + fallos + (fallos === 1 ? " fallo." : " fallos.") : " sin ningún fallo.");
      } else {
        marcador.textContent = "Falsas descubiertas: " + halladas + " de " + TOTAL + " · Fallos: " + fallos;
      }
    };

    const revelar = function (btn, auto) {
      if (btn.dataset.hecho) return;
      btn.dataset.hecho = "1";
      const n = btn._noticia;
      btn.classList.add(n[1] ? "es-cierta" : "es-falsa");
      const sello = document.createElement("span");
      sello.className = "nf-sello";
      sello.textContent = n[1] ? "Verdadera" : "Falsa";
      const expl = document.createElement("span");
      expl.className = "nf-expl";
      expl.textContent = n[2];
      btn.appendChild(sello);
      btn.appendChild(expl);
      if (auto) return;
      if (n[1]) fallos++; else halladas++;
      if (halladas === TOTAL) {
        lista.querySelectorAll(".nf-item:not([data-hecho])").forEach(function (b) { revelar(b, true); });
        pintarMarcador(true);
      } else {
        pintarMarcador(false);
      }
    };

    const iniciar = function () {
      halladas = 0;
      fallos = 0;
      lista.replaceChildren();
      barajar(NOTICIAS).forEach(function (n) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "nf-item";
        b._noticia = n;
        const t = document.createElement("span");
        t.className = "nf-titular";
        t.textContent = n[0];
        b.appendChild(t);
        b.addEventListener("click", function () { revelar(b, false); });
        lista.appendChild(b);
      });
      pintarMarcador(false);
    };

    reiniciar.addEventListener("click", iniciar);
    iniciar();
  }

  console.log("LITHIST cargado. ¡Listo para la presentación!");
})();
