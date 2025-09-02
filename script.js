/*
  File: Landing Page/script.js
  Purpose: Minimal behavior for the standalone landing page.
  - Configures the CTA destination URL.
  - Appends query parameters (e.g., UTM/fbclid) from the current URL to the CTA link.
  - Manages countdown timer starting from 24:00:00.
  - Controls image carousel with auto-rotation and manual controls.
  - Tracks UTM parameters with Meta Pixel for traffic source segmentation.

  External APIs used:
  - URL and URLSearchParams (Web APIs): parse and construct URLs.
  - fbq (Meta Pixel): Facebook pixel tracking function for conversion events.
*/

/*
  Function: getUtmParameters
  Purpose: Extracts UTM parameters from the current URL for Meta Pixel tracking
  
  Returns: Object containing UTM parameters (utm_source, utm_medium, utm_campaign, etc.)
  
  External APIs used:
  - URLSearchParams (Web API): parse URL query parameters
*/
function getUtmParameters() {
  const params = new URLSearchParams(window.location.search);
  const utmParams = {};
  
  // Standard UTM parameters
  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  
  utmKeys.forEach(key => {
    if (params.has(key)) {
      utmParams[key] = params.get(key);
    }
  });
  
  return utmParams;
}

/*
  Function: buildTrackedUrl
  Purpose: Builds destination URL with inherited parameters from the current page
           Preserves existing destination URL parameters (ch, fbPixelId) and adds tracking parameters
  
  Inputs:
  - baseUrl: The destination URL with existing parameters
  - sourceParams: URLSearchParams object from the current page
  
  Returns: Complete URL string with all parameters merged
  
  External APIs used:
  - URL and URLSearchParams (Web APIs): parse and construct URLs with parameters
*/
function buildTrackedUrl(baseUrl, sourceParams) {
  const allowedParams = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'ch', 'fbPixelId'
  ];
  
  // Create URL object which automatically preserves existing parameters
  const url = new URL(baseUrl);
  
  // Add allowed parameters from the source page
  for (const key of allowedParams) {
    if (sourceParams.has(key)) {
      // Only add if not already present in destination URL (preserves destination URL priority)
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, sourceParams.get(key) || '');
      }
    }
  }
  
  return url.toString();
}

function applyCtaUrl() {
  const DESTINATION_URL = 'https://x9a8rje.com?ch=6825&fbPixelId=1032961382302053';
  const cta = document.getElementById('primary-cta');
  if (!cta) return;
  const params = new URLSearchParams(window.location.search);
  const tracked = buildTrackedUrl(DESTINATION_URL, params);
  cta.setAttribute('href', tracked);
}

/*
  Function: setupMetaPixelTracking
  Purpose: Sets up Meta Pixel AddToCart event tracking for the primary CTA button
           Includes UTM parameters for traffic source segmentation
  
  External APIs used:
  - fbq (Meta Pixel): Facebook pixel tracking function for conversion events
*/
function setupMetaPixelTracking() {
  const cta = document.getElementById('primary-cta');
  if (!cta) return;
  
  // Add click event listener to track AddToCart event
  cta.addEventListener('click', function(event) {
    // Check if fbq (Facebook Pixel) is available
    if (typeof fbq !== 'undefined') {
      // Get UTM parameters for traffic source tracking
      const utmParams = getUtmParameters();
      
      // Build event data with UTM parameters
      const eventData = {
        content_name: 'PopDez Bonus Exclusivo',
        content_category: 'Gaming Bonus',
        currency: 'BRL',
        ...utmParams // Spread UTM parameters into the event data
      };
      
      // Track AddToCart event when the main CTA button is clicked
      fbq('track', 'AddToCart', eventData);
      
      console.log('Meta Pixel: AddToCart event tracked with UTM parameters:', eventData);
    } else {
      console.warn('Meta Pixel (fbq) not available');
    }
  });
}

function startCountdown() {
  // Start from 24 hours (86400 seconds)
  let timeLeft = 24 * 60 * 60;
  
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  
  if (!hoursEl || !minutesEl || !secondsEl) return;
  
  function updateDisplay() {
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;
    
    hoursEl.textContent = hours.toString().padStart(2, '0');
    minutesEl.textContent = minutes.toString().padStart(2, '0');
    secondsEl.textContent = seconds.toString().padStart(2, '0');
  }
  
  function tick() {
    if (timeLeft <= 0) {
      timeLeft = 24 * 60 * 60; // Reset to 24 hours
    } else {
      timeLeft--;
    }
    updateDisplay();
  }
  
  // Initial display
  updateDisplay();
  
  // Update every second
  setInterval(tick, 1000);
}

function initCarousel() {
  const images = document.querySelectorAll('.carousel-image');
  const indicators = document.querySelectorAll('.indicator');
  const leftArrow = document.querySelector('.carousel-arrow-left');
  const rightArrow = document.querySelector('.carousel-arrow-right');
  
  if (!images.length || !indicators.length) return;
  
  let currentIndex = 0;
  let autoRotateInterval;
  
  function showImage(index) {
    // Remove active class from all images and indicators
    images.forEach(img => img.classList.remove('active'));
    indicators.forEach(ind => ind.classList.remove('active'));
    
    // Add active class to current image and indicator
    if (images[index]) images[index].classList.add('active');
    if (indicators[index]) indicators[index].classList.add('active');
    
    currentIndex = index;
  }
  
  function nextImage() {
    const nextIndex = (currentIndex + 1) % images.length;
    showImage(nextIndex);
  }
  
  function prevImage() {
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    showImage(prevIndex);
  }
  
  function startAutoRotation() {
    autoRotateInterval = setInterval(nextImage, 6000); // 6 seconds
  }
  
  function stopAutoRotation() {
    clearInterval(autoRotateInterval);
  }
  
  function resetAutoRotation() {
    stopAutoRotation();
    startAutoRotation();
  }
  
  // Arrow controls
  if (leftArrow) {
    leftArrow.addEventListener('click', () => {
      prevImage();
      resetAutoRotation();
    });
  }
  
  if (rightArrow) {
    rightArrow.addEventListener('click', () => {
      nextImage();
      resetAutoRotation();
    });
  }
  
  // Indicator controls
  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      showImage(index);
      resetAutoRotation();
    });
  });
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      prevImage();
      resetAutoRotation();
    } else if (e.key === 'ArrowRight') {
      nextImage();
      resetAutoRotation();
    }
  });
  
  // Pause auto-rotation on hover
  const carousel = document.querySelector('.image-carousel');
  if (carousel) {
    carousel.addEventListener('mouseenter', stopAutoRotation);
    carousel.addEventListener('mouseleave', startAutoRotation);
  }
  
  // Start auto-rotation
  startAutoRotation();
}

function init() {
  applyCtaUrl();
  setupMetaPixelTracking();
  startCountdown();
  initCarousel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 