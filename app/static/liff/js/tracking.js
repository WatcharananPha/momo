let selectedRating = 5;
let currentBookingId = null;
let map = null;
let maidMarker = null;
let trackingInterval = null;

// Routing & Animation variables
let directionsService = null;
let directionsRenderer = null;
let lastRouteTime = 0;
let currentMaidPos = null;
let customerPos = null; 
let animationFrameId = null;

/**
 * Senior Dev Insights: Bootstrap sequence and Lifecycle management.
 */

async function initTracking() {
    console.info("[Init] Starting Tracking Bootstrap...");
    await initCoreLiff(true);
    
    // 1. Fetch Maps Config from Backend securely
    let api_key = null;
    try {
        const res = await fetch(`${API_BASE}/line/config/maps`);
        if (res.ok) {
            const data = await res.json();
            if (data.api_key) api_key = data.api_key;
        } else {
            console.error("[Config] Backend returned error status:", res.status);
        }
    } catch (e) {
        console.error("[Config] Backend fetch failed for MAP_API:", e);
    }

    // Fallback: try reading a meta tag injected by server-side if fetch failed
    if (!api_key) {
        const meta = document.querySelector('meta[name="maps-api-key"]');
        if (meta && meta.content && meta.content !== '__MAP_API__' && meta.content !== '') {
            api_key = meta.content;
            console.warn('[Config] Using fallback MAP_API from meta tag.');
        }
    }

    if (!api_key) {
        console.error("[Config] FATAL: MAP_API Key is MISSING. Please set 'MAP_API' variable in Railway Dashboard.");
        showToast("Missing Maps API Key. Please check Railway Variables.", "error");
        
        const mapEl = document.getElementById("map");
        if (mapEl) {
            mapEl.innerHTML = '<div class="p-4 text-center text-red-500 font-bold">API Key Missing<br><span class="text-[10px] text-slate-400">Set MAP_API in Railway Dashboard</span></div>';
            mapEl.className = 'w-full h-full flex items-center justify-center bg-red-50';
        }
        return;
    }

    console.log("[Config] Maps API Key detected. Injecting SDK...");

    // 3. Dynamic Script Injection (with geometry library for rotation math)
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${api_key}&libraries=geometry&callback=initTrackingMap`;
    script.async = true;
    script.defer = true;
    script.onerror = function (ev) {
        console.error('[Runtime] Google Maps SDK failed to load. Check API Key validity and billing.', ev);
        showToast('Google Maps SDK Load Failed', 'error');
    };
    document.head.appendChild(script);

    await fetchActiveBooking();
}

// Global Callback for Google Maps SDK
window.initTrackingMap = function() {
    console.info("[SDK] Google Maps Callback Fired.");
    
    // Use customer position or maid position as center
    const centerPos = customerPos || currentMaidPos || { lat: 13.7563, lng: 100.5018 };
    
    try {
        const container = document.getElementById('map-container');
        if (!container) return;

        const mapElement = document.getElementById("map");
        if (!mapElement) throw new Error("DOM element #map not found.");
        
        // Clear the "Loading Map..." content
        mapElement.innerHTML = '';
        mapElement.className = 'w-full h-full'; 

        if (mapElement.offsetHeight === 0) {
            mapElement.style.height = "256px"; 
        }

        map = new google.maps.Map(mapElement, {
            zoom: 15,
            center: centerPos,
            disableDefaultUI: true,
            styles: [
                { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
            ]
        });

        // Setup Routing Services
        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true, 
            polylineOptions: {
                strokeColor: '#046c4e', 
                strokeWeight: 4,
                strokeOpacity: 0.8
            }
        });

        // Animated Marker using SVG path
        maidMarker = new google.maps.Marker({
            position: currentMaidPos || centerPos || { lat: 13.7563, lng: 100.5018 },
            map: map,
            title: "Maid Location",
            visible: !!currentMaidPos,
            icon: {
                path: 'M17.402,0H5.643C2.526,0,0,3.467,0,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644 V6.584C23.044,3.467,20.518,0,17.402,0z M22.057,14.188v11.665l-2.729,0.351v-4.806L22.057,14.188z M20.625,10.773 c-1.016,3.9-2.219,8.51-2.219,8.51H4.638l-2.222-8.51C2.415,10.773,11.3,7.755,20.625,10.773z M3.748,21.713v4.492l-2.73-0.349 V14.502L3.748,21.713z M1.018,37.938V27.579l2.73,0.343v8.196L1.018,37.938z M2.575,40.882l2.218-3.336h13.771l2.219,3.336H2.575z M19.328,35.805v-7.872l2.729-0.355v10.048L19.328,35.805z',
                scale: 0.7,
                fillColor: "#059669",
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: "#ffffff",
                rotation: 0,
                anchor: new google.maps.Point(11, 23)
            }
        });
        
        console.log("[SDK] Map initialized. Center:", centerPos);
        
        // Trigger route calculation immediately if we already have both positions
        if (currentMaidPos && customerPos) {
            calculateAndDisplayRoute(currentMaidPos, customerPos);
        }

        google.maps.event.trigger(map, 'resize');

    } catch (e) {
        console.error("[SDK] Render Error:", e);
    }
};

// ... (fetchActiveBooking remains the same)
async function fetchActiveBooking() {
    try {
        const res = await fetch(`${API_BASE}/bookings/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
            const bookings = await res.json();
            console.log("[Data] Active Bookings:", bookings.length);
            
            if (bookings.length > 0) {
                const booking = bookings[0];
                if (booking.customerLat && booking.customerLng) {
                    customerPos = { lat: booking.customerLat, lng: booking.customerLng };
                    console.log("[Data] Customer position found:", customerPos);
                }
                currentBookingId = booking.id;
                updateTrackingUI(booking);

                // Tracking Logic Gate
                const trackableStatuses = ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS'];
                if (trackableStatuses.includes(booking.status)) {
                    startLiveTracking();
                } else {
                    console.log(`[Status] Booking ${booking.id} is ${booking.status}. Tracking idle.`);
                }
            }
        }
    } catch (e) {
        console.error("[Data] Fetch booking error:", e);
    }
}


function startLiveTracking() {
    console.info("[Tracking] Starting Real-time Polling...");
    if (trackingInterval) clearInterval(trackingInterval);
    
    // Initial fetch and then poll every 10s
    updateMaidLocation();
    trackingInterval = setInterval(updateMaidLocation, 10000);
}

// Route Calculation (Throttled for Cost Optimization)
function calculateAndDisplayRoute(maidPos, destPos) {
    if (!directionsService || !directionsRenderer) return;

    // Throttle route calculation to once every 3 minutes (180000ms)
    const now = Date.now();
    if (now - lastRouteTime < 180000 && lastRouteTime !== 0) return;
    lastRouteTime = now;

    const request = {
        origin: maidPos,
        destination: destPos,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (response, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            
            // Extract ETA & Distance
            const leg = response.routes[0].legs[0];
            const etaText = leg.duration.text;
            const distanceText = leg.distance.text;
            
            console.log(`[ETA Update] Arriving in ${etaText} (${distanceText})`);
            
            // Update UI ETA (Create element if it doesn't exist)
            let etaEl = document.getElementById('eta-display');
            if (!etaEl) {
                etaEl = document.createElement('div');
                etaEl.id = 'eta-display';
                etaEl.className = 'absolute top-4 right-4 bg-brand text-white px-4 py-2 rounded-xl font-bold shadow-lg text-[13px] z-10 animate-fade-in';
                document.getElementById('map-container').appendChild(etaEl);
            }
            etaEl.innerHTML = `ETA: <span class="font-black">${etaText}</span>`;
            
        } else {
            console.warn("[Routing] Directions request failed:", status);
        }
    });
}

// Smooth Marker Animation (Lerp)
function smoothMoveMarker(marker, startPos, endPos, durationMs = 2000) {
    if (!google.maps.geometry) {
        marker.setPosition(endPos);
        return;
    }

    const startTime = performance.now();
    const startLatLng = new google.maps.LatLng(startPos.lat, startPos.lng);
    const endLatLng = new google.maps.LatLng(endPos.lat, endPos.lng);
    
    // Calculate Heading for rotation
    const heading = google.maps.geometry.spherical.computeHeading(startLatLng, endLatLng);
    
    // Only update rotation if there is significant movement
    if (google.maps.geometry.spherical.computeDistanceBetween(startLatLng, endLatLng) > 5) {
        const icon = marker.getIcon();
        icon.rotation = heading;
        marker.setIcon(icon);
    }

    function animate(currentTime) {
        const elapsedTime = currentTime - startTime;
        let progress = elapsedTime / durationMs;
        if (progress > 1) progress = 1;

        const currentLat = startPos.lat + (endPos.lat - startPos.lat) * progress;
        const currentLng = startPos.lng + (endPos.lng - startPos.lng) * progress;
        const currentPosLatLng = new google.maps.LatLng(currentLat, currentLng);

        marker.setPosition(currentPosLatLng);
        
        // Pan map smoothly to follow marker
        map.panTo(currentPosLatLng);

        if (progress < 1) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            currentMaidPos = endPos; // Sync state
        }
    }

    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(animate);
}

async function updateMaidLocation() {
    if (!currentBookingId) return;
    try {
        const res = await fetch(`${API_BASE}/bookings/${currentBookingId}/location`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
            const data = await res.json();
            console.debug('[Tracking] location payload:', data);
            // Sync Customer Position if available
            if (data.customerLat && data.customerLng) {
                customerPos = { lat: data.customerLat, lng: data.customerLng };
            }

            if (data.currentLat && data.currentLng && map && maidMarker) {
                const newPos = { lat: data.currentLat, lng: data.currentLng };
                
                // Show map if it was hidden
                const container = document.getElementById('map-container');
                if (container && container.classList.contains('hidden')) {
                    container.classList.remove('hidden');
                    container.style.display = 'block';
                    map.setCenter(newPos);
                    google.maps.event.trigger(map, 'resize');
                }

                // If this is the first time we get maid pos, set it immediately
                if (!currentMaidPos) {
                    currentMaidPos = newPos;
                    maidMarker.setPosition(newPos);
                    maidMarker.setVisible(true);
                }

                // 1. Smoothly animate marker to new position
                smoothMoveMarker(maidMarker, currentMaidPos, newPos);
                
                // 2. Recalculate route and ETA (throttled) if we have customer pos
                if (customerPos) {
                    calculateAndDisplayRoute(newPos, customerPos);
                }
                
                console.log("[Tracking] Data Synced:", newPos.lat, newPos.lng);
            }
            
            if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
                console.log("[Tracking] Terminal status reached. Killing poll.");
                stopLiveTracking();
            }
        }
    } catch (e) {
        console.error("[Tracking] Update failed:", e);
    }
}

// ... (rest of the file: stopLiveTracking, updateTrackingUI, setRating, submitReview)
function stopLiveTracking() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
}

function updateTrackingUI(booking) {
    console.info("[UI] Updating Tracking Status:", booking.status);
    const status = booking.status;
    const steps = {
        'CONFIRMED': 1,
        'ARRIVED': 2,
        'IN_PROGRESS': 3,
        'COMPLETED': 4
    };
    
    const currentStep = steps[status] || 1;
    
    // Update visual nodes
    for (let i = 1; i <= 4; i++) {
        const node = document.getElementById(`step-${i}`);
        if (!node) continue;
        node.classList.remove('active', 'done');
        if (i < currentStep) node.classList.add('done');
        if (i === currentStep) node.classList.add('active');
    }

    // Update Maid Info
    if (booking.maid) {
        const nameEl = document.getElementById('maid-name');
        const picEl = document.getElementById('maid-pic');
        const tierEl = document.getElementById('maid-tier');
        if (nameEl) nameEl.textContent = booking.maid.fullName || "Assigned Maid";
        if (tierEl) tierEl.textContent = `Maid assigned • ${booking.maid.tier || 'PRO'}`;
        if (picEl && booking.maid.profilePictureUrl) {
            picEl.src = booking.maid.profilePictureUrl;
        }
    }

    if (status === 'COMPLETED') {
        const reviewSection = document.getElementById('review-section');
        if (reviewSection) reviewSection.classList.remove('hidden');
    }
}

function setRating(rating) {
    selectedRating = rating;
    const btns = document.querySelectorAll('#review-section button');
    btns.forEach((btn, idx) => {
        if (idx < rating) {
            btn.classList.add('bg-white/30');
            btn.classList.remove('bg-white/10');
        } else if (idx < 5) {
            btn.classList.remove('bg-white/30');
            btn.classList.add('bg-white/10');
        }
    });
}

async function submitReview() {
    if (!currentBookingId) return;
    
    try {
        const res = await fetch(`${API_BASE}/reviews/`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                booking_id: currentBookingId,
                rating: selectedRating,
                comment: "Great service!"
            })
        });

        if (res.ok) {
            showToast("Thank you for your review! +10 Points earned.", "success");
            document.getElementById('review-section').classList.add('hidden');
        } else {
            const err = await res.json();
            showToast(err.detail || "Review failed", "error");
        }
    } catch (e) {
        showToast("Error submitting review", "error");
    }
}

// Start
document.addEventListener("DOMContentLoaded", () => {
    initTracking();
});
