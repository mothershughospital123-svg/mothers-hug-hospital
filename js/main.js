document.addEventListener("DOMContentLoaded", () => {
  /* ---------- Ambient background videos: play only while visible ---------- */
  const bgVideos = document.querySelectorAll(".js-bg-video");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (bgVideos.length) {
    if (reduceMotion) {
      bgVideos.forEach((v) => v.pause());
    } else if ("IntersectionObserver" in window) {
      const vio = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.play().catch(() => {});
          else entry.target.pause();
        });
      }, { threshold: 0.15 });
      bgVideos.forEach((v) => vio.observe(v));
    } else {
      bgVideos.forEach((v) => v.play().catch(() => {}));
    }
  }

  /* ---------- Year in footer ---------- */
  document.querySelectorAll("[data-year]").forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- Sticky nav shadow ---------- */
  const nav = document.querySelector(".site-nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const mobileMenu = document.querySelector(".mobile-menu");
  if (toggle && mobileMenu) {
    toggle.addEventListener("click", () => {
      toggle.classList.toggle("open");
      mobileMenu.classList.toggle("open");
    });
    mobileMenu.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        toggle.classList.remove("open");
        mobileMenu.classList.remove("open");
      });
    });
  }

  /* ---------- Highlight active nav link ---------- */
  const path = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a, .mobile-menu a").forEach(a => {
    const href = a.getAttribute("href");
    if (href === path || (path === "" && href === "index.html")) {
      a.classList.add("active");
    }
  });

  /* ---------- Scroll reveal ---------- */
  const revealTargets = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");
  if ("IntersectionObserver" in window && revealTargets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
    revealTargets.forEach(el => io.observe(el));
  } else {
    revealTargets.forEach(el => el.classList.add("in"));
  }

  /* ---------- 3D tilt on cards ---------- */
  const tiltEls = document.querySelectorAll("[data-tilt]");
  const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (supportsHover) {
    tiltEls.forEach(el => {
      let frame = null;
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          el.style.transform = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) translateY(-4px)`;
        });
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "perspective(900px) rotateY(0) rotateX(0) translateY(0)";
      });
    });
  }

  /* ---------- Doctor profile accordion ---------- */
  document.querySelectorAll(".doctor-more").forEach(btn => {
    btn.addEventListener("click", () => {
      const detail = btn.nextElementSibling;
      const isOpen = btn.classList.contains("open");
      btn.classList.toggle("open", !isOpen);
      btn.querySelector("span").textContent = isOpen ? "View full profile" : "Hide full profile";
      detail.style.maxHeight = isOpen ? "0px" : detail.scrollHeight + "px";
    });
  });

  /* ---------- Gallery lightbox ---------- */
  const lightbox = document.querySelector(".lightbox");
  if (lightbox) {
    const visual = lightbox.querySelector(".lightbox-visual");
    const label = lightbox.querySelector("[data-lb-label]");
    const title = lightbox.querySelector("[data-lb-title]");
    const desc = lightbox.querySelector("[data-lb-desc]");

    document.querySelectorAll(".gallery-tile").forEach(tile => {
      tile.addEventListener("click", () => {
        visual.style.background = tile.querySelector(".tile-bg").style.background;
        label.textContent = tile.dataset.label || "";
        title.textContent = tile.dataset.title || "";
        desc.textContent = tile.dataset.desc || "";
        lightbox.classList.add("open");
        document.body.style.overflow = "hidden";
      });
    });

    const closeLb = () => {
      lightbox.classList.remove("open");
      document.body.style.overflow = "";
    };
    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLb);
    lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLb(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLb(); });
  }

  /* ---------- Contact form ---------- */
  const form = document.getElementById("contact-form");
  if (form) {
    const msg = form.querySelector(".form-message");
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      msg.className = "form-message";
      const originalLabel = submitBtn.textContent;
      submitBtn.textContent = "Sending...";
      submitBtn.disabled = true;

      const payload = {
        firstName: form.firstName.value.trim(),
        email: form.email.value.trim(),
        message: form.message.value.trim(),
      };

      try {
        const res = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Request failed");
        msg.textContent = "Thank you — your message has been sent. Our team will get back to you shortly.";
        msg.classList.add("show", "ok");
        form.reset();
      } catch (err) {
        msg.textContent = "Something went wrong sending your message. Please email us directly at contact@mothershughospital.com.";
        msg.classList.add("show", "err");
      } finally {
        submitBtn.textContent = originalLabel;
        submitBtn.disabled = false;
      }
    });
  }
});
