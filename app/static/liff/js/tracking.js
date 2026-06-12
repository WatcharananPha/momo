let selectedRating = 5;
let currentBookingId = null;
let map = null;
let maidMarker = null;
let customerMarker = null;
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
    await fetchActiveBooking();
}

function updateCustomerMarker() {
    if (!map || !customerPos) return;
    if (!customerMarker) {
        customerMarker = new google.maps.Marker({
            map: map,
            title: "Your Location",
            icon: {
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                scale: 1.5,
                fillColor: "#1d4ed8",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#ffffff",
                anchor: new google.maps.Point(12, 22)
            }
        });
    }
    customerMarker.setPosition(customerPos);
    customerMarker.setVisible(true);
}

function updateMaidMarker(newPos) {
    if (!map || !newPos) return;
    if (!maidMarker) {
        maidMarker = new google.maps.Marker({
            map: map,
            title: "Maid Location",
            icon: {
                path: 'M17.402,0H5.643C2.526,0,0,3.467,0,6.584v34.804c0,3.116,2.526,5.644,5.643,5.644h11.759c3.116,0,5.644-2.527,5.644-5.644 V6.584C23.044,3.467,20.518,0,17.402,0z M22.057,14.188v11.665l-2.729,0.351v-4.806L22.057,14.188z M20.625,10.773 c-1.016,3.9-2.219,8.51-2.219,8.51H4.638l-2.222-8.51C2.415,10.773,11.3,7.755,20.625,10.773z M3.748,21.713v4.492l-2.73-0.349 V14.502L3.748,21.713z M1.018,37.938V27.579l2.73,0.343v8.196L1.018,37.938z M2.575,40.882l2.218-3.336h13.771l2.219,3.336H2.575z M19.328,35.805v-7.872l2.729-0.355v10.048L19.328,35.805z',
                scale: 0.9,
                fillColor: "#059669",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#ffffff",
                rotation: 0,
                anchor: new google.maps.Point(11, 23)
            }
        });
    }
    
    const oldPos = currentMaidPos;
    if (!oldPos) {
        currentMaidPos = newPos;
        maidMarker.setPosition(newPos);
        maidMarker.setVisible(true);
    } else {
        smoothMoveMarker(maidMarker, oldPos, newPos);
    }
}

function adjustMapBounds() {
    if (!map) return;
    if (customerPos && currentMaidPos) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(customerPos);
        bounds.extend(currentMaidPos);
        map.fitBounds(bounds);
        
        const listener = google.maps.event.addListener(map, "idle", () => {
            if (map.getZoom() > 16) map.setZoom(16);
            google.maps.event.removeListener(listener);
        });
    } else if (customerPos) {
        map.setCenter(customerPos);
        map.setZoom(16);
    } else if (currentMaidPos) {
        map.setCenter(currentMaidPos);
        map.setZoom(16);
    }
}

// Global Callback for Google Maps SDK
window.initTrackingMap = function() {
    console.info("[SDK] Google Maps Callback Fired.");
    
    const centerPos = customerPos || currentMaidPos || { lat: 13.7563, lng: 100.5018 };
    
    try {
        const container = document.getElementById('map-container');
        if (!container) return;

        const mapElement = document.getElementById("map");
        if (!mapElement) throw new Error("DOM element #map not found.");
        
        mapElement.innerHTML = '';

        map = new google.maps.Map(mapElement, {
            zoom: 16,
            center: centerPos,
            disableDefaultUI: true,
            padding: { bottom: 340 },
            styles: [
                { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
            ]
        });

        directionsService = new google.maps.DirectionsService();
        directionsRenderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: true, 
            polylineOptions: {
                strokeColor: '#046c4e', 
                strokeWeight: 6,
                strokeOpacity: 0.9
            }
        });

        if (customerPos) {
            updateCustomerMarker();
        }
        if (currentMaidPos) {
            updateMaidMarker(currentMaidPos);
        }
        adjustMapBounds();
        
        const recenterBtn = document.getElementById('recenter-btn');
        if (recenterBtn) {
            recenterBtn.onclick = () => {
                adjustMapBounds();
            };
        }

        console.log("[SDK] Map initialized with premium padding.");
        
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
                const trackableStatuses = ['CONFIRMED', 'ARRIVED', 'IN_PROGRESS'];
                
                if (trackableStatuses.includes(booking.status)) {
                    if (booking.customerLat && booking.customerLng) {
                        customerPos = { lat: booking.customerLat, lng: booking.customerLng };
                    }
                    if (booking.currentLat && booking.currentLng) {
                        currentMaidPos = { lat: booking.currentLat, lng: booking.currentLng };
                    }
                    currentBookingId = booking.id;
                    updateTrackingUI(booking);
                    startLiveTracking();

                    if (map) {
                        updateCustomerMarker();
                        if (currentMaidPos) {
                            updateMaidMarker(currentMaidPos);
                        }
                        adjustMapBounds();
                    }
                } else {
                    handleNoActiveOrder();
                }
            } else {
                handleNoActiveOrder();
            }
        } else {
            handleNoActiveOrder();
        }
    } catch (e) {
        console.error("[Data] Fetch booking error:", e);
        handleNoActiveOrder();
    } finally {
        setTimeout(hideLoading, 600);
    }
}

async function handleNoActiveOrder() {
    console.info("[UX] No active order found. Falling back to User Location.");
    
    document.getElementById('status-title').textContent = "Ready for Service";
    document.getElementById('distance-display').innerHTML = '<span class="w-2 h-2 bg-slate-300 rounded-full inline-block"></span> No active tracking';
    document.getElementById('eta-display-small').textContent = "-- min";
    document.getElementById('maid-name').textContent = "Momo Professional";
    document.getElementById('maid-tier').textContent = "• Standing by";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log("[GPS] User located at:", userPos);
                customerPos = userPos;
                
                if (map) {
                    map.setCenter(userPos);
                    map.setZoom(15);
                    updateCustomerMarker();
                }
            },
            (error) => {
                console.warn("[GPS] Geolocation denied or failed:", error.message);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
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
        
        if (!customerPos) {
            map.panTo(currentPosLatLng);
        }

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
                updateCustomerMarker();
            }

            if (data.currentLat && data.currentLng && map) {
                const newPos = { lat: data.currentLat, lng: data.currentLng };
                updateMaidMarker(newPos);
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
    
    // Update Step UI (Circles & Lines)
    for (let i = 1; i <= 4; i++) {
        const node = document.getElementById(`step-node-${i}`);
        const line = document.getElementById(`step-line-${i}`);
        const label = document.getElementById(`label-${i}`);
        
        if (node) {
            node.classList.remove('done', 'active', 'todo');
            if (i < currentStep) {
                node.classList.add('done');
                node.innerHTML = '<svg class="w-5 h-5 fill-current" viewBox="0 0 20 20"><path d="M0 11l2-2 5 5L18 3l2 2L7 18z"/></svg>';
            } else if (i === currentStep) {
                node.classList.add('active');
                node.innerHTML = i;
            } else {
                node.classList.add('todo');
                node.innerHTML = i;
            }
        }
        
        if (line) {
            line.style.width = (i < currentStep) ? '100%' : '0%';
        }

        if (label) {
            label.classList.toggle('text-brand', i <= currentStep);
            label.classList.toggle('text-ink-light', i > currentStep);
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
        document.getElementById('maid-name').textContent = booking.maid.fullName || "Professional Assigned";
        document.getElementById('maid-tier').textContent = `• ${booking.maid.tier || 'PRO'} Tier`;
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

// Draggable Bottom Sheet with 3 Snapping States
// Units are pixels visible from the bottom (negative translateY)
const STATE = {
    COLLAPSED: -100,  // Just handle & Live Tracking text
    DEFAULT: -340,    // Standard view
    EXPANDED: -540    // Detailed view
};

let startY = 0;
let basePos = STATE.DEFAULT; 
let isDragging = false;

function initDraggableSheet() {
    const sheet = document.getElementById('bottom-sheet');
    const handle = document.getElementById('drag-handle-container');

    if (!sheet || !handle) return;

    // Initial positioning
    sheet.style.transform = `translateY(${basePos}px)`;

    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        isDragging = true;
        sheet.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        let move = basePos + deltaY;
        
        // Rubber banding boundaries
        if (move > STATE.COLLAPSED) move = STATE.COLLAPSED + (move - STATE.COLLAPSED) * 0.2;
        if (move < STATE.EXPANDED) move = STATE.EXPANDED + (move - STATE.EXPANDED) * 0.2;
        
        sheet.style.transform = `translateY(${move}px)`;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        sheet.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        
        const finalY = e.changedTouches[0].clientY;
        const deltaY = finalY - startY;
        const finalPos = basePos + deltaY;

        let target = STATE.DEFAULT;

        // Snapping Logic
        if (finalPos > (STATE.COLLAPSED + STATE.DEFAULT) / 2) {
            target = STATE.COLLAPSED;
        } else if (finalPos < (STATE.DEFAULT + STATE.EXPANDED) / 2) {
            target = STATE.EXPANDED;
        } else {
            target = STATE.DEFAULT;
        }

        sheet.style.transform = `translateY(${target}px)`;
        basePos = target;
        
        // Update map padding dynamically
        if (map) {
            // Adjust map padding based on sheet position to keep center clear
            map.setOptions({ padding: { bottom: Math.abs(target) } });
        }
    });
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
            showToast("Feedback sent! +10 Points earned.", "success");
            document.getElementById('review-section').style.transform = 'translateY(100%)';
            setTimeout(() => document.getElementById('review-section').classList.add('hidden'), 500);
        }
    } catch (e) {
        showToast("Error submitting review", "error");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initTracking();
    initDraggableSheet();
});
