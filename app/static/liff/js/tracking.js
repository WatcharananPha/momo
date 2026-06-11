let selectedRating = 5;
let currentBookingId = null;
let map = null;
let maidMarker = null;
let trackingInterval = null;

/**
 * Senior Dev Insights: Bootstrap sequence and Lifecycle management.
 * The Map UI failure was likely due to the logic gate in startLiveTracking 
 * which only unhides the container if a booking is in CONFIRMED/ARRIVED state.
 */

async function initTracking() {
    console.info("[Init] Starting Tracking Bootstrap...");
    await initCoreLiff(true);
    
    // 1. Fetch Maps Config from Backend
    try {
        const res = await fetch(`${API_BASE}/line/config/maps`);
        if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
        
        const { api_key } = await res.json();
        console.log("[Config] Maps API Key received:", api_key ? "VALID_KEY" : "MISSING");

        if (api_key) {
            // 2. Unhide container immediately for debugging/UX
            const container = document.getElementById('map-container');
            if (container) container.classList.remove('hidden');

            // 3. Dynamic Script Injection (Handle Race Condition)
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${api_key}&callback=initTrackingMap`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            console.log("[Runtime] Google Maps SDK script dynamically injected.");
        } else {
            console.error("[Config] MAP_API is not defined in Backend ENV.");
            showToast("Map Configuration Error", "error");
        }
    } catch (e) {
        console.error("[Bootstrap] Initialization failed:", e);
        showToast("System failed to initialize maps", "error");
    }

    await fetchActiveBooking();
}

// Global Callback for Google Maps SDK
window.initTrackingMap = function() {
    console.info("[SDK] Google Maps Callback Fired.");
    const defaultPos = { lat: 13.7563, lng: 100.5018 }; // Bangkok Default
    
    try {
        const mapElement = document.getElementById("map");
        if (!mapElement) throw new Error("DOM element #map not found.");

        map = new google.maps.Map(mapElement, {
            zoom: 15,
            center: defaultPos,
            disableDefaultUI: true,
            styles: [
                { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
            ]
        });

        maidMarker = new google.maps.Marker({
            position: defaultPos,
            map: map,
            title: "Maid Location",
            icon: {
                url: "https://img.icons8.com/color/48/000000/marker.png",
                scaledSize: new google.maps.Size(40, 40)
            }
        });
        console.log("[SDK] Map and Marker initialized successfully.");
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
            console.log("[Data] Active Bookings:", bookings.length);
            
            if (bookings.length > 0) {
                const booking = bookings[0];
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

async function updateMaidLocation() {
    if (!currentBookingId) return;
    try {
        const res = await fetch(`${API_BASE}/bookings/${currentBookingId}/location`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.currentLat && data.currentLng && map && maidMarker) {
                const pos = { lat: data.currentLat, lng: data.currentLng };
                maidMarker.setPosition(pos);
                map.panTo(pos);
                console.log("[Tracking] UI Synced:", pos.lat, pos.lng);
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

function stopLiveTracking() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
    // We keep the map visible even if tracking stops for UX context
}

function updateTrackingUI(booking) {
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
        node.classList.remove('active', 'done');
        if (i < currentStep) node.classList.add('done');
        if (i === currentStep) node.classList.add('active');
    }

    if (status === 'COMPLETED') {
        document.getElementById('review-section').classList.remove('hidden');
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
