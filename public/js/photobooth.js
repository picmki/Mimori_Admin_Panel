/**
 * Mimori Digital - Live Interactive Virtual Photobooth Studio
 * Features:
 * - Real camera access via getUserMedia (with 3-2-1 timer & screen flash)
 * - Fallback demo photo & custom photo file upload
 * - 4 Luxury Event Frame presets (Kardashian Glam, Gold Luxury Gala, Vintage Photo Strip, Signature Crimson)
 * - Studio Filters (Natural, Smooth B&W, Warm Retro, Vivid 4K)
 * - High-Res 300DPI Print Canvas rendering & Instant PNG download
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', initPhotobooth);

  function initPhotobooth() {
    const video = document.getElementById('booth-video');
    const canvas = document.getElementById('booth-canvas');
    const flash = document.getElementById('booth-flash');
    const countdownEl = document.getElementById('booth-countdown');
    const idleScreen = document.getElementById('booth-idle-screen');
    const liveControls = document.getElementById('booth-live-controls');
    const capturedControls = document.getElementById('booth-captured-controls');

    const btnStartCamera = document.getElementById('btn-start-camera');
    const btnCancelCamera = document.getElementById('btn-cancel-camera');
    const btnSnapPhoto = document.getElementById('btn-snap-photo');
    const btnCountdownToggle = document.getElementById('btn-countdown-toggle');
    const timerStatus = document.getElementById('timer-status');

    const btnTriggerUpload = document.getElementById('btn-trigger-upload');
    const boothFileInput = document.getElementById('booth-file-input');
    const btnUseDemo = document.getElementById('btn-use-demo');
    const btnRetakePhoto = document.getElementById('btn-retake-photo');
    const btnUploadNew = document.getElementById('btn-upload-new');

    const frameCards = document.querySelectorAll('#booth-frames-selector .frame-preset-card');
    const filterPills = document.querySelectorAll('#booth-filter-selector .filter-pill');
    const btnDownload = document.getElementById('btn-download-photo');

    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');

    // State
    let mediaStream = null;
    let rawCapturedImage = null; // HTMLImageElement or Offscreen/Canvas
    let activeFrame = 'glam';
    let activeFilter = 'normal';
    let isTimerOn = true;
    let isCountingDown = false;

    // Default demo image path
    const DEMO_PHOTO_URL = '/images/hero_booth_kardashian.jpg';

    // -------------------------------------------------------------------------
    // Event Listeners
    // -------------------------------------------------------------------------
    if (btnStartCamera) {
      btnStartCamera.addEventListener('click', startCamera);
    }
    if (btnCancelCamera) {
      btnCancelCamera.addEventListener('click', stopCamera);
    }
    if (btnSnapPhoto) {
      btnSnapPhoto.addEventListener('click', handleSnapPhoto);
    }
    if (btnCountdownToggle) {
      btnCountdownToggle.addEventListener('click', () => {
        isTimerOn = !isTimerOn;
        if (timerStatus) timerStatus.textContent = isTimerOn ? 'ON' : 'OFF';
      });
    }

    if (btnTriggerUpload && boothFileInput) {
      btnTriggerUpload.addEventListener('click', () => boothFileInput.click());
    }
    if (btnUploadNew && boothFileInput) {
      btnUploadNew.addEventListener('click', () => boothFileInput.click());
    }
    if (boothFileInput) {
      boothFileInput.addEventListener('change', handleFileUpload);
    }

    if (btnUseDemo) {
      btnUseDemo.addEventListener('click', loadDemoPhoto);
    }
    if (btnRetakePhoto) {
      btnRetakePhoto.addEventListener('click', resetToLiveCameraOrIdle);
    }

    // Frame Selection
    frameCards.forEach((card) => {
      card.addEventListener('click', () => {
        frameCards.forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        activeFrame = card.getAttribute('data-frame') || 'glam';

        // Auto-switch to B&W filter if Kardashian Glam selected and filter is normal
        if (activeFrame === 'glam' && activeFilter === 'normal') {
          setFilterPill('bw');
        } else if (activeFrame !== 'glam' && activeFilter === 'bw') {
          setFilterPill('normal');
        }

        renderComposite();
      });
    });

    // Filter Selection
    filterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        filterPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilter = pill.getAttribute('data-filter') || 'normal';
        renderComposite();
      });
    });

    function setFilterPill(filterName) {
      activeFilter = filterName;
      filterPills.forEach((p) => {
        if (p.getAttribute('data-filter') === filterName) {
          p.classList.add('active');
        } else {
          p.classList.remove('active');
        }
      });
    }

    // Download Button
    if (btnDownload) {
      btnDownload.addEventListener('click', downloadPrint);
    }

    // -------------------------------------------------------------------------
    // Camera Handlers
    // -------------------------------------------------------------------------
    async function startCamera() {
      try {
        stopCameraTracks();

        const constraints = {
          audio: false,
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 960 }
          }
        };

        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = mediaStream;
        await video.play();

        // UI View state
        video.classList.remove('hidden');
        canvas.classList.add('hidden');
        idleScreen.classList.add('hidden');
        liveControls.classList.remove('hidden');
        capturedControls.classList.add('hidden');
      } catch (err) {
        console.warn('Camera request rejected or unavailable:', err);
        // Seamless fallback to demo photo so user can immediately experience the photobooth
        loadDemoPhoto();
      }
    }

    function stopCameraTracks() {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
      }
    }

    function stopCamera() {
      stopCameraTracks();
      video.classList.add('hidden');
      liveControls.classList.add('hidden');
      idleScreen.classList.remove('hidden');
    }

    function resetToLiveCameraOrIdle() {
      startCamera();
    }

    // -------------------------------------------------------------------------
    // Shutter & Photo Capture
    // -------------------------------------------------------------------------
    function handleSnapPhoto() {
      if (isCountingDown) return;

      if (!isTimerOn) {
        captureFrameNow();
        return;
      }

      // 3-2-1 Countdown
      isCountingDown = true;
      countdownEl.classList.remove('hidden');
      let count = 3;
      countdownEl.textContent = count;

      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          countdownEl.textContent = count;
        } else {
          clearInterval(interval);
          countdownEl.classList.add('hidden');
          isCountingDown = false;
          captureFrameNow();
        }
      }, 800);
    }

    function captureFrameNow() {
      // Trigger flash animation
      if (flash) {
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 320);
      }

      // Grab current video frame into offscreen canvas
      const vWidth = video.videoWidth || 960;
      const vHeight = video.videoHeight || 720;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = vWidth;
      offCanvas.height = vHeight;
      const offCtx = offCanvas.getContext('2d');

      // Mirror horizontally like a real photobooth
      offCtx.translate(vWidth, 0);
      offCtx.scale(-1, 1);
      offCtx.drawImage(video, 0, 0, vWidth, vHeight);

      // Save as raw captured image
      const img = new Image();
      img.onload = () => {
        rawCapturedImage = img;
        stopCameraTracks();

        // Switch view to captured canvas
        video.classList.add('hidden');
        canvas.classList.remove('hidden');
        liveControls.classList.add('hidden');
        capturedControls.classList.remove('hidden');

        renderComposite();
      };
      img.src = offCanvas.toDataURL('image/jpeg', 0.95);
    }

    // -------------------------------------------------------------------------
    // Upload & Demo Photo Fallbacks
    // -------------------------------------------------------------------------
    function handleFileUpload(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          rawCapturedImage = img;
          stopCameraTracks();

          video.classList.add('hidden');
          idleScreen.classList.add('hidden');
          canvas.classList.remove('hidden');
          liveControls.classList.add('hidden');
          capturedControls.classList.remove('hidden');

          renderComposite();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }

    function loadDemoPhoto() {
      const img = new Image();
      img.onload = () => {
        rawCapturedImage = img;
        stopCameraTracks();

        video.classList.add('hidden');
        idleScreen.classList.add('hidden');
        canvas.classList.remove('hidden');
        liveControls.classList.add('hidden');
        capturedControls.classList.remove('hidden');

        renderComposite();
      };
      img.src = DEMO_PHOTO_URL;
    }

    // -------------------------------------------------------------------------
    // Composite Rendering Engine (Draws Photo + Selected Frame + Branding)
    // -------------------------------------------------------------------------
    function renderComposite() {
      if (!rawCapturedImage) return;

      const dateStr = getFormattedDate();

      if (activeFrame === 'strip') {
        renderPhotoStrip(dateStr);
      } else if (activeFrame === 'gold') {
        renderGoldGalaFrame(dateStr);
      } else if (activeFrame === 'crimson') {
        renderSignatureCrimsonFrame(dateStr);
      } else {
        // Default: Kardashian Glam
        renderKardashianGlamFrame(dateStr);
      }
    }

    function getFormattedDate() {
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const now = new Date();
      return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    }

    function getCanvasFilterString() {
      switch (activeFilter) {
        case 'bw':
          return 'grayscale(100%) contrast(125%) brightness(105%)';
        case 'warm':
          return 'sepia(35%) contrast(108%) brightness(102%) saturate(110%)';
        case 'vibrant':
          return 'contrast(115%) saturate(135%) brightness(102%)';
        case 'normal':
        default:
          return 'none';
      }
    }

    /**
     * Helper to draw image cover cropped inside a rectangle
     */
    function drawImageCover(targetCtx, img, x, y, w, h, zoom = 1) {
      const imgRatio = img.width / img.height;
      const targetRatio = w / h;
      let sWidth, sHeight, sx, sy;

      if (imgRatio > targetRatio) {
        sHeight = img.height / zoom;
        sWidth = sHeight * targetRatio;
        sx = (img.width - sWidth) / 2;
        sy = (img.height - sHeight) / 2;
      } else {
        sWidth = img.width / zoom;
        sHeight = sWidth / targetRatio;
        sx = (img.width - sWidth) / 2;
        sy = (img.height - sHeight) / 2;
      }

      targetCtx.drawImage(img, sx, sy, sWidth, sHeight, x, y, w, h);
    }

    // -------------------------------------------------------------------------
    // Frame Style 1: Kardashian Glam (Clean B&W Studio Luxe)
    // -------------------------------------------------------------------------
    function renderKardashianGlamFrame(dateStr) {
      canvas.width = 960;
      canvas.height = 1240;

      // Clean Ultra-White Matte Stock
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Photo bounds
      const pad = 44;
      const photoW = canvas.width - pad * 2;
      const photoH = 960;

      // Draw photo with filter
      ctx.save();
      ctx.filter = getCanvasFilterString();
      drawImageCover(ctx, rawCapturedImage, pad, pad, photoW, photoH);
      ctx.restore();

      // Subtle photo hairline border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad, pad, photoW, photoH);

      // Bottom Branding & Typography
      const bottomCenterY = pad + photoH + 50;

      ctx.textAlign = 'center';

      // Title
      ctx.fillStyle = '#0F172A';
      ctx.font = '700 24px "Montserrat", sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText('M I M O R I   D I G I T A L', canvas.width / 2, bottomCenterY);

      // Subtitle
      ctx.fillStyle = '#64748B';
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('KARDASHIAN GLAM STUDIO · RED CARPET EDITION', canvas.width / 2, bottomCenterY + 30);

      // Date Stamp & Verification
      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText(`${dateStr} · 300GSM METALLIC PRINT`, canvas.width / 2, bottomCenterY + 54);
    }

    // -------------------------------------------------------------------------
    // Frame Style 2: Gold Luxury Gala (Metallic Dual-Frame & Obsidian)
    // -------------------------------------------------------------------------
    function renderGoldGalaFrame(dateStr) {
      canvas.width = 960;
      canvas.height = 1240;

      // Obsidian Black Background
      ctx.fillStyle = '#08090C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Outer Gold Foil Border
      const goldGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      goldGrad.addColorStop(0, '#BF953F');
      goldGrad.addColorStop(0.25, '#FCF6BA');
      goldGrad.addColorStop(0.5, '#B38728');
      goldGrad.addColorStop(0.75, '#FBF5B7');
      goldGrad.addColorStop(1, '#AA771C');

      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 8;
      ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

      // Inner hairline gold frame
      ctx.lineWidth = 1.5;
      ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

      // Photo bounds
      const pad = 48;
      const photoW = canvas.width - pad * 2;
      const photoH = 940;

      // Draw photo
      ctx.save();
      ctx.filter = getCanvasFilterString();
      drawImageCover(ctx, rawCapturedImage, pad, pad, photoW, photoH);
      ctx.restore();

      // Bottom VIP Branding
      const bottomCenterY = pad + photoH + 52;

      ctx.textAlign = 'center';

      // Gold Title
      ctx.fillStyle = goldGrad;
      ctx.font = '800 24px "Montserrat", sans-serif';
      ctx.letterSpacing = '7px';
      ctx.fillText('★  M I M O R I   G A L A  ★', canvas.width / 2, bottomCenterY);

      // Subtitle
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('EXCLUSIVE VIP EVENT · LONDON & WORLDWIDE', canvas.width / 2, bottomCenterY + 30);

      // Date
      ctx.fillStyle = 'rgba(252, 246, 186, 0.7)';
      ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText(`AUTHENTIC CELEBRATION PRINT · ${dateStr}`, canvas.width / 2, bottomCenterY + 54);
    }

    // -------------------------------------------------------------------------
    // Frame Style 3: Vintage 3-Shot Photo Strip (Classic Keepsake)
    // -------------------------------------------------------------------------
    function renderPhotoStrip(dateStr) {
      canvas.width = 620;
      canvas.height = 1440;

      // Ivory Vintage Cardstock
      ctx.fillStyle = '#FAF9F6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const padX = 36;
      const slotW = canvas.width - padX * 2;
      const slotH = 370;
      const startY = 36;
      const gapY = 24;

      // 3 Stacked Photos (with slight zoom variations for playful booth feel)
      const zoomLevels = [1.0, 1.08, 1.15];

      for (let i = 0; i < 3; i++) {
        const slotY = startY + i * (slotH + gapY);

        ctx.save();
        ctx.filter = getCanvasFilterString();
        drawImageCover(ctx, rawCapturedImage, padX, slotY, slotW, slotH, zoomLevels[i]);
        ctx.restore();

        // Slot Border
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(padX, slotY, slotW, slotH);
      }

      // Bottom Keepsake Stamp & Typography
      const footerY = startY + 3 * (slotH + gapY) + 38;

      ctx.textAlign = 'center';

      ctx.fillStyle = '#0F172A';
      ctx.font = '800 20px "Montserrat", sans-serif';
      ctx.letterSpacing = '4px';
      ctx.fillText('M I M O R I', canvas.width / 2, footerY);

      ctx.fillStyle = '#E31D1C';
      ctx.font = '700 12px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('LOOK. BOOK. ENJOY.', canvas.width / 2, footerY + 26);

      ctx.fillStyle = '#64748B';
      ctx.font = '500 11px monospace';
      ctx.letterSpacing = '2px';
      ctx.fillText(`KEEPSAKE #${Math.floor(1000 + Math.random() * 9000)} · ${dateStr}`, canvas.width / 2, footerY + 48);
    }

    // -------------------------------------------------------------------------
    // Frame Style 4: Signature Crimson (Modern London Editorial)
    // -------------------------------------------------------------------------
    function renderSignatureCrimsonFrame(dateStr) {
      canvas.width = 960;
      canvas.height = 1240;

      // Pure White Studio Frame
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Crimson Accent Border
      ctx.strokeStyle = '#E31D1C';
      ctx.lineWidth = 5;
      ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

      // Inner Slate Hairline
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 1;
      ctx.strokeRect(26, 26, canvas.width - 52, canvas.height - 52);

      // Photo
      const pad = 42;
      const photoW = canvas.width - pad * 2;
      const photoH = 960;

      ctx.save();
      ctx.filter = getCanvasFilterString();
      drawImageCover(ctx, rawCapturedImage, pad, pad, photoW, photoH);
      ctx.restore();

      // Bottom Branding
      const bottomCenterY = pad + photoH + 52;

      ctx.textAlign = 'center';

      // Mimori Red Accent
      ctx.fillStyle = '#E31D1C';
      ctx.font = '800 24px "Montserrat", sans-serif';
      ctx.letterSpacing = '6px';
      ctx.fillText('MIMORI DIGITAL', canvas.width / 2, bottomCenterY);

      // Subtitle
      ctx.fillStyle = '#0F172A';
      ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '3px';
      ctx.fillText('SIGNATURE EVENT PHOTOBOOTH ACTIVATION', canvas.width / 2, bottomCenterY + 30);

      // Date Stamp
      ctx.fillStyle = '#64748B';
      ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText(`LONDON · PARIS · DUBAI · LAKE COMO · ${dateStr}`, canvas.width / 2, bottomCenterY + 54);
    }

    // -------------------------------------------------------------------------
    // Download Print Keepsake
    // -------------------------------------------------------------------------
    function downloadPrint() {
      if (!rawCapturedImage) {
        // If user clicks download before taking photo, load demo photo first
        loadDemoPhoto();
        setTimeout(downloadPrint, 350);
        return;
      }

      try {
        const link = document.createElement('a');
        link.download = `mimori-photobooth-${activeFrame}-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Feedback on button
        const origText = btnDownload.innerHTML;
        btnDownload.innerHTML = '<span>✓ Photo Print Downloaded!</span>';
        btnDownload.style.background = '#16A34A';
        setTimeout(() => {
          btnDownload.innerHTML = origText;
          btnDownload.style.background = '';
        }, 2500);
      } catch (err) {
        console.error('Download error:', err);
      }
    }
  }
})();
