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
           Enhanced with source detection and automatic parameter enrichment
  
  Returns: Object containing UTM parameters with source-specific enhancements
  
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
  
  // Auto-detect source if not explicitly set
  if (!utmParams.utm_source) {
    const referrer = document.referrer.toLowerCase();
    const hostname = window.location.hostname.toLowerCase();
    
    if (referrer.includes('instagram.com') || referrer.includes('ig.me')) {
      utmParams.utm_source = 'instagram';
      utmParams.utm_medium = utmParams.utm_medium || 'social';
    } else if (referrer.includes('facebook.com') || referrer.includes('fb.me')) {
      utmParams.utm_source = 'facebook';
      utmParams.utm_medium = utmParams.utm_medium || 'social';
    } else if (referrer.includes('youtube.com') || referrer.includes('twitch.tv') || referrer.includes('live')) {
      utmParams.utm_source = 'livestream';
      utmParams.utm_medium = utmParams.utm_medium || 'video';
    }
  }
  
  // Add timestamp for tracking
  if (Object.keys(utmParams).length > 0) {
    utmParams.tracking_timestamp = new Date().toISOString();
  }
  
  return utmParams;
}

/*
  Function: getTrafficSourceInfo
  Purpose: Provides detailed information about the current traffic source
           Returns both UTM parameters and source classification
  
  Returns: Object with source details and recommended UTM parameters
*/
function getTrafficSourceInfo() {
  const utmParams = getUtmParameters();
  const currentUrl = window.location.href;
  const referrer = document.referrer;
  
  // Determine primary source
  let primarySource = 'direct';
  let sourceDetails = {};
  
  if (utmParams.utm_source) {
    primarySource = utmParams.utm_source.toLowerCase();
  } else if (referrer) {
    if (referrer.includes('instagram')) primarySource = 'instagram';
    else if (referrer.includes('facebook')) primarySource = 'facebook';
    else if (referrer.includes('youtube') || referrer.includes('twitch')) primarySource = 'livestream';
    else primarySource = 'referral';
  }
  
  // Source-specific configurations
  const sourceConfigs = {
    livestream: {
      icon: '🎥',
      name: 'Live Stream',
      recommended_medium: 'video',
      recommended_campaign: 'live_promo'
    },
    instagram: {
      icon: '📸',
      name: 'Instagram',
      recommended_medium: 'social',
      recommended_campaign: 'ig_promo'
    },
    facebook: {
      icon: '👥',
      name: 'Facebook',
      recommended_medium: 'social',
      recommended_campaign: 'fb_promo'
    },
    direct: {
      icon: '🔗',
      name: 'Direct',
      recommended_medium: 'direct',
      recommended_campaign: 'direct_visit'
    }
  };
  
  sourceDetails = sourceConfigs[primarySource] || sourceConfigs.direct;
  
  return {
    primarySource,
    sourceDetails,
    utmParams,
    currentUrl,
    referrer,
    isTracked: Object.keys(utmParams).length > 0
  };
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
  
  // Store the destination URL for programmatic redirect after event tracking
  cta.setAttribute('data-destination', tracked);
  
  // Remove href to prevent immediate navigation - we'll handle redirect manually
  cta.removeAttribute('href');
  
  // Add visual indication that it's clickable
  cta.style.cursor = 'pointer';
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
    
    // Get comprehensive traffic source information
    const trafficInfo = getTrafficSourceInfo();
    const utmParams = trafficInfo.utmParams;
    
    console.log('📊 Traffic Source Info:', trafficInfo);
    console.log(`${trafficInfo.sourceDetails.icon} Primary Source: ${trafficInfo.sourceDetails.name}`);
    console.log('📊 UTM parameters for tracking:', utmParams);
    
    // Track ViewContent event when page is fully loaded (engagement event)
    const viewContentData = {
      content_name: 'PopDez Landing Page',
      content_category: 'Gaming Landing',
      content_type: 'product',
      currency: 'BRL',
      traffic_source: trafficInfo.primarySource,
      source_name: trafficInfo.sourceDetails.name,
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
          traffic_source: trafficInfo.primarySource,
          source_name: trafficInfo.sourceDetails.name,
          engagement_type: scrollThreshold ? 'scroll' : 'time',
          ...utmParams
        };
        trackMetaPixelEvent('Lead', leadData, 'User showed engagement');
        
        // Remove scroll listener to prevent multiple triggers
        window.removeEventListener('scroll', handleScroll);
      }
    }
    
    window.addEventListener('scroll', handleScroll);
    
    // Track AddToCart event when CTA is clicked with delayed redirect
    cta.addEventListener('click', function(event) {
      // Prevent default link behavior to control timing
      event.preventDefault();
      
      console.log('🎯 CTA button clicked! Tracking event before redirect...');
      
      const addToCartData = {
        content_name: 'PopDez Bonus Exclusivo',
        content_category: 'Gaming Bonus',
        content_type: 'product',
        currency: 'BRL',
        value: 1.00, // Symbolic value for bonus
        traffic_source: trafficInfo.primarySource,
        source_name: trafficInfo.sourceDetails.name,
        conversion_step: 'cta_click',
        ...utmParams
      };
      
      // Track the event
      const eventSent = trackMetaPixelEvent('AddToCart', addToCartData, 'CTA button clicked');
      
      // Get destination URL from data attribute
      const destinationUrl = cta.getAttribute('data-destination');
      
      if (destinationUrl) {
        // Wait for Meta Pixel event to be sent before redirecting
        // Use both timeout and fbq callback for maximum compatibility
        let redirected = false;
        
        const performRedirect = () => {
          if (!redirected) {
            redirected = true;
            console.log('🚀 Redirecting to:', destinationUrl);
            window.location.href = destinationUrl;
          }
        };
        
        // Primary method: Wait for fbq to process (300ms is usually enough)
        setTimeout(performRedirect, 300);
        
        // Fallback: Ensure redirect happens even if event fails (1 second max)
        setTimeout(performRedirect, 1000);
        
        // Optional: Try to use fbq callback if available (not always supported)
        try {
          if (window.fbq && typeof window.fbq.queue !== 'undefined') {
            window.fbq('track', 'AddToCart', addToCartData, {
              eventID: 'redirect_' + Date.now() // Prevent duplicate events
            });
          }
        } catch (e) {
          console.log('📝 Note: fbq callback not available, using timeout method');
        }
      } else {
        console.error('❌ No destination URL found in data-destination attribute');
      }
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

/*
  Function: diagnoseMetaPixel
  Purpose: Comprehensive diagnostic function to check Meta Pixel health and connectivity
           Provides detailed information about potential issues
  
  External APIs used:
  - fbq (Meta Pixel): Facebook pixel tracking function
  - Performance API: Check network requests to Facebook
*/
function diagnoseMetaPixel() {
  console.log('🔧 === META PIXEL DIAGNOSTIC REPORT ===');
  
  // Check if fbq is available
  if (typeof window.fbq === 'undefined') {
    console.error('❌ Meta Pixel (fbq) is NOT loaded');
    return;
  }
  
  console.log('✅ Meta Pixel (fbq) is available');
  console.log('📊 Pixel loaded status:', window.fbq.loaded);
  console.log('📊 Pixel version:', window.fbq.version);
  
  // Check recent network requests to Facebook
  if ('performance' in window && 'getEntriesByType' in performance) {
    const networkEntries = performance.getEntriesByType('resource');
    const facebookRequests = networkEntries.filter(entry => 
      entry.name.includes('facebook.com') || entry.name.includes('connect.facebook.net')
    );
    
    console.log('🌐 Facebook network requests found:', facebookRequests.length);
    facebookRequests.forEach((request, index) => {
      console.log(`   ${index + 1}. ${request.name} (${request.responseStatus || 'unknown status'})`);
    });
  }
  
  // Check for ad blockers or privacy features
  const testPixel = new Image();
  testPixel.onload = () => console.log('✅ Facebook tracking domain is accessible');
  testPixel.onerror = () => console.error('❌ Facebook tracking domain is BLOCKED (ad blocker or privacy settings)');
  testPixel.src = 'https://www.facebook.com/tr?id=1032961382302053&ev=PageView&noscript=1&test=1';
  
  // Browser detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isPrivateMode = window.navigator.doNotTrack === '1';
  
  console.log('📱 Browser info:');
  console.log('   iOS device:', isIOS);
  console.log('   Safari browser:', isSafari);
  console.log('   Do Not Track enabled:', isPrivateMode);
  
  if (isIOS || isSafari) {
    console.warn('⚠️  iOS/Safari detected - tracking may be limited by Intelligent Tracking Prevention');
  }
  
  // Test event firing
  console.log('🧪 Sending diagnostic test event...');
  sendTestEvent();
  
  // GitHub Pages specific checks
  const isGitHubPages = window.location.hostname.includes('github.io');
  console.log('🏠 GitHub Pages hosting:', isGitHubPages);
  
  if (isGitHubPages) {
    console.log('📝 GitHub Pages detected - ensure domain is verified in Facebook Business Manager');
    console.log('📝 GitHub Pages may have additional HTTPS/security considerations');
  }
  
  console.log('📋 NEXT STEPS:');
  console.log('   1. Click your CTA button and watch for "Redirecting to:" message');
  console.log('   2. Check Network tab for requests to facebook.com/tr');
  console.log('   3. Wait 15-30 minutes and check Facebook Events Manager');
  console.log('   4. Verify domain in Facebook Business Manager (especially for GitHub Pages)');
  console.log('   5. Install Meta Pixel Helper browser extension');
  console.log('🔧 === END DIAGNOSTIC REPORT ===');
}

/*
  Function: generateUtmUrls
  Purpose: Generates example URLs with proper UTM parameters for each traffic source
           Helps with campaign setup and link sharing
  
  Returns: Object with example URLs for each source
*/
function generateUtmUrls() {
  const baseUrl = window.location.origin + window.location.pathname;
  
  const utmTemplates = {
    livestream: {
      utm_source: 'livestream',
      utm_medium: 'video',
      utm_campaign: 'live_promo',
      utm_content: 'cta_button'
    },
    instagram: {
      utm_source: 'instagram',
      utm_medium: 'social',
      utm_campaign: 'ig_promo',
      utm_content: 'story_link'
    },
    facebook: {
      utm_source: 'facebook',
      utm_medium: 'social',
      utm_campaign: 'fb_promo',
      utm_content: 'post_link'
    }
  };
  
  const generatedUrls = {};
  
  Object.keys(utmTemplates).forEach(source => {
    const params = new URLSearchParams(utmTemplates[source]);
    generatedUrls[source] = `${baseUrl}?${params.toString()}`;
  });
  
  console.log('🔗 === UTM TRACKING URLS ===');
  console.log('📋 Use these URLs for your campaigns:');
  console.log('');
  
  Object.keys(generatedUrls).forEach(source => {
    const config = utmTemplates[source];
    const sourceInfo = {
      livestream: { icon: '🎥', name: 'Live Stream' },
      instagram: { icon: '📸', name: 'Instagram' },
      facebook: { icon: '👥', name: 'Facebook' }
    }[source];
    
    console.log(`${sourceInfo.icon} ${sourceInfo.name}:`);
    console.log(`   ${generatedUrls[source]}`);
    console.log('');
  });
  
  console.log('💡 Tips:');
  console.log('   - Customize utm_campaign for different promotions');
  console.log('   - Use utm_content to track specific posts/stories');
  console.log('   - Add utm_term for A/B testing different messages');
  console.log('🔗 === END UTM URLS ===');
  
  return generatedUrls;
}

/*
  Function: showTrafficSourceReport
  Purpose: Displays a comprehensive report of current traffic source and UTM tracking
           Useful for debugging and verification
*/
function showTrafficSourceReport() {
  const trafficInfo = getTrafficSourceInfo();
  
  console.log('📊 === TRAFFIC SOURCE REPORT ===');
  console.log(`${trafficInfo.sourceDetails.icon} Current Source: ${trafficInfo.sourceDetails.name}`);
  console.log('📍 Current URL:', trafficInfo.currentUrl);
  console.log('🔗 Referrer:', trafficInfo.referrer || 'Direct/None');
  console.log('✅ UTM Tracking:', trafficInfo.isTracked ? 'Active' : 'Not Detected');
  console.log('');
  
  if (trafficInfo.isTracked) {
    console.log('📊 UTM Parameters:');
    Object.keys(trafficInfo.utmParams).forEach(key => {
      console.log(`   ${key}: ${trafficInfo.utmParams[key]}`);
    });
  } else {
    console.log('💡 No UTM parameters detected. Use generateUtmUrls() to create tracking links.');
  }
  
  console.log('📊 === END REPORT ===');
  
  return trafficInfo;
}

// Make all functions globally available for console debugging
window.diagnoseMetaPixel = diagnoseMetaPixel;
window.sendTestEvent = sendTestEvent;
window.generateUtmUrls = generateUtmUrls;
window.showTrafficSourceReport = showTrafficSourceReport;
window.getTrafficSourceInfo = getTrafficSourceInfo;

function init() {
  applyCtaUrl();
  setupMetaPixelTracking();
  startCountdown();
  initCarousel();
  
  // Log helpful debug info
  console.log('🔧 Debug Commands Available:');
  console.log('   📊 showTrafficSourceReport() - View current traffic source');
  console.log('   🔗 generateUtmUrls() - Generate tracking URLs');
  console.log('   🧪 diagnoseMetaPixel() - Full Meta Pixel diagnostic');
  console.log('   🎯 sendTestEvent() - Test individual events');
  console.log('🔧 Also: Check Network tab for fbevents requests');
  console.log('🔧 Install Meta Pixel Helper browser extension for validation');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 