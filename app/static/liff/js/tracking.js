let selectedRating = 5;
let currentBookingId = null;
let map = null;
let maidMarker = null;
let trackingInterval = null;

async function initTracking() {
    await initCoreLiff(true);
    
    // Dynamically load Google Maps script with API Key from backend
    try {
        const res = await fetch(`${API_BASE}/line/config/maps`);
        const { api_key } = await res.json();
        if (api_key) {
            const script = document.getElementById('gmaps-script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${api_key}&callback=initTrackingMap`;
        }
    } catch (e) {
        console.error("Failed to load Maps config", e);
    }

    await fetchActiveBooking();
}

// Google Maps Callback
window.initTrackingMap = function() {
    console.log("Google Maps Initialized");
    const defaultPos = { lat: 13.7563, lng: 100.5018 }; // Bangkok
    map = new google.maps.Map(document.getElementById("map"), {
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
                currentBookingId = booking.id;
                updateTrackingUI(booking);

                if (booking.status === 'CONFIRMED' || booking.status === 'ARRIVED') {
                    startLiveTracking();
                }
            }
        }
    } catch (e) {
        console.error("Fetch booking error", e);
    }
}

function startLiveTracking() {
    document.getElementById('map-container').classList.remove('hidden');
    if (trackingInterval) clearInterval(trackingInterval);
    
    // Poll every 10 seconds
    trackingInterval = setInterval(updateMaidLocation, 10000);
    updateMaidLocation(); // Initial fetch
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
            }
            
            if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
                stopLiveTracking();
            }
        }
    } catch (e) {
        console.error("Tracking error", e);
    }
}

function stopLiveTracking() {
    if (trackingInterval) {
        clearInterval(trackingInterval);
        trackingInterval = null;
    }
    document.getElementById('map-container').classList.add('hidden');
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
