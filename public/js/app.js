/**
 * MIMORI DIGITAL - WHITE THEME APPLICATION SCRIPT
 * Manages sticky navigation, Bilimbe-style hero carousel slider,
 * interactive services accordion with dynamic live preview,
 * flash simulator, status tracker, and FAQ accordion.
 */

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E31D1C" stroke-width="2.5">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Header scroll effect
  const header = document.querySelector('.site-header');
  function updateHeaderScroll() {
    if (header) {
      if (window.scrollY > 20) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    }
  }
  window.addEventListener('scroll', updateHeaderScroll, { passive: true });
  updateHeaderScroll();

  // Mobile menu toggle
  const mobileToggle = document.querySelector('.mobile-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  // 1b. Active Navigation State Controller (Avenir: Medium for inactive, Bold for active)
  const navLinks = document.querySelectorAll('.site-header .nav-link');
  const mobileLinks = document.querySelectorAll('.mobile-nav-links a');
  const observedSectionIds = ['hero', 'showcase', 'about', 'gallery', 'services', 'branches', 'testimonials', 'faq'];

  function updateActiveNav(targetId) {
    if (!targetId) return;
    navLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const cleanHref = href.replace('#', '');
      const isActive = cleanHref === targetId;
      link.classList.toggle('active', isActive);
    });
    mobileLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const cleanHref = href.replace('#', '');
      const isActive = cleanHref === targetId;
      link.classList.toggle('active', isActive);
    });
  }

  // Click handler for desktop nav links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href') || '';
      if (href.startsWith('#')) {
        const targetId = href.replace('#', '');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          updateActiveNav(targetId);
          const headerOffset = 75;
          const elPosition = targetEl.getBoundingClientRect().top;
          const offsetPosition = elPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }
      }
    });
  });

  // Dynamic Scrollspy: automatically activates the section currently in viewport on homepage
  function handleScrollspy() {
    const path = window.location.pathname;
    if (path !== '/' && !path.endsWith('index.html') && path !== '') {
      return;
    }
    const scrollPos = window.scrollY + 120;
    let currentSectionId = 'hero';

    for (const id of observedSectionIds) {
      const section = document.getElementById(id);
      if (section) {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentSectionId = id;
          break;
        }
      }
    }
    updateActiveNav(currentSectionId);
  }

  window.addEventListener('scroll', handleScrollspy, { passive: true });

  // Web Audio Camera Shutter Synth
  function playCameraShutterSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Shutter click 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(800, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.04);
      gain1.gain.setValueAtTime(0.35, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.05);

      // Shutter click 2 (rebound)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(600, ctx.currentTime + 0.06);
      osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.06);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.06);
      osc2.stop(ctx.currentTime + 0.13);
    } catch (e) {
      // Audio fallback
    }
  }

  // ====================================================================
  // GLOBE HERO: INTERACTIVE PHOTO & BACKGROUND CAROUSEL
  // User can click any card OR upload photo -> background & content changes
  // ====================================================================
  const destinationData = [
    {
      id: 'studio-booth',
      tag: 'Studio Photobooth',
      title: 'Signature<br><span style="white-space: nowrap;">Studio Booth</span>',
      desc: 'Magazine-quality portraiture powered by full-frame Canon DSLR optics, studio beauty strobe lighting, and instant 7-second lab prints for luxury celebrations.',
      bg: '/images/hero_booth_studio.jpg'
    },
    {
      id: 'glambot-360',
      tag: '360° Video Glambot',
      title: '360° Cinematic<br><span style="white-space: nowrap;">Glambot Booth</span>',
      desc: 'Motorized high-speed 120fps camera arm rotating on an illuminated LED platform with Hollywood slow-motion video, custom soundtrack, and instant AirDrop & QR distribution.',
      bg: '/images/hero_booth_glambot.jpg'
    },
    {
      id: 'kardashian-glam',
      tag: 'Editorial Monochrome',
      title: 'Kardashian<br><span style="white-space: nowrap;">Glam Booth</span>',
      desc: 'Celebrity red-carpet aesthetic with real-time skin-smoothing algorithms, high-contrast studio ring flash, and heavyweight metallic monochrome prints.',
      bg: '/images/hero_booth_kardashian.jpg'
    },
    {
      id: 'ai-mosaic',
      tag: 'Interactive AI & Mosaic',
      title: 'AI Sketch &<br><span style="white-space: nowrap;">Mosaic Wall</span>',
      desc: 'Real-time photo-to-sketch AI transformation and large-scale photo mosaic wall activations where every attendee becomes part of an iconic brand masterpiece.',
      bg: '/images/hero_booth_ai_mosaic.jpg'
    },
    {
      id: 'vintage-audio',
      tag: 'Retro Audio & Mirror',
      title: 'Vintage Audio<br><span style="white-space: nowrap;">& Magic Mirror</span>',
      desc: 'Authentic 1970s rotary telephone audio guestbooks and full-length interactive magic mirror photobooths with custom animations and tactile vintage keepsakes.',
      bg: '/images/hero_booth_vintage_audio.jpg'
    }
  ];

  let currentGlobeIndex = 0;
  let bgTransitionTimeout = null;
  const globeBgCurrent = document.getElementById('globe-bg-current');
  const globeBgNext = document.getElementById('globe-bg-next');
  const globeHeroSub = document.getElementById('globe-hero-sub');
  const globeHeroTitle = document.getElementById('globe-hero-title');
  const globeHeroDesc = document.getElementById('globe-hero-desc');
  const globeProgressBar = document.getElementById('globe-progress-bar');
  const globeCurrentNum = document.getElementById('globe-current-num');
  const globePrevBtn = document.getElementById('globe-prev-btn');
  const globeNextBtn = document.getElementById('globe-next-btn');
  const globeBookmarkBtn = document.getElementById('globe-bookmark-btn');
  const customPhotoUpload = document.getElementById('custom-photo-upload');
  const globeCardsTrack = document.getElementById('globe-cards-track');

  function setGlobeDestination(index, smoothScroll = true) {
    if (!destinationData.length) return;
    currentGlobeIndex = (index + destinationData.length) % destinationData.length;
    const dest = destinationData[currentGlobeIndex];

    // 1. Cross-fade background layer to selected card image
    if (globeBgNext && globeBgCurrent) {
      if (bgTransitionTimeout) clearTimeout(bgTransitionTimeout);
      globeBgNext.style.backgroundImage = `url("${dest.bg}")`;
      globeBgNext.classList.add('fade-in');

      bgTransitionTimeout = setTimeout(() => {
        globeBgCurrent.style.backgroundImage = `url("${dest.bg}")`;
        globeBgNext.classList.remove('fade-in');
        bgTransitionTimeout = null;
      }, 700);
    }

    // 2. Animate and update editorial text (Title, Subtitle/Tag, Description)
    if (globeHeroTitle && globeHeroSub && globeHeroDesc) {
      globeHeroTitle.style.opacity = '0';
      globeHeroTitle.style.transform = 'translateY(8px)';
      globeHeroSub.style.opacity = '0';
      globeHeroDesc.style.opacity = '0';

      setTimeout(() => {
        globeHeroSub.textContent = dest.tag;
        globeHeroTitle.innerHTML = dest.title;
        globeHeroDesc.textContent = dest.desc;

        globeHeroSub.style.opacity = '1';
        globeHeroTitle.style.opacity = '1';
        globeHeroTitle.style.transform = 'translateY(0)';
        globeHeroDesc.style.opacity = '1';
      }, 200);
    }

    // 3. Update active card state in carousel track
    const cardElements = document.querySelectorAll('.globe-card-item');
    cardElements.forEach((card, idx) => {
      const isActive = idx === currentGlobeIndex;
      card.classList.toggle('active', isActive);
      if (isActive && smoothScroll && globeCardsTrack) {
        if (idx === 0) {
          globeCardsTrack.scrollTo({ left: 0, behavior: 'smooth' });
        } else if (idx === destinationData.length - 1) {
          globeCardsTrack.scrollTo({ left: globeCardsTrack.scrollWidth, behavior: 'smooth' });
        } else {
          const trackRect = globeCardsTrack.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          const currentScroll = globeCardsTrack.scrollLeft;
          const targetScroll = currentScroll + (cardRect.left - trackRect.left) - (trackRect.width / 2) + (cardRect.width / 2);
          globeCardsTrack.scrollTo({
            left: Math.max(0, targetScroll),
            behavior: 'smooth'
          });
        }
      }
    });

    // 4. Update progress bar & numeric counter
    if (globeProgressBar) {
      const progressPercent = ((currentGlobeIndex + 1) / destinationData.length) * 100;
      globeProgressBar.style.width = `${progressPercent}%`;
    }
    if (globeCurrentNum) {
      globeCurrentNum.textContent = String(currentGlobeIndex + 1).padStart(2, '0');
    }
    const globeTotalEl = document.querySelector('.globe-counter-total');
    if (globeTotalEl) {
      globeTotalEl.textContent = `/ ${String(destinationData.length).padStart(2, '0')}`;
    }
  }

  // Bind click & keyboard on all cards
  function bindGlobeCards() {
    const cardElements = document.querySelectorAll('.globe-card-item');
    cardElements.forEach((card, idx) => {
      card.onclick = () => {
        playCameraShutterSound();
        setGlobeDestination(idx);
        resetGlobeAutoTimer();
      };
      card.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playCameraShutterSound();
          setGlobeDestination(idx);
          resetGlobeAutoTimer();
        }
      };
    });
  }
  bindGlobeCards();

  // Navigation Arrows
  if (globePrevBtn) {
    globePrevBtn.addEventListener('click', () => {
      playCameraShutterSound();
      setGlobeDestination(currentGlobeIndex - 1);
      resetGlobeAutoTimer();
    });
  }

  if (globeNextBtn) {
    globeNextBtn.addEventListener('click', () => {
      playCameraShutterSound();
      setGlobeDestination(currentGlobeIndex + 1);
      resetGlobeAutoTimer();
    });
  }

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (window.scrollY < 600) {
      if (e.key === 'ArrowLeft') {
        setGlobeDestination(currentGlobeIndex - 1);
        resetGlobeAutoTimer();
      } else if (e.key === 'ArrowRight') {
        setGlobeDestination(currentGlobeIndex + 1);
        resetGlobeAutoTimer();
      }
    }
  });

  // Hero Action Buttons: Book & View Gallery smooth scroll
  const globeBookBtn = document.getElementById('globe-book-btn');
  const globeGalleryBtn = document.getElementById('globe-gallery-btn');

  if (globeBookBtn) {
    globeBookBtn.addEventListener('click', (e) => {
      const target = document.getElementById('get-in-touch');
      if (target) {
        e.preventDefault();
        const headerOffset = 75;
        const elPosition = target.getBoundingClientRect().top;
        const offsetPosition = elPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: Math.max(0, offsetPosition), behavior: 'smooth' });
      }
    });
  }

  if (globeGalleryBtn) {
    globeGalleryBtn.addEventListener('click', (e) => {
      const target = document.getElementById('gallery');
      if (target) {
        e.preventDefault();
        const headerOffset = 75;
        const elPosition = target.getBoundingClientRect().top;
        const offsetPosition = elPosition + window.pageYOffset - headerOffset;
        window.scrollTo({ top: Math.max(0, offsetPosition), behavior: 'smooth' });
      }
    });
  }

  // Custom User Photo Upload: changes active photo & full background live
  if (customPhotoUpload) {
    customPhotoUpload.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const customUrl = event.target.result;
        
        const customDest = {
          id: 'custom-upload-' + Date.now(),
          tag: 'Personal Capture',
          title: 'YOUR<br>CUSTOM SHOT',
          desc: 'Custom live photo preview. You uploaded this photo, and the background transitioned seamlessly in real time.',
          bg: customUrl
        };

        destinationData.unshift(customDest);

        if (globeCardsTrack) {
          const newCard = document.createElement('div');
          newCard.className = 'globe-card-item active';
          newCard.setAttribute('role', 'button');
          newCard.setAttribute('tabindex', '0');
          newCard.innerHTML = `
            <img src="${customUrl}" alt="Your Uploaded Photo" class="globe-card-img">
            <div class="globe-card-overlay">
              <span class="globe-card-tag">Personal Capture</span>
              <h3 class="globe-card-title">YOUR CUSTOM SHOT</h3>
            </div>
          `;
          globeCardsTrack.prepend(newCard);
          bindGlobeCards();
        }

        setGlobeDestination(0);
        resetGlobeAutoTimer();
        showToast('Photo uploaded! Background updated successfully.', 'success');
      };
      reader.readAsDataURL(file);
    });
  }

  // Auto rotation timer
  let globeAutoTimer = setInterval(() => {
    setGlobeDestination(currentGlobeIndex + 1);
  }, 7500);

  function resetGlobeAutoTimer() {
    clearInterval(globeAutoTimer);
    globeAutoTimer = setInterval(() => {
      setGlobeDestination(currentGlobeIndex + 1);
    }, 7500);
  }

  if (globeCardsTrack) {
    globeCardsTrack.addEventListener('mouseenter', () => clearInterval(globeAutoTimer));
    globeCardsTrack.addEventListener('mouseleave', resetGlobeAutoTimer);
  }

  // 3. Shutter Flash & Physical Print Dispenser Simulation (Legacy Safe Guard)
  const legacyShutterBtn = document.getElementById('shutter-btn');
  const legacyFlashOverlay = document.getElementById('flash-overlay');
  const legacyViewfinder = document.getElementById('rig-viewfinder');
  const legacyStrip = document.getElementById('ejected-strip');

  if (legacyShutterBtn && legacyFlashOverlay) {
    legacyShutterBtn.addEventListener('click', () => {
      legacyShutterBtn.disabled = true;
      playCameraShutterSound();

      if (legacyViewfinder) legacyViewfinder.classList.add('flash-active');
      legacyFlashOverlay.classList.add('flashing');

      setTimeout(() => {
        legacyFlashOverlay.classList.remove('flashing');
        if (legacyViewfinder) legacyViewfinder.classList.remove('flash-active');
      }, 90);

      setTimeout(() => {
        if (legacyStrip) {
          legacyStrip.classList.remove('ejected');
          void legacyStrip.offsetWidth;
          legacyStrip.classList.add('ejected');
        }
        showToast('⚡ Studio flash triggered! Lab prints ready in 7 seconds.', 'success');
        legacyShutterBtn.disabled = false;
      }, 250);
    });
  }

  // 4. Hero Quick Availability Checker Dock
  const dockCheckBtn = document.getElementById('dock-check-btn');
  const dockDate = document.getElementById('dock-date');
  const dockCity = document.getElementById('dock-city');
  const dockProduct = document.getElementById('dock-product');

  if (dockCheckBtn) {
    dockCheckBtn.addEventListener('click', () => {
      const dateVal = dockDate ? dockDate.value : '';
      const cityVal = dockCity ? dockCity.value : '';
      const prodVal = dockProduct ? dockProduct.value : '';

      // Auto-fill booking form
      const formDate = document.getElementById('event-date');
      const formCity = document.getElementById('city-select');
      const formProd = document.getElementById('product-select');

      if (formDate && dateVal) formDate.value = dateVal;
      if (formCity && cityVal) formCity.value = cityVal;
      if (formProd && prodVal) formProd.value = prodVal;

      // Scroll to booking form
      const bookingSection = document.getElementById('get-in-touch');
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
        showToast(`📍 Availability checked for ${cityVal || 'your city'}! Please complete your details.`, 'info');
      }
    });
  }

  // Filter button toggles
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 4. Luxury Services Catalog + Dynamic Interactive Preview Panel
  const serviceCatalog = {
    signature: {
      title: "The Signature Studio Photobooth",
      badge: "Most Popular",
      image: "/images/hero_booth_studio.jpg",
      tagline: "Magazine-quality portraits with instant lab-grade prints",
      desc: "Our flagship open-air photobooth combines full-frame Canon DSLR optics, soft beauty-dish studio strobe lighting, and ultra-fast 7-second dye-sublimation printing.",
      price: "Starting from £695",
      productName: "The Signature Studio Photobooth",
      specs: [
        "Canon R5 45MP Optics",
        "7-Second Magnetic Prints",
        "2 Certified On-Site Concierges",
        "Instant AirDrop & QR Gallery"
      ]
    },
    video360: {
      title: "360° Cinematic Video Booth",
      badge: "Viral Experience",
      image: "/images/hero_booth_glambot.jpg",
      tagline: "Dynamic Hollywood slow-motion video with synced RGB lighting",
      desc: "Step onto our tempered glass platform as a motorized high-speed 4K camera rotates 360 degrees. Instant boomerang and slow-mo video ready in 15 seconds.",
      price: "Starting from £895",
      productName: "360° Cinematic Video Booth",
      specs: [
        "Motorized 360° Robotic Arm",
        "4K 120fps Slow-Mo Capture",
        "Sound-Activated RGB Lighting",
        "Instant QR Video Cloud Delivery"
      ]
    },
    glam: {
      title: "The B&W Kardashian Glam Booth",
      badge: "Celebrity Favorite",
      image: "/images/hero_booth_kardashian.jpg",
      tagline: "Ultra-flattering skin-smoothing filter & editorial monochrome aesthetic",
      desc: "Inspired by red carpets, this booth applies proprietary real-time skin-softening and high-contrast studio ring flashes for flawless, poreless portraits.",
      price: "Starting from £795",
      productName: "The B&W Kardashian Glam Booth",
      specs: [
        "AI Real-Time Skin Smoothing",
        "Studio Ring Flash Strobe",
        "Pure White Tension Backdrop",
        "300gsm Heavy Cardstock Prints"
      ]
    },
    audio: {
      title: "Vintage Audio Guestbook",
      badge: "Emotional Keepsake",
      image: "/images/hero_booth_vintage_audio.jpg",
      tagline: "Heartfelt voice recordings on authentic 1970s rotary telephones",
      desc: "Guests pick up the restored retro receiver, hear your warm recorded greeting, and leave unscripted, emotional, and hilarious voice messages.",
      price: "Starting from £395",
      productName: "Vintage Audio Guestbook",
      specs: [
        "Restored 1970s GPO Rotary Phone",
        "Host Custom Voice Greeting",
        "Studio WAV Audio Delivery",
        "Optional Keepsake Vinyl Pressing"
      ]
    },
    corporate: {
      title: "Corporate & Brand Activation Booth",
      badge: "Enterprise Ready",
      image: "/images/hero_booth_ai_mosaic.jpg",
      tagline: "High-impact brand immersion, live data capture, and ROI analytics",
      desc: "Full custom exterior vinyl hardware wrap, interactive survey UI, GDPR opt-in data capture, live digital mosaic wall projection, and impression analytics.",
      price: "Starting from £1,250",
      productName: "Corporate & Brand Activation Booth",
      specs: [
        "Full Custom Hardware Wrap",
        "GDPR Opt-in Data Collection",
        "Live Digital Mosaic Wall",
        "Comprehensive ROI Analytics"
      ]
    },
    custom: {
      title: "Custom Immersive & AI Set Experience",
      badge: "Fully Bespoke",
      image: "/images/service_ar.webp",
      tagline: "Bespoke set builds, custom neon, green screen & generative AI",
      desc: "Architectural physical backdrop fabrication, custom neon signage, real-time Generative AI background transformation, and dedicated creative lead.",
      price: "Starting from £1,850",
      productName: "Custom Immersive & AI Set Experience",
      specs: [
        "Generative AI Set Morphing",
        "Custom Physical Fabrication",
        "Interactive Neon Lighting",
        "Dedicated Creative Director"
      ]
    }
  };

  const accordionItems = document.querySelectorAll('.service-accordion-item');
  const previewCard = document.getElementById('service-preview-card');
  const previewImg = document.getElementById('preview-img');
  const previewBadge = document.getElementById('preview-badge');
  const previewTitle = document.getElementById('preview-title');
  const previewTagline = document.getElementById('preview-tagline');
  const previewDesc = document.getElementById('preview-desc');
  const previewPrice = document.getElementById('preview-price');
  const previewHighlights = document.getElementById('preview-highlights');
  const previewEnquireBtn = document.getElementById('preview-enquire-btn');

  function activateService(item, smooth = true) {
    if (!item) return;
    const key = item.dataset.serviceKey;
    const data = serviceCatalog[key];
    if (!data) return;

    // Update active classes and aria states
    accordionItems.forEach(i => {
      const isTarget = i === item;
      i.classList.toggle('active', isTarget);
      i.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    if (previewCard) {
      previewCard.classList.add('switching');
    }

    setTimeout(() => {
      if (previewImg && data.image) {
        previewImg.src = data.image;
        previewImg.alt = data.title;
      }
      if (previewBadge) previewBadge.textContent = data.badge;
      if (previewTitle) previewTitle.textContent = data.title;
      if (previewTagline) previewTagline.textContent = data.tagline;
      if (previewDesc) previewDesc.textContent = data.desc;
      if (previewPrice) previewPrice.textContent = data.price;

      if (previewHighlights && Array.isArray(data.specs)) {
        previewHighlights.innerHTML = data.specs.map(spec => `
          <div class="preview-highlight-item">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E31D1C" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${spec}</span>
          </div>
        `).join('');
      }

      if (previewEnquireBtn) {
        previewEnquireBtn.onclick = () => {
          if (typeof window.openBookingModal === 'function') {
            window.openBookingModal(data.productName);
          }
        };
        const btnLabel = previewEnquireBtn.querySelector('span');
        if (btnLabel) {
          btnLabel.textContent = `Book ${data.title}`;
        }
      }

      if (previewCard) {
        previewCard.classList.remove('switching');
      }
    }, 110);
  }

  accordionItems.forEach(item => {
    // Make entire card interactive
    item.addEventListener('click', (e) => {
      if (e.target.closest('.service-inline-book-btn')) return;
      activateService(item);
    });

    // Also support clicking header button
    const btn = item.querySelector('.service-accordion-header');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        activateService(item);
      });
    }

    // Keyboard support: Enter or Space activates
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activateService(item);
      }
    });
  });

  // Up/Down Arrow keyboard navigation between accordion activations
  const accordionContainer = document.getElementById('services-accordion');
  if (accordionContainer) {
    accordionContainer.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.from(accordionItems);
        const currentIndex = items.findIndex(i => i.classList.contains('active'));
        let nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex >= items.length) nextIndex = 0;
        if (nextIndex < 0) nextIndex = items.length - 1;
        activateService(items[nextIndex]);
        items[nextIndex].focus();
      }
    });
  }

  // 5. FAQ Accordion (Bilimbe 2-Column Toggle)
  const faqCards = document.querySelectorAll('.faq-card');
  faqCards.forEach(card => {
    const qBtn = card.querySelector('.faq-btn');
    qBtn.addEventListener('click', () => {
      const isOpen = card.classList.contains('open');
      card.classList.toggle('open', !isOpen);
    });
  });

  // 6. Real-Time Status Tracker
  const statusForm = document.getElementById('status-tracker-form');
  const statusInput = document.getElementById('status-ref-input');
  const statusOutput = document.getElementById('status-result-box');

  if (statusForm && statusInput && statusOutput) {
    statusForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = statusInput.value.trim().toUpperCase();

      if (!code) {
        showToast('Please enter an Enquiry Reference Code (e.g. MIM-78421)', 'error');
        return;
      }

      statusOutput.classList.remove('active');
      const submitBtn = statusForm.querySelector('button');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Searching...';

      try {
        const res = await fetch(`/api/enquiries/${encodeURIComponent(code)}`);
        const data = await res.json();
        submitBtn.disabled = false;
        submitBtn.textContent = 'Track Status';

        if (res.ok && data.success) {
          const eq = data.enquiry;
          statusOutput.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; border-bottom:1px solid #E2E8F0; padding-bottom:8px;">
              <span style="font-weight:800; color:#0F172A;">Reference: <strong style="color:#E31D1C;">${eq.referenceId}</strong></span>
              <span style="background:rgba(227,29,28,0.1); color:#E31D1C; border:1px solid #E31D1C; padding:3px 12px; border-radius:0px; font-size:0.75rem; font-weight:700;">
                ${eq.status}
              </span>
            </div>
            <p style="font-size:0.9rem; color:#4B5563; margin-bottom:4px;"><strong>Event Type:</strong> ${eq.eventType}</p>
            <p style="font-size:0.9rem; color:#4B5563; margin-bottom:4px;"><strong>Event Date:</strong> ${eq.eventDate}</p>
            <p style="font-size:0.9rem; color:#4B5563; margin-bottom:4px;"><strong>Venue:</strong> ${eq.eventLocation}</p>
            <p style="font-size:0.9rem; color:#4B5563; margin-bottom:8px;"><strong>Product:</strong> ${Array.isArray(eq.services) ? eq.services.join(', ') : eq.services}</p>
            <div style="background:#FFF; padding:10px 14px; border-radius:0px; border:1px solid #E2E8F0; font-size:0.85rem; color:#64748B;">
              ⏱ Estimated response: <strong style="color:#0F172A;">${eq.estimatedResponse}</strong>
            </div>
          `;
          statusOutput.classList.add('active');
        } else {
          statusOutput.innerHTML = `
            <div style="color:#EF4444; font-size:0.9rem; font-weight:600;">
              ⚠️ ${data.message || 'No enquiry found with this reference code.'}
            </div>
          `;
          statusOutput.classList.add('active');
        }
      } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Track Status';
        showToast('Server connection error. Please try again.', 'error');
      }
    });
  }

  // Canon Hero Showreel Modal
  const showreelBtn = document.getElementById('canon-showreel-btn');
  const showreelModal = document.getElementById('showreel-modal');
  const showreelBackdrop = document.getElementById('showreel-modal-close');
  const showreelCloseX = document.getElementById('showreel-close-x');

  function openShowreelModal() {
    if (showreelModal) {
      showreelModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeShowreelModal() {
    if (showreelModal) {
      showreelModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  if (showreelBtn) {
    showreelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openShowreelModal();
    });
  }

  const hwGlambotPlay = document.getElementById('hw-glambot-play');
  if (hwGlambotPlay) {
    hwGlambotPlay.addEventListener('click', (e) => {
      e.preventDefault();
      openShowreelModal();
    });
  }

  const demoShowreelBtn = document.getElementById('demo-showreel-btn');
  if (demoShowreelBtn) {
    demoShowreelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openShowreelModal();
    });
  }

  if (showreelBackdrop) {
    showreelBackdrop.addEventListener('click', closeShowreelModal);
  }

  if (showreelCloseX) {
    showreelCloseX.addEventListener('click', closeShowreelModal);
  }

  // -------------------------------------------------------------
  // Interactive Tabbed Experience Deck Controller
  // -------------------------------------------------------------
  const showcaseTabBtns = document.querySelectorAll('.showcase-tab-btn');
  const showcasePanels = document.querySelectorAll('.showcase-panel');

  if (showcaseTabBtns.length > 0) {
    showcaseTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTabId = btn.getAttribute('data-tab');
        if (!targetTabId) return;

        // Update tabs active state & ARIA
        showcaseTabBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        // Switch panels
        showcasePanels.forEach(panel => {
          if (panel.id === targetTabId) {
            panel.classList.add('active');
          } else {
            panel.classList.remove('active');
          }
        });
      });
    });
  }

  // QR Scan Simulation interactive trigger
  const demoQrBtn = document.getElementById('demo-qr-btn');
  if (demoQrBtn) {
    demoQrBtn.addEventListener('click', () => {
      const originalText = demoQrBtn.innerHTML;
      demoQrBtn.disabled = true;
      demoQrBtn.innerHTML = `<span>⏳ Scanning Pass...</span>`;

      // Quick audio feedback beep using Web Audio API if available
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }
      } catch (err) {
        // audio policy ignored safely
      }

      setTimeout(() => {
        demoQrBtn.innerHTML = `<span>✅ VIP Pass Validated!</span>`;
        showToast('✨ VIP Badge Authenticated! Welcome, Alex Reed (Global Leadership Summit)', 'success');
        setTimeout(() => {
          demoQrBtn.innerHTML = originalText;
          demoQrBtn.disabled = false;
        }, 2500);
      }, 700);
    });
  }


  // Editorial Showcase Carousel Navigation (Matching Reference Design)
  const editorialTrack = document.getElementById('editorial-cards-track');
  const editorialPrevBtn = document.getElementById('editorial-prev-btn');
  const editorialNextBtn = document.getElementById('editorial-next-btn');

  if (editorialTrack && editorialPrevBtn && editorialNextBtn) {
    editorialPrevBtn.addEventListener('click', () => {
      editorialTrack.scrollBy({ left: -320, behavior: 'smooth' });
    });
    editorialNextBtn.addEventListener('click', () => {
      editorialTrack.scrollBy({ left: 320, behavior: 'smooth' });
    });
  }

  // Popular Experiences 2025 (Static 3-Card Balanced Showcase - No Scroll Needed)
  const openReelBtn = document.getElementById('open-showreel-btn');

  // Our Reach Cities Horizontal Carousel (Smooth Drag-to-Scroll)
  const branchTrack = document.getElementById('branch-cards-track');
  const branchPrevBtn = document.getElementById('branch-prev-arrow');
  const branchNextBtn = document.getElementById('branch-next-arrow');

  if (branchTrack) {
    if (branchPrevBtn && branchNextBtn) {
      branchPrevBtn.addEventListener('click', () => {
        branchTrack.scrollBy({ left: -300, behavior: 'smooth' });
      });
      branchNextBtn.addEventListener('click', () => {
        branchTrack.scrollBy({ left: 300, behavior: 'smooth' });
      });
    }

    // Drag-to-scroll support for mouse users
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let moved = false;

    branchTrack.addEventListener('mousedown', (e) => {
      isDown = true;
      moved = false;
      startX = e.pageX - branchTrack.offsetLeft;
      scrollLeft = branchTrack.scrollLeft;
    });

    branchTrack.addEventListener('mouseleave', () => {
      isDown = false;
    });

    branchTrack.addEventListener('mouseup', () => {
      isDown = false;
    });

    branchTrack.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - branchTrack.offsetLeft;
      const walk = (x - startX) * 1.5;
      if (Math.abs(walk) > 5) moved = true;
      branchTrack.scrollLeft = scrollLeft - walk;
    });

    // Prevent accidental click during drag
    branchTrack.addEventListener('click', (e) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  if (openReelBtn) {
    openReelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openShowreelModal();
    });
  }

  // Booking Request Modal Handler
  const bookingModal = document.getElementById('booking-modal');
  const bookingModalClose = document.getElementById('booking-modal-close');
  const bookingForm = document.getElementById('modal-booking-form');
  const bookingProductSelect = document.getElementById('modal-booking-product');

  window.openBookingModal = function(preferredProduct = '') {
    if (!bookingModal) return;
    if (bookingProductSelect && preferredProduct) {
      bookingProductSelect.value = preferredProduct;
    }
    bookingModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.selectCityAndBook = function(cityName) {
    const citySelect = document.getElementById('modal-city');
    if (citySelect && cityName) {
      citySelect.value = cityName;
    }
    window.openBookingModal();
    if (typeof showToast === 'function') {
      showToast(`📍 Selected ${cityName}! Opening VIP booking...`, 'success');
    }
  };

  window.closeBookingModal = function() {
    if (!bookingModal) return;
    bookingModal.classList.remove('active');
    document.body.style.overflow = '';
  };

  if (bookingModalClose) {
    bookingModalClose.addEventListener('click', closeBookingModal);
  }

  if (bookingModal) {
    bookingModal.addEventListener('click', (e) => {
      if (e.target === bookingModal) closeBookingModal();
    });
  }

  // Intercept all "Book a Shoot", "Book Your Event Now", "Book Your Booth" clicks
  document.querySelectorAll('a[href="#get-in-touch"], .btn-book-modal, .globe-btn-book, #globe-book-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openBookingModal();
    });
  });

  if (bookingForm) {
    bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Verifying Availability...</span>';
      }

      setTimeout(() => {
        const formView = document.getElementById('modal-form-view');
        const successView = document.getElementById('modal-success-view');
        if (formView && successView) {
          formView.style.display = 'none';
          successView.classList.add('active');
        }
        showToast('🎉 Booking Request Submitted! Check your email for proposal confirmation.', 'success');
      }, 700);
    });
  }

  // Experience Gallery Category Filter (Globally accessible & robust)
  window.filterGalleryCategory = function(targetEl, filterValue) {
    const galleryFilterPills = document.querySelectorAll('.gallery-cat-pill');
    const galleryCards = document.querySelectorAll('.gallery-card');
    const filter = (filterValue || 'all').toLowerCase();

    galleryFilterPills.forEach(p => {
      const pFilter = (p.getAttribute('data-filter') || '').toLowerCase();
      if (p === targetEl || pFilter === filter) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });

    galleryCards.forEach(card => {
      const category = (card.getAttribute('data-category') || '').toLowerCase();
      const isMatch = filter === 'all' || category.includes(filter) || (filter === 'studio' && (category.includes('studio') || category.includes('glam')));
      if (isMatch) {
        card.classList.remove('filter-hidden');
        card.style.display = 'flex';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      } else {
        card.classList.add('filter-hidden');
        card.style.display = 'none';
      }
    });
  };

  const galleryFilterPills = document.querySelectorAll('.gallery-cat-pill');
  galleryFilterPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const filter = pill.getAttribute('data-filter') || 'all';
      window.filterGalleryCategory(pill, filter);
    });
  });


  // =========================================================================
  // MEGA MENU INTERACTION (Hover & Click Tab Switching)
  // =========================================================================
  const megaTabs = document.querySelectorAll('.megamenu-tab-btn');
  const megaPanes = document.querySelectorAll('.megamenu-tab-pane');

  function switchMegaTab(targetTabId) {
    if (!targetTabId) return;
    megaTabs.forEach(tab => {
      if (tab.getAttribute('data-tab') === targetTabId) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    megaPanes.forEach(pane => {
      if (pane.id === `megamenu-pane-${targetTabId}`) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });
  }

  megaTabs.forEach(tab => {
    const tabId = tab.getAttribute('data-tab');
    tab.addEventListener('mouseenter', () => switchMegaTab(tabId));
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchMegaTab(tabId);
    });
  });

  // =========================================================================
  // DYNAMIC MEGAMENU: SHOW ONLY REAL DATABASE CATEGORIES & SERVICES
  // =========================================================================
  async function syncDynamicMegamenu() {
    const dropdown = document.getElementById('megamenu-dropdown');
    if (!dropdown) return;

    try {
      const [catRes, srvRes] = await Promise.all([
        fetch('/api/categories').then(r => r.ok ? r.json() : null).catch(() => null),
        fetch('/api/services').then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      const categories = (catRes && Array.isArray(catRes.data) && catRes.data.length > 0)
        ? catRes.data
        : [
            { id: 'photobooth', name: 'Photo Booth', image: '/images/megamenu_photobooth_featured.jpg', description: 'Lab-grade prints, full-frame optics & instant AirDrop sharing' },
            { id: 'videobooth', name: 'Video Booth', image: '/images/service_booth.webp', description: '360-degree cinematic video with synced RGB lighting' },
            { id: 'customtech', name: 'Custom Tech Development', image: '/images/service_interactive.webp', description: 'Bespoke experiential builds & generative AI installations' },
            { id: 'digitalengagement', name: 'Digital Engagement Activities', image: '/images/service_qr.webp', description: 'Interactive kiosks, QR games & live social mosaic walls' },
            { id: 'argame', name: 'AR Game', image: '/images/service_games.webp', description: 'Augmented reality interactive motion-sensor brand games' }
          ];

      const services = (srvRes && Array.isArray(srvRes.data)) ? srvRes.data : [];

      const tabsRow = dropdown.querySelector('.megamenu-tabs-row');
      const bodyContainer = dropdown.querySelector('.megamenu-body');
      if (!tabsRow || !bodyContainer) return;

      // Determine active tab
      const currentActiveBtn = tabsRow.querySelector('.megamenu-tab-btn.active');
      let activeTabId = categories[0].id;
      if (currentActiveBtn) {
        const prevTab = currentActiveBtn.getAttribute('data-tab');
        if (categories.some(c => c.id === prevTab)) activeTabId = prevTab;
      }

      // 1. Render Tabs Row dynamically from database categories
      tabsRow.innerHTML = categories.map(cat => `
        <button class="megamenu-tab-btn ${cat.id === activeTabId ? 'active' : ''}" data-tab="${cat.id}" type="button">${cat.name}</button>
      `).join('');

      // 2. Render Panes dynamically with ONLY real database services
      bodyContainer.innerHTML = categories.map(cat => {
        const cId = (cat.id || '').toLowerCase().trim();

        // Filter real services for this category
        const catServices = services.filter(s => {
          const sCat = (s.category || '').toLowerCase().trim();
          if (sCat === cId) return true;
          if (cId === 'photobooth' && (sCat === 'glam' || sCat === 'audio' || sCat === 'photo')) return true;
          if (cId === 'videobooth' && (sCat === 'video-360' || sCat === 'video')) return true;
          if (cId === 'customtech' && (sCat === 'custom' || sCat === 'ai')) return true;
          if (cId === 'digitalengagement' && (sCat === 'corporate' || sCat === 'digital')) return true;
          if (cId === 'argame' && (sCat === 'ar' || sCat === 'game')) return true;
          return false;
        });

        let linksHtml = '';
        if (catServices.length === 0) {
          linksHtml = `
            <div class="megamenu-links-cols" style="grid-template-columns: 1fr;">
              <div class="megamenu-col" style="padding: 28px 12px;">
                <div style="font-size: 0.95rem; font-weight: 700; color: #0F172A; margin-bottom: 6px;">Experiences Coming Soon</div>
                <p style="font-size: 0.84rem; color: #64748B; margin: 0; line-height: 1.5;">We are curating bespoke activations for ${cat.name}. Contact our creative studio for tailored activations.</p>
              </div>
            </div>
          `;
        } else {
          // Distribute across up to 3 columns
          const colsCount = Math.min(3, Math.max(1, Math.ceil(catServices.length / 5)));
          const columns = Array.from({ length: colsCount }, () => []);
          catServices.forEach((s, idx) => {
            columns[idx % colsCount].push(s);
          });

          linksHtml = `
            <div class="megamenu-links-cols" style="grid-template-columns: repeat(${colsCount}, 1fr);">
              ${columns.map(col => `
                <div class="megamenu-col">
                  ${col.map(s => `
                    <a href="/service-detail.html?id=${encodeURIComponent(s.id)}" class="megamenu-item-link" data-booth-id="${s.id}">
                      <span class="mega-arrow">&gt;</span>
                      <span class="mega-label">${s.title}</span>
                    </a>
                  `).join('')}
                </div>
              `).join('')}
            </div>
          `;
        }

        const previewImg = cat.image || (catServices[0] && catServices[0].heroBg) || '/images/megamenu_photobooth_featured.jpg';

        return `
          <div class="megamenu-tab-pane ${cat.id === activeTabId ? 'active' : ''}" id="megamenu-pane-${cat.id}">
            ${linksHtml}
            <div class="megamenu-preview-box">
              <img src="${previewImg}" alt="${cat.name} Showcase" loading="lazy">
            </div>
          </div>
        `;
      }).join('');

      // 3. Tab switching interaction
      function switchMegaTab(targetTabId) {
        if (!targetTabId) return;
        dropdown.querySelectorAll('.megamenu-tab-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-tab') === targetTabId);
        });
        dropdown.querySelectorAll('.megamenu-tab-pane').forEach(pane => {
          pane.classList.toggle('active', pane.id === `megamenu-pane-${targetTabId}`);
        });
      }

      dropdown.querySelectorAll('.megamenu-tab-btn').forEach(btn => {
        const tabId = btn.getAttribute('data-tab');
        btn.addEventListener('mouseenter', () => switchMegaTab(tabId));
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          switchMegaTab(tabId);
        });
      });

    } catch (err) {
      console.warn('[Mimori] Megamenu dynamic sync skipped:', err);
    }
  }

  syncDynamicMegamenu();

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (showreelModal && showreelModal.classList.contains('active')) {
        closeShowreelModal();
      }
      if (bookingModal && bookingModal.classList.contains('active')) {
        closeBookingModal();
      }
    }
  });
});

