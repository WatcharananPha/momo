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
    
    // Check key from meta
    const meta = document.querySelector('meta[name="maps-api-key"]');
    if (meta && meta.content && meta.content !== '__MAP_API__' && meta.content !== '') {
        console.log("[Config] Maps API Key detected in meta.");
    } else {
        console.warn("[Config] Maps API Key missing in meta tag.");
    }

    await fetchActiveBooking();
}

// Global Callback for Google Maps SDK
window.initTrackingMap = function() {
    console.info("[SDK] Google Maps Callback Fired.");
    
    // Default to Bangkok if nothing else
    const centerPos = customerPos || currentMaidPos || { lat: 13.7563, lng: 100.5018 };
    
    try {
        const container = document.getElementById('map-container');
        if (!container) return;

        // Force show container
        container.classList.remove('hidden');
        container.style.display = 'block';

        const mapElement = document.getElementById("map");
        if (!mapElement) throw new Error("DOM element #map not found.");
        
        mapElement.innerHTML = '';

        map = new google.maps.Map(mapElement, {
            zoom: 16,
            center: centerPos,
            disableDefaultUI: true,
            padding: { bottom: 280 }, // Shift center up to account for bottom sheet
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
                strokeWeight: 5,
                strokeOpacity: 0.8
            }
        });

        // Animated Marker using SVG path
        maidMarker = new google.maps.Marker({
            position: currentMaidPos || centerPos,
            map: map,
            title: "Maid Location",
            visible: !!currentMaidPos,
            icon: {
                path: 'M17.402,0H5.643C2.526,0,0,3.467,0,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644 V6.584C23.044,3.467,20.518,0,17.402,0z M22.057,14.188v11.665l-2.729,0.351v-4.806L22.057,14.188z M20.625,10.773 c-1.016,3.9-2.219,8.51-2.219,8.51H4.638l-2.222-8.51C2.415,10.773,11.3,7.755,20.625,10.773z M3.748,21.713v4.492l-2.73-0.349 V14.502L3.748,21.713z M1.018,37.938V27.579l2.73,0.343v8.196L1.018,37.938z M2.575,40.882l2.218-3.336h13.771l2.219,3.336H2.575z M19.328,35.805v-7.872l2.729-0.355v10.048L19.328,35.805z',
                scale: 0.8,
                fillColor: "#059669",
                fillOpacity: 1,
                strokeWeight: 1.5,
                strokeColor: "#ffffff",
                rotation: 0,
                anchor: new google.maps.Point(11, 23)
            }
        });
        
        // Bind Recenter
        const recenterBtn = document.getElementById('recenter-btn');
        if (recenterBtn) {
            recenterBtn.onclick = () => {
                const target = currentMaidPos || centerPos;
                map.panTo(target);
                map.setZoom(17);
            };
        }

        console.log("[SDK] Map initialized with padding.");
        
        if (currentMaidPos && customerPos) {
            calculateAndDisplayRoute(currentMaidPos, customerPos);
        }

        google.maps.event.trigger(map, 'resize');

    } catch (e) {
        console.error("[SDK] Render Error:", e);
    }
};

async function fetchActiveBooking() {
    try {
        const res = await fetch(`${API_BASE}/bookings/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
            const bookings = await res.json();
            if (bookings.length > 0) {
                const booking = bookings[0];
                if (booking.customerLat && booking.customerLng) {
                    customerPos = { lat: booking.customerLat, lng: booking.customerLng };
                }
                currentBookingId = booking.id;
                updateTrackingUI(booking);

                const trackableStatuses = ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS'];
                if (trackableStatuses.includes(booking.status)) {
                    startLiveTracking();
                }
            }
        }
    } catch (e) {
        console.error("[Data] Fetch booking error:", e);
    } finally {
        setTimeout(hideLoading, 500);
    }
}


function startLiveTracking() {
    if (trackingInterval) clearInterval(trackingInterval);
    updateMaidLocation();
    trackingInterval = setInterval(updateMaidLocation, 10000);
}

function calculateAndDisplayRoute(maidPos, destPos) {
    if (!directionsService || !directionsRenderer) return;

    const now = Date.now();
    if (now - lastRouteTime < 120000 && lastRouteTime !== 0) return;
    lastRouteTime = now;

    const request = {
        origin: maidPos,
        destination: destPos,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (response, status) => {
        if (status === 'OK') {
            directionsRenderer.setDirections(response);
            const leg = response.routes[0].legs[0];
            
            document.getElementById('distance-display').textContent = leg.distance.text;
            document.getElementById('eta-display-small').textContent = leg.duration.text;
        }
    });
}

function smoothMoveMarker(marker, startPos, endPos, durationMs = 2000) {
    if (!google.maps.geometry) {
        marker.setPosition(endPos);
        return;
    }

    const startTime = performance.now();
    const startLatLng = new google.maps.LatLng(startPos.lat, startPos.lng);
    const endLatLng = new google.maps.LatLng(endPos.lat, endPos.lng);
    const heading = google.maps.geometry.spherical.computeHeading(startLatLng, endLatLng);
    
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
        map.panTo(currentPosLatLng);

        if (progress < 1) animationFrameId = requestAnimationFrame(animate);
        else currentMaidPos = endPos;
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
            if (data.customerLat && data.customerLng) {
                customerPos = { lat: data.customerLat, lng: data.customerLng };
            }

            if (data.currentLat && data.currentLng && map && maidMarker) {
                const newPos = { lat: data.currentLat, lng: data.currentLng };
                if (!currentMaidPos) {
                    currentMaidPos = newPos;
                    maidMarker.setPosition(newPos);
                    maidMarker.setVisible(true);
                }
                smoothMoveMarker(maidMarker, currentMaidPos, newPos);
                if (customerPos) calculateAndDisplayRoute(newPos, customerPos);
            }
            
            if (data.status === 'COMPLETED' || data.status === 'CANCELLED') stopLiveTracking();
        }
    } catch (e) {
        console.error("[Tracking] Update failed:", e);
    }
}

function stopLiveTracking() {
    if (trackingInterval) clearInterval(trackingInterval);
    trackingInterval = null;
}

function updateTrackingUI(booking) {
    const status = booking.status;
    const stepMap = { 'CONFIRMED': 1, 'ARRIVED': 2, 'IN_PROGRESS': 3, 'COMPLETED': 4 };
    const currentStep = stepMap[status] || 1;
    
    // Progress Bar
    const progress = ((currentStep - 1) / 3) * 100;
    document.getElementById('tracker-progress').style.width = `${progress}%`;

    // Nodes
    for (let i = 1; i <= 4; i++) {
        const node = document.getElementById(`step-${i}`);
        if (!node) continue;
        node.classList.remove('bg-brand', 'border-brand-surface', 'border-slate-100');
        if (i <= currentStep) {
            node.classList.add('bg-brand', 'border-brand-surface');
        } else {
            node.classList.add('bg-white', 'border-slate-100');
        }
    }

    const titleMap = {
        'CONFIRMED': 'Maid Confirmed',
        'ARRIVED': 'Maid has Arrived',
        'IN_PROGRESS': 'Cleaning in Progress',
        'COMPLETED': 'Job Finished'
    };
    document.getElementById('status-title').textContent = titleMap[status] || 'Processing';

    if (booking.maid) {
        document.getElementById('maid-name').textContent = booking.maid.fullName || "Your Professional";
        document.getElementById('maid-tier').textContent = `• ${booking.maid.tier || 'PRO'} Tier`;
        document.getElementById('maid-rating').textContent = (booking.maid.rating || 4.9).toFixed(1);
        if (booking.maid.profilePictureUrl) {
            document.getElementById('maid-pic').src = booking.maid.profilePictureUrl;
        }
    }

    if (status === 'COMPLETED') {
        const reviewSection = document.getElementById('review-section');
        if (reviewSection) {
            reviewSection.classList.remove('hidden');
            setTimeout(() => reviewSection.style.transform = 'translateY(0)', 100);
        }
    }
}

function setRating(rating) {
    selectedRating = rating;
    const btns = document.querySelectorAll('#review-section button');
    btns.forEach((btn, idx) => {
        if (idx < rating) btn.classList.replace('bg-white/10', 'bg-white/30');
        else if (idx < 5) btn.classList.replace('bg-white/30', 'bg-white/10');
    });
}

async function submitReview() {
    if (!currentBookingId) return;
    try {
        const res = await fetch(`${API_BASE}/reviews/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({ booking_id: currentBookingId, rating: selectedRating, comment: "Great service!" })
        });
        if (res.ok) {
            showToast("Review submitted! +10 Points.", "success");
            document.getElementById('review-section').style.transform = 'translateY(100%)';
            setTimeout(() => document.getElementById('review-section').classList.add('hidden'), 500);
        }
    } catch (e) {
        showToast("Error submitting review", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initTracking();
});
