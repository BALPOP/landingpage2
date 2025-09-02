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
  const DESTINATION_URL = 'https://googlegnrrz.com?ch=32098&fbPixelId=1289805165983519';
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
           Includes enhanced PageView, ViewContent, AddToCart, and Lead events with UTM parameters
  
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
    
    // Track enhanced PageView event immediately with UTM parameters
    const pageViewData = {
      content_name: 'PopDez Landing Page',
      content_category: 'Gaming Landing',
      content_type: 'website',
      currency: 'BRL',
      traffic_source: trafficInfo.primarySource,
      source_name: trafficInfo.sourceDetails.name,
      page_title: document.title,
      page_url: window.location.href,
      ...utmParams
    };
    
    // Fire enhanced PageView immediately
    trackMetaPixelEvent('PageView', pageViewData, 'Enhanced page view with UTM data');
    
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
  Purpose: Sends a test event to Meta Pixel for debugging purposes with Test Event Code
           Can be called from browser console to verify pixel functionality
  
  External APIs used:
  - fbq (Meta Pixel): Facebook pixel tracking function for test events
*/
function sendTestEvent(testEventCode = null) {
  console.log('🧪 Sending test event to Meta Pixel...');
  
  // Generate or use provided test event code
  const eventCode = testEventCode || 'TEST_' + Date.now();
  
  const testData = {
    content_name: 'Test Event',
    content_category: 'Debug',
    currency: 'BRL',
    value: 10.00,
    test_event_code: eventCode
  };
  
  console.log('🎯 Test Event Code:', eventCode);
  console.log('💡 Use this code in Facebook Test Events tool to filter results');
  
  // Send multiple test events for better visibility
  const events = ['Purchase', 'AddToCart', 'ViewContent'];
  
  events.forEach((eventName, index) => {
    setTimeout(() => {
      const eventData = {
        ...testData,
        content_name: `Test ${eventName}`,
        test_event_code: eventCode + '_' + eventName
      };
      
      trackMetaPixelEvent(eventName, eventData, `Test ${eventName} event`);
    }, index * 500); // Stagger events by 500ms
  });
  
  return eventCode;
}

/*
  Function: testFacebookConnectivity
  Purpose: Tests direct connectivity to Facebook's tracking endpoints
           Helps identify network, ad blocker, or privacy setting issues
  
  External APIs used:
  - Fetch API: Test HTTP requests to Facebook endpoints
  - Image API: Test pixel tracking requests
*/
async function testFacebookConnectivity() {
  console.log('🌐 === FACEBOOK CONNECTIVITY TEST ===');
  
  const pixelId = '1289805165983519';
  const testResults = {};
  
  // Test 1: Facebook Pixel Script Loading
  console.log('🔍 Test 1: Pixel Script Accessibility');
  try {
    const scriptResponse = await fetch('https://connect.facebook.net/en_US/fbevents.js', {
      method: 'HEAD',
      mode: 'no-cors'
    });
    console.log('✅ Facebook pixel script is accessible');
    testResults.scriptAccess = true;
  } catch (error) {
    console.error('❌ Facebook pixel script is BLOCKED:', error.message);
    testResults.scriptAccess = false;
  }
  
  // Test 2: Tracking Endpoint Accessibility
  console.log('🔍 Test 2: Tracking Endpoint Test');
  const testImage = new Image();
  
  return new Promise((resolve) => {
    testImage.onload = () => {
      console.log('✅ Facebook tracking endpoint is accessible');
      testResults.trackingAccess = true;
      completeConnectivityTest();
    };
    
    testImage.onerror = () => {
      console.error('❌ Facebook tracking endpoint is BLOCKED');
      testResults.trackingAccess = false;
      completeConnectivityTest();
    };
    
    // Test with actual pixel ID and test parameter
    testImage.src = `https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1&test=1&ts=${Date.now()}`;
    
    // Timeout after 5 seconds
    setTimeout(() => {
      if (testResults.trackingAccess === undefined) {
        console.error('⏰ Facebook tracking endpoint test TIMED OUT');
        testResults.trackingAccess = false;
        completeConnectivityTest();
      }
    }, 5000);
    
    function completeConnectivityTest() {
      console.log('📊 Connectivity Results:', testResults);
      
      if (!testResults.scriptAccess || !testResults.trackingAccess) {
        console.error('🚨 CONNECTIVITY ISSUES DETECTED:');
        console.log('   • Check ad blocker settings');
        console.log('   • Verify firewall/antivirus settings');
        console.log('   • Test in incognito/private browsing mode');
        console.log('   • Try different browser/device');
      } else {
        console.log('✅ Facebook connectivity is working properly');
      }
      
      console.log('🌐 === END CONNECTIVITY TEST ===');
      resolve(testResults);
    }
  });
}

/*
  Function: diagnoseMetaPixel
  Purpose: Comprehensive diagnostic function to check Meta Pixel health and connectivity
           Provides detailed information about potential issues
  
  External APIs used:
  - fbq (Meta Pixel): Facebook pixel tracking function
  - Performance API: Check network requests to Facebook
*/
async function diagnoseMetaPixel() {
  console.log('🔧 === META PIXEL DIAGNOSTIC REPORT ===');
  
  // Check if fbq is available
  if (typeof window.fbq === 'undefined') {
    console.error('❌ Meta Pixel (fbq) is NOT loaded');
    return;
  }
  
  console.log('✅ Meta Pixel (fbq) is available');
  console.log('📊 Pixel loaded status:', window.fbq.loaded);
  console.log('📊 Pixel version:', window.fbq.version);
  
  // Run connectivity test first
  await testFacebookConnectivity();
  
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
  testPixel.src = 'https://www.facebook.com/tr?id=1289805165983519&ev=PageView&noscript=1&test=1';
  
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

/*
  Function: keepUtmInUrl
  Purpose: Simple function to keep UTM parameters persistent in the URL
           Stores them when first detected and restores them if they disappear
  
  External APIs used:
  - Session Storage: Store UTM parameters
  - History API: Update URL without page reload
*/
function keepUtmInUrl() {
  const currentUtm = getUtmParameters();
  const hasUtmNow = Object.keys(currentUtm).length > 0;
  
  // If we have UTM parameters now, store them
  if (hasUtmNow) {
    try {
      sessionStorage.setItem('persistent_utm', JSON.stringify(currentUtm));
      console.log('✅ UTM parameters stored:', currentUtm);
    } catch (e) {
      console.log('⚠️ Could not store UTM parameters');
    }
    return;
  }
  
  // If we don't have UTM parameters now, check if we had them before
  try {
    const storedUtm = sessionStorage.getItem('persistent_utm');
    if (storedUtm) {
      const utmParams = JSON.parse(storedUtm);
      
      // Add them back to the URL
      const url = new URL(window.location.href);
      let modified = false;
      
      Object.keys(utmParams).forEach(key => {
        if (key !== 'tracking_timestamp' && utmParams[key]) {
          url.searchParams.set(key, utmParams[key]);
          modified = true;
        }
      });
      
      if (modified && window.history && window.history.replaceState) {
        window.history.replaceState({}, '', url.toString());
        console.log('🔄 UTM parameters restored to URL:', utmParams);
      }
    }
  } catch (e) {
    console.log('⚠️ Could not restore UTM parameters');
  }
}

/*
  Function: setupTestEventsMode
  Purpose: Sets up Test Events mode with proper test event codes for Ads Manager visibility
           This helps events show up in Facebook's Test Events tool
  
  External APIs used:
  - fbq (Meta Pixel): Facebook pixel tracking function with test event codes
*/
function setupTestEventsMode(testEventCode = null) {
  console.log('🧪 === SETTING UP TEST EVENTS MODE ===');
  
  const eventCode = testEventCode || 'LANDING_TEST_' + Date.now();
  
  console.log('🎯 Test Event Code:', eventCode);
  console.log('📋 Steps to verify in Facebook:');
  console.log('   1. Go to Events Manager > Test Events');
  console.log('   2. Enter your website URL');
  console.log('   3. Use Test Event Code:', eventCode);
  console.log('   4. Click "Test Events" button below');
  console.log('');
  
  // Override the current tracking to include test event codes
  const originalTrackMethod = window.trackMetaPixelEvent;
  
  window.trackMetaPixelEvent = function(eventName, eventData = {}, description = '') {
    // Add test event code to all events
    const enhancedData = {
      ...eventData,
      test_event_code: eventCode
    };
    
    console.log(`🧪 TEST MODE: ${eventName} with code: ${eventCode}`);
    return originalTrackMethod(eventName, enhancedData, description);
  };
  
  console.log('✅ Test Events mode activated!');
  console.log('🔄 Refresh the page or trigger events to see them in Ads Manager');
  console.log('🧪 === TEST EVENTS MODE ACTIVE ===');
  
  return eventCode;
}

/*
  Function: sendAdsManagerTest
  Purpose: Sends events specifically formatted for Facebook Ads Manager Test Events tool
           Includes proper test event codes and standard event parameters
*/
function sendAdsManagerTest() {
  console.log('📊 === SENDING ADS MANAGER TEST EVENTS ===');
  
  const testCode = 'ADS_MANAGER_TEST_' + Date.now();
  const pixelId = '1289805165983519';
  
  console.log('🎯 Test Event Code for Ads Manager:', testCode);
  console.log('📱 Pixel ID:', pixelId);
  console.log('');
  console.log('📋 INSTRUCTIONS:');
  console.log('1. Open Facebook Ads Manager');
  console.log('2. Go to Events Manager > Test Events');
  console.log('3. Enter this URL:', window.location.href);
  console.log('4. Click "Open Website"');
  console.log('5. Events should appear within 20 seconds');
  console.log('');
  
  // Send standard Facebook events with proper parameters
  const standardEvents = [
    {
      name: 'PageView',
      data: {
        content_name: 'PopDez Landing Page',
        content_category: 'Gaming',
        test_event_code: testCode + '_PageView'
      }
    },
    {
      name: 'ViewContent',
      data: {
        content_name: 'PopDez Bonus Offer',
        content_category: 'Gaming',
        content_type: 'product',
        currency: 'BRL',
        test_event_code: testCode + '_ViewContent'
      }
    },
    {
      name: 'AddToCart',
      data: {
        content_name: 'PopDez Bonus',
        content_category: 'Gaming',
        currency: 'BRL',
        value: 1.00,
        test_event_code: testCode + '_AddToCart'
      }
    }
  ];
  
  // Send events with 1-second intervals
  standardEvents.forEach((event, index) => {
    setTimeout(() => {
      console.log(`🚀 Sending ${event.name} to Ads Manager...`);
      trackMetaPixelEvent(event.name, event.data, `Ads Manager test - ${event.name}`);
    }, (index + 1) * 1000);
  });
  
  console.log('⏰ All test events will be sent within 3 seconds');
  console.log('📊 Check Ads Manager Test Events tool for results');
  console.log('📊 === END ADS MANAGER TEST ===');
  
  return testCode;
}

// Make all functions globally available for console debugging
window.diagnoseMetaPixel = diagnoseMetaPixel;
window.sendTestEvent = sendTestEvent;
window.generateUtmUrls = generateUtmUrls;
window.showTrafficSourceReport = showTrafficSourceReport;
window.getTrafficSourceInfo = getTrafficSourceInfo;
window.verifyBasicPageView = verifyBasicPageView;
window.testFacebookConnectivity = testFacebookConnectivity;
window.setupTestEventsMode = setupTestEventsMode;
window.sendAdsManagerTest = sendAdsManagerTest;
window.keepUtmInUrl = keepUtmInUrl;
window.diagnoseGitHubPagesIssues = diagnoseGitHubPagesIssues;

/*
  Function: verifyBasicPageView
  Purpose: Verifies that the basic PageView event from HTML fired correctly
           This complements the enhanced PageView tracking
  
  External APIs used:
  - fbq (Meta Pixel): Facebook pixel tracking function
*/
function verifyBasicPageView() {
  console.log('🔍 Verifying basic PageView event...');
  
  // Check if fbq is available and has fired PageView
  if (typeof window.fbq !== 'undefined') {
    console.log('✅ Meta Pixel is loaded');
    
    // The basic PageView should have fired from HTML
    // We can verify by checking network requests or pixel helper
    console.log('📊 Basic PageView should have fired from HTML <head> section');
    console.log('💡 Use Meta Pixel Helper browser extension to verify');
    
    return true;
  } else {
    console.error('❌ Meta Pixel not available - basic PageView may not have fired');
    return false;
  }
}





/*
  Function: diagnoseGitHubPagesIssues
  Purpose: Diagnoses common GitHub Pages issues with custom domains and URL parameters
           Specifically checks for redirect chains and DNS-level parameter stripping
  
  External APIs used:
  - Fetch API: Test redirect behavior
  - Performance API: Check for redirect timing
*/
async function diagnoseGitHubPagesIssues() {
  console.log('🏠 === GITHUB PAGES DOMAIN DIAGNOSIS ===');
  
  const currentDomain = window.location.hostname;
  const isCustomDomain = !currentDomain.includes('github.io');
  const isLocalhost = currentDomain.includes('localhost') || currentDomain.includes('127.0.0.1');
  
  console.log('🌐 Domain Info:');
  console.log('   Current domain:', currentDomain);
  console.log('   Custom domain:', isCustomDomain ? '✅ Yes' : '❌ No (using github.io)');
  console.log('   Localhost:', isLocalhost ? '✅ Yes' : '❌ No');
  console.log('');
  
  if (isLocalhost) {
    console.log('💡 Running on localhost - GitHub Pages issues won\'t occur here');
    console.log('🔧 Test on your actual domain to diagnose GitHub Pages issues');
    console.log('🏠 === END GITHUB PAGES DIAGNOSIS ===');
    return;
  }
  
  // Check for common GitHub Pages + custom domain issues
  console.log('🔍 Common GitHub Pages Issues:');
  
  // Check 1: HTTPS redirect
  if (window.location.protocol === 'http:') {
    console.error('❌ Using HTTP - GitHub Pages forces HTTPS redirects');
    console.log('   🔧 This redirect may strip URL parameters');
    console.log('   💡 Always use HTTPS URLs for your campaigns');
  } else {
    console.log('✅ Using HTTPS - good for parameter preservation');
  }
  
  // Check 2: WWW redirect
  const hasWww = currentDomain.startsWith('www.');
  console.log('🌐 WWW Configuration:');
  console.log('   Has www:', hasWww ? '✅ Yes' : '❌ No');
  console.log('   💡 Ensure your DNS and GitHub Pages settings match');
  
  // Check 3: Redirect chain detection
  console.log('🔄 Testing for redirect chains...');
  
  try {
    // Test both www and non-www versions
    const testUrls = [
      `https://${currentDomain}/?test_param=github_pages_test`,
      `https://www.${currentDomain.replace('www.', '')}/?test_param=github_pages_test`
    ];
    
    for (const testUrl of testUrls) {
      try {
        const response = await fetch(testUrl, { 
          method: 'HEAD', 
          redirect: 'manual' 
        });
        
        console.log(`📊 ${testUrl}:`);
        console.log(`   Status: ${response.status}`);
        
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          console.log(`   ⚠️  Redirects to: ${location}`);
          
          // Check if redirect preserves parameters
          if (location && !location.includes('test_param')) {
            console.error('   ❌ REDIRECT STRIPS PARAMETERS!');
          } else {
            console.log('   ✅ Redirect preserves parameters');
          }
        }
      } catch (e) {
        console.log(`   ❌ Could not test ${testUrl}: ${e.message}`);
      }
    }
  } catch (error) {
    console.error('❌ Could not test redirect behavior:', error.message);
  }
  
  // Check 4: DNS provider specific issues
  console.log('🏷️  DNS Provider Issues:');
  console.log('   Porkbun detected - check these settings:');
  console.log('   • Ensure CNAME points directly to your-username.github.io');
  console.log('   • Disable any "URL forwarding" or "redirect" features');
  console.log('   • Check if "HTTPS redirect" is enabled at DNS level');
  console.log('   • Verify no "www redirect" is configured at DNS level');
  
  // Check 5: GitHub Pages configuration
  console.log('⚙️  GitHub Pages Configuration:');
  console.log('   Check your GitHub repository settings:');
  console.log('   • Pages > Custom domain should match exactly: ' + currentDomain);
  console.log('   • "Enforce HTTPS" should be enabled');
  console.log('   • No trailing slashes in custom domain setting');
  
  console.log('');
  console.log('🔧 SOLUTIONS FOR PARAMETER STRIPPING:');
  console.log('   1. Always use HTTPS URLs in campaigns');
  console.log('   2. Match www/non-www exactly in all settings');
  console.log('   3. Disable any DNS-level redirects');
  console.log('   4. Fix DNS configuration at Porkbun');
  console.log('   5. Consider using fragment identifiers (#) instead of query params');
  
  console.log('🏠 === END GITHUB PAGES DIAGNOSIS ===');
  
  return {
    domain: currentDomain,
    isCustomDomain,
    isLocalhost,
    protocol: window.location.protocol,
    hasWww
  };
}

function init() {
  // Keep UTM parameters persistent in URL
  keepUtmInUrl();
  
  // Check every 2 seconds to ensure UTM parameters stay in URL
  setInterval(() => {
    keepUtmInUrl();
  }, 2000);
  
  applyCtaUrl();
  
  // Verify basic PageView fired
  setTimeout(() => {
    verifyBasicPageView();
  }, 500);
  
  setupMetaPixelTracking();
  startCountdown();
  initCarousel();
  
  // Log helpful debug info
  console.log('🔧 === DEBUG COMMANDS AVAILABLE ===');
  console.log('📊 REPORTING:');
  console.log('   showTrafficSourceReport() - View current traffic source');
  console.log('   diagnoseMetaPixel() - Full Meta Pixel diagnostic');
  console.log('   testFacebookConnectivity() - Test Facebook connectivity');
  console.log('   diagnoseGitHubPagesIssues() - Check GitHub Pages domain issues');
  console.log('');
  console.log('🧪 TESTING:');
  console.log('   sendTestEvent() - Send test events with codes');
  console.log('   sendAdsManagerTest() - Send events for Ads Manager');
  console.log('   setupTestEventsMode() - Enable test mode for all events');
  console.log('   verifyBasicPageView() - Check basic PageView event');
  console.log('');
  console.log('🔗 UTILITIES:');
  console.log('   generateUtmUrls() - Generate tracking URLs');
  console.log('   keepUtmInUrl() - Keep UTM parameters in URL');
  console.log('');
  console.log('🚨 TROUBLESHOOTING ADS MANAGER:');
  console.log('   1. Run: sendAdsManagerTest()');
  console.log('   2. Copy the test event code shown');
  console.log('   3. Go to Events Manager > Test Events');
  console.log('   4. Enter your website URL and test code');
  console.log('');
  console.log('🔧 Also: Check Network tab for fbevents requests');
  console.log('🔧 Install Meta Pixel Helper browser extension for validation');
}



if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 