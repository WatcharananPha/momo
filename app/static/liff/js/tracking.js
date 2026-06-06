let selectedRating = 5;
let currentBookingId = null;

async function initTracking() {
    await initCoreLiff(true);
    
    // Check for active bookings
    await fetchActiveBooking();
}

async function fetchActiveBooking() {
    try {
        const res = await fetch(`${API_BASE}/bookings/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
            const bookings = await res.json();
            // Get the latest one
            if (bookings.length > 0) {
                const booking = bookings[0];
                currentBookingId = booking.id;
                updateTrackingUI(booking);
            }
        }
    } catch (e) {
        console.error("Fetch booking error", e);
    }
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
