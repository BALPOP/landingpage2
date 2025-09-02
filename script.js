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
  Function: waitForFbq
  Purpose: Waits for Meta Pixel (fbq) to be available with timeout and retry logic
  
  Returns: Promise that resolves when fbq is available or rejects on timeout
  
  External APIs used:
  - fbq (Meta Pixel): Facebook pixel tracking function
*/
function waitForFbq(maxAttempts = 50, interval = 100) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    function checkFbq() {
      attempts++;
      console.log(`🔍 Checking for Meta Pixel availability (attempt ${attempts}/${maxAttempts})`);
      
      if (typeof window.fbq !== 'undefined' && window.fbq.loaded) {
        console.log('✅ Meta Pixel (fbq) is ready and loaded!');
        resolve(window.fbq);
        return;
      }
      
      if (attempts >= maxAttempts) {
        console.error('❌ Meta Pixel (fbq) failed to load within timeout period');
        reject(new Error('Meta Pixel timeout'));
        return;
      }
      
      setTimeout(checkFbq, interval);
    }
    
    checkFbq();
  });
}

/*
  Function: trackMetaPixelEvent
  Purpose: Safely tracks Meta Pixel events with error handling and logging
  
  Inputs:
  - eventName: String name of the event to track (e.g., 'AddToCart', 'ViewContent')
  - eventData: Object containing event parameters
  - description: Human-readable description for logging
  
  External APIs used:
  - fbq (Meta Pixel): Facebook pixel tracking function for conversion events
*/
function trackMetaPixelEvent(eventName, eventData = {}, description = '') {
  try {
    if (typeof window.fbq === 'undefined') {
      console.error('❌ Meta Pixel (fbq) not available for event:', eventName);
      return false;
    }
    
    console.log(`🎯 Tracking ${eventName} event${description ? ': ' + description : ''}`, eventData);
    window.fbq('track', eventName, eventData);
    console.log(`✅ ${eventName} event tracked successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ Error tracking ${eventName} event:`, error);
    return false;
  }
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
  Purpose: Sets up comprehensive Meta Pixel event tracking for user engagement
           Includes ViewContent, AddToCart, and Lead events with UTM parameters
  
  External APIs used:
  - fbq (Meta Pixel): Facebook pixel tracking function for conversion events
*/
async function setupMetaPixelTracking() {
  console.log('🚀 Setting up Meta Pixel tracking...');
  
  try {
    // Wait for Meta Pixel to be ready
    await waitForFbq();
    
    const cta = document.getElementById('primary-cta');
    if (!cta) {
      console.error('❌ Primary CTA button not found!');
      return;
    }
    
    console.log('✅ Primary CTA button found:', cta);
    
    // Get UTM parameters for all events
    const utmParams = getUtmParameters();
    console.log('📊 UTM parameters for tracking:', utmParams);
    
    // Track ViewContent event when page is fully loaded (engagement event)
    const viewContentData = {
      content_name: 'PopDez Landing Page',
      content_category: 'Gaming Landing',
      content_type: 'product',
      currency: 'BRL',
      ...utmParams
    };
    
    // Delay ViewContent to ensure user actually viewed the content
    setTimeout(() => {
      trackMetaPixelEvent('ViewContent', viewContentData, 'Landing page viewed');
    }, 2000);
    
    // Track Lead event when user shows interest (scrolling or time spent)
    let leadTracked = false;
    let scrollThreshold = false;
    let timeThreshold = false;
    
    // Track scroll engagement
    function handleScroll() {
      if (!scrollThreshold && window.scrollY > 300) {
        scrollThreshold = true;
        console.log('📜 User scrolled past 300px');
        checkLeadConditions();
      }
    }
    
    // Track time engagement (10 seconds)
    setTimeout(() => {
      timeThreshold = true;
      console.log('⏰ User spent 10+ seconds on page');
      checkLeadConditions();
    }, 10000);
    
    function checkLeadConditions() {
      if (!leadTracked && (scrollThreshold || timeThreshold)) {
        leadTracked = true;
        const leadData = {
          content_name: 'PopDez Interest',
          content_category: 'Gaming Lead',
          currency: 'BRL',
          ...utmParams
        };
        trackMetaPixelEvent('Lead', leadData, 'User showed engagement');
        
        // Remove scroll listener to prevent multiple triggers
        window.removeEventListener('scroll', handleScroll);
      }
    }
    
    window.addEventListener('scroll', handleScroll);
    
    // Track AddToCart event when CTA is clicked
    cta.addEventListener('click', function(event) {
      console.log('🎯 CTA button clicked!');
      
      const addToCartData = {
        content_name: 'PopDez Bonus Exclusivo',
        content_category: 'Gaming Bonus',
        content_type: 'product',
        currency: 'BRL',
        value: 1.00, // Symbolic value for bonus
        ...utmParams
      };
      
      trackMetaPixelEvent('AddToCart', addToCartData, 'CTA button clicked');
    });
    
    console.log('✅ Meta Pixel tracking setup completed successfully');
    
  } catch (error) {
    console.error('❌ Failed to setup Meta Pixel tracking:', error);
    console.log('🔧 Available global functions:', Object.keys(window).filter(key => key.includes('fb')));
  }
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

/*
  Function: sendTestEvent
  Purpose: Sends a test event to Meta Pixel for debugging purposes
           Can be called from browser console to verify pixel functionality
  
  External APIs used:
  - fbq (Meta Pixel): Facebook pixel tracking function for test events
*/
function sendTestEvent() {
  console.log('🧪 Sending test event to Meta Pixel...');
  
  const testData = {
    content_name: 'Test Event',
    content_category: 'Debug',
    currency: 'BRL',
    test_event_code: 'TEST_' + Date.now()
  };
  
  return trackMetaPixelEvent('Purchase', testData, 'Manual test event');
}

// Make test function globally available for console debugging
window.sendTestEvent = sendTestEvent;

function init() {
  applyCtaUrl();
  setupMetaPixelTracking();
  startCountdown();
  initCarousel();
  
  // Log helpful debug info
  console.log('🔧 Debug: Call sendTestEvent() in console to test Meta Pixel');
  console.log('🔧 Debug: Check Network tab for fbevents requests');
  console.log('🔧 Debug: Use Meta Pixel Helper browser extension for validation');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 