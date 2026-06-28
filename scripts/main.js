// ============================================================
// NEST OF AESTHETICS — main.js v2
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

  // --- Nav: scroll class ---
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  // --- Mobile nav toggle ---
  const hamburger  = document.querySelector('.nav__hamburger');
  const mobileNav  = document.querySelector('.nav__mobile');
  const mobileClose = document.querySelector('.nav__mobile-close');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      mobileNav.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }
  if (mobileClose && mobileNav) {
    mobileClose.addEventListener('click', () => {
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
  document.querySelectorAll('.nav__mobile a').forEach(a => {
    a.addEventListener('click', () => {
      mobileNav && mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // --- Active nav link ---
  const path = window.location.pathname;
  let normalizedPath = path;
  if (normalizedPath.endsWith('.html')) {
    normalizedPath = normalizedPath.slice(0, -5);
  }
  if (normalizedPath === '/index' || normalizedPath === '/home') {
    normalizedPath = '/';
  }

  document.querySelectorAll('.nav__links a, .nav__mobile a').forEach(a => {
    let href = a.getAttribute('href');
    if (!href) return;

    let normalizedHref = href;
    if (normalizedHref.endsWith('.html')) {
      normalizedHref = normalizedHref.slice(0, -5);
    }
    if (!normalizedHref.startsWith('/')) {
      normalizedHref = '/' + normalizedHref;
    }
    if (normalizedHref === '/index' || normalizedHref === '/home') {
      normalizedHref = '/';
    }

    if (normalizedPath === normalizedHref) {
      a.classList.add('active');
    } else {
      a.classList.remove('active');
    }
  });

  // ============================================================
  //  "ENTERING THE NEST" — scroll experience (home page only)
  // ============================================================
  const hero        = document.getElementById('hero');
  const heroImg     = document.querySelector('.hero__img');
  const heroContent = document.querySelector('.hero__content');
  const nestPortal  = document.querySelector('.hero__nest-portal');
  const nestDust    = document.querySelector('.hero__dust');

  // --- Remove entrance veil after animation completes (0.5s) ---
  const entranceVeil = document.querySelector('.page-entrance');
  if (entranceVeil) {
    setTimeout(() => { entranceVeil.style.display = 'none'; }, 900);
  }

  // --- Spawn warm glowing dust particles ---
  const dustContainer = document.getElementById('nestDust');
  if (dustContainer) {
    const COUNT = 25;
    for (let i = 0; i < COUNT; i++) {
      const p      = document.createElement('span');
      p.className  = 'dust-particle';
      const size   = Math.random() * 10 + 8;          // 8–18 px  ← bigger
      const left   = Math.random() * 100;              // 0–100%
      const bottom = Math.random() * 55;               // 0–55%
      const drift  = (Math.random() - 0.5) * 140;     // −70 to +70 px
      const dur    = Math.random() * 14 + 8;           // 8–22 s
      const delay  = -(Math.random() * 22);            // staggered start
      p.style.cssText = [
        `width:${size}px`,
        `height:${size}px`,
        `left:${left}%`,
        `bottom:${bottom}%`,
        `--drift:${drift}px`,
        `animation-duration:${dur}s`,
        `animation-delay:${delay}s`,
        `opacity:0`
      ].join(';');
      dustContainer.appendChild(p);
    }
  }

  // --- Hero image: trigger CSS reveal transition, then hand control to scroll ---
  if (heroImg) {
    // Step 1: reveal on load (CSS transition opacity 0→1, scale 1.08→1)
    const revealHero = () => {
      requestAnimationFrame(() => heroImg.classList.add('revealed'));
    };
    if (heroImg.complete && heroImg.naturalWidth > 0) {
      revealHero();
    } else {
      heroImg.addEventListener('load', revealHero);
      // Fallback in case image is cached and onload doesn't fire
      setTimeout(revealHero, 200);
    }

    // Step 2: after transition finishes (~1.8s), remove transition so JS scroll
    //         can drive transform freely with no CSS competing
    setTimeout(() => {
      heroImg.style.transition = 'none';
    }, 2000);
  }

  // --- Scroll-driven "entering the nest" effect ---
  if (hero && heroImg) {
    let rafId = null;

    const onNestScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        const scrollY  = window.scrollY;
        const heroH    = hero.offsetHeight;
        const progress = Math.min(scrollY / heroH, 1);   // 0 → 1

        // 1. Image: zoom IN (flying deeper into the nest)
        //    After 2s the inline transition is removed so this works cleanly
        heroImg.style.transform = `scale(${1 + progress * 0.25})`;

        // 2. Nest portal vignette: oval contracts as we "enter"
        if (nestPortal) {
          const xPct    = Math.max(65 - progress * 28, 37);    // 65% → 37%
          const yPct    = Math.max(60 - progress * 25, 35);    // 60% → 35%
          const dark    = Math.min(0.18 + progress * 0.7, 0.88);
          nestPortal.style.background =
            `radial-gradient(ellipse ${xPct}% ${yPct}% at 50% 52%, ` +
            `transparent 30%, rgba(14,10,6,${dark}) 100%)`;
        }

        // 3. Hero content: float up and fade as we pass through
        if (heroContent) {
          const fade = Math.max(1 - progress * 2.5, 0);
          heroContent.style.opacity   = fade;
          heroContent.style.transform = `translateY(${progress * -32}px)`;
        }

        // 4. Dust layer: drift upward as we move through it
        if (nestDust) {
          nestDust.style.transform = `translateY(${progress * -50}px)`;
          nestDust.style.opacity   = Math.max(1 - progress * 2, 0);
        }
      });
    };

    window.addEventListener('scroll', onNestScroll, { passive: true });
    // Run once immediately so the effect is set on load
    setTimeout(onNestScroll, 2100);   // after hero transition ends
  }

  // ============================================================
  //  INTERSECTION OBSERVER — fade animations
  // ============================================================
  const animatedEls = document.querySelectorAll('.fade-up, .fade-in');
  if (animatedEls.length) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const delay = entry.target.dataset.delay || 0;
              setTimeout(() => {
                entry.target.classList.remove('will-animate');
                entry.target.classList.add('in-view');
              }, Number(delay));
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

        animatedEls.forEach(el => {
          el.classList.add('will-animate');
          observer.observe(el);
        });
      });
    });
  }

  // ============================================================
  //  BLOG / SHOP CATEGORY FILTERS
  // ============================================================
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      document.querySelectorAll('[data-category]').forEach(card => {
        if (filter === 'all' || card.dataset.category === filter) {
          card.style.display = '';
          card.classList.remove('in-view');
          setTimeout(() => card.classList.add('in-view'), 50);
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // ============================================================
  //  NEWSLETTER FORM
  // ============================================================
  document.querySelectorAll('.newsletter__form').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const btn   = form.querySelector('button');
      if (input && input.value) {
        btn.textContent = 'You\'re in! ✦';
        btn.style.background  = 'var(--accent-sand)';
        input.value    = '';
        input.disabled = true;
        btn.disabled   = true;
      }
    });
  });

  // ============================================================
  //  CONTACT FORM
  // ============================================================
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', e => {
      e.preventDefault();
      const btn = contactForm.querySelector('.btn');
      if (!btn) return;
      btn.textContent = 'Message Sent ✦';
      btn.style.background  = 'var(--accent-sand)';
      btn.style.borderColor = 'var(--accent-sand)';
      setTimeout(() => {
        btn.textContent = 'Send Message';
        btn.style.background  = '';
        btn.style.borderColor = '';
        contactForm.reset();
      }, 3500);
    });
  }

  // ============================================================
  //  READING PROGRESS BAR
  // ============================================================
  const progressBar = document.getElementById('reading-progress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = docH > 0 ? (window.scrollY / docH * 100) + '%' : '0%';
    }, { passive: true });
  }

  // ============================================================
  //  LAZY LOAD IMAGES
  // ============================================================
  const lazyImgs = document.querySelectorAll('img[data-src]');
  if (lazyImgs.length) {
    const imgObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          imgObserver.unobserve(img);
        }
      });
    });
    lazyImgs.forEach(img => imgObserver.observe(img));
  }

});
