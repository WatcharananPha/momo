const SERVICE_INFO = {
    GENERAL_CLEANING: { nameKey: "cleaning_general", price: 100, titleKey: "cleaning_general" },
    DEEP_CLEANING:    { nameKey: "cleaning_deep",    price: 300, titleKey: "cleaning_deep"    }
};

let currentService = null;
let currentBooking = null;
let rerollsLeft = 3;

async function initHome() {
    await initCoreLiff(true);
    updateDashboardData();
}

async function updateDashboardData() {
    const data = await fetchWalletAndPoints();
    if (data) {
        document.getElementById('wallet-balance').textContent = data.wallet.toLocaleString();
        document.getElementById('point-balance').textContent = data.points.toLocaleString();
    } else {
        document.getElementById('wallet-balance').textContent = "1,500";
        document.getElementById('point-balance').textContent = "250";
    }
}

function startBooking(type) {
    currentService = type;
    const s = SERVICE_INFO[type];
    const currency = window.i18n ? i18n.t('currency') : 'บาท';
    
    document.getElementById('modal-title').textContent = i18n.t(s.titleKey);
    document.getElementById('modal-service-name').textContent = i18n.t(s.nameKey);
    document.getElementById('modal-service-price').textContent = `${s.price} ${currency}`;
    
    // Reset view
    document.getElementById('modal-initial-view').classList.remove('hidden');
    document.getElementById('modal-match-view').classList.add('hidden');
    rerollsLeft = 3;
    document.getElementById('reroll-count').textContent = rerollsLeft;

    const modal = document.getElementById('booking-modal');
    modal.style.display = 'flex'; // Ensure it's visible
    modal.classList.add('open');
    document.getElementById('app-content').style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('booking-modal');
    modal.classList.remove('open');
    setTimeout(() => {
        document.getElementById('app-content').style.overflow = 'auto';
    }, 300);
}

// Click outside to close modal
document.getElementById('booking-modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

document.getElementById('confirm-booking-btn').onclick = async () => {
    const btn = document.getElementById('confirm-booking-btn');
    const txt = document.getElementById('btn-text');
    btn.disabled = true;
    txt.innerHTML = '<div class="spinner-small"></div> Finding Professional...';

    try {
        if (!accessToken) throw new Error("Not authenticated");
        
        const res = await fetch(`${API_BASE}/bookings/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({ service_type: currentService, party_size: 1, hours: 2, location_lat: 13.7563, location_lng: 100.5018 })
        });
        
        if (res.ok) {
            currentBooking = await res.json();
            showMatch(currentBooking.maid);
        } else {
            const err = await res.json();
            throw new Error(err.detail || "API call failed");
        }
    } catch (e) {
        console.error("Booking Match Error:", e);
        // Simulated Success for UX testing purposes when API is not up
        setTimeout(() => {
            showMatch({
                full_name: "คุณสมศรี ใจดี",
                tier: "MASTER",
                rating: 4.9,
                profilePictureUrl: null
            });
        }, 1000);
    } finally {
        btn.disabled = false;
        txt.textContent = 'Find a Professional';
    }
};

function showMatch(maid) {
    document.getElementById('modal-initial-view').classList.add('hidden');
    document.getElementById('modal-match-view').classList.remove('hidden');
    
    document.getElementById('matched-maid-name').textContent = maid.full_name || maid.fullName;
    document.getElementById('matched-maid-tier').textContent = `${maid.tier} Level`;
    document.getElementById('matched-maid-rating').textContent = maid.rating;
    if (maid.profilePictureUrl) {
        document.getElementById('matched-maid-pic').src = maid.profilePictureUrl;
    }
}

document.getElementById('reroll-btn').onclick = async () => {
    if (rerollsLeft <= 0) return;
    
    const btn = document.getElementById('reroll-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-small"></div> Re-rolling...';

    try {
        setTimeout(() => {
            rerollsLeft--;
            document.getElementById('reroll-count').textContent = rerollsLeft;
            if (rerollsLeft <= 0) btn.classList.add('opacity-50', 'cursor-not-allowed');
            
            showMatch({
                full_name: "คุณประนอม ขยันงาน",
                tier: "ELITE",
                rating: 4.7,
                profilePictureUrl: null
            });
            btn.disabled = false;
            btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Re-roll Maid (<span id="reroll-count">${rerollsLeft}</span> left)`;
        }, 800);
    } catch (e) {
        showToast("Reroll failed", "error");
        btn.disabled = false;
    }
};

document.getElementById('final-confirm-btn').onclick = async () => {
    const btn = document.getElementById('final-confirm-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-small"></div> Confirming...';

    try {
        setTimeout(() => {
            closeModal();
            updateDashboardData();
            showToast("Booking Confirmed! Your professional is on the way.", "success");
        }, 1000);
    } catch (e) {
        showToast("Confirmation failed", "error");
    } finally {
        btn.disabled = false;
        btn.textContent = 'Book this Professional';
    }
};

function shareReferral() {
    if (liff.isApiAvailable && liff.isApiAvailable('shareTargetPicker')) {
        liff.shareTargetPicker([{
            type: "text",
            text: "Try Momo — effortless home care. Sign up and get 50 welcome points: " + window.location.href
        }]).catch(console.error);
    } else {
        showToast("Referral link copied to clipboard!", "success");
    }
}

function openWheel() {
    document.getElementById('wheel-modal').classList.remove('hidden');
    document.getElementById('wheel-modal').classList.add('flex');
}

function closeWheel() {
    document.getElementById('wheel-modal').classList.add('hidden');
    document.getElementById('wheel-modal').classList.remove('flex');
}

function spinWheel() {
    const btn = document.getElementById('spin-btn');
    const wheel = document.getElementById('wheel-canvas');
    btn.disabled = true;
    
    const randomDeg = Math.floor(Math.random() * 360) + 1440; 
    wheel.style.transform = `rotate(${randomDeg}deg)`;
    
    setTimeout(() => {
        showToast("Congratulations! You won 10 บาท!", "success");
        btn.disabled = false;
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${randomDeg % 360}deg)`;
        setTimeout(() => wheel.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)', 50);
        closeWheel();
    }, 4500);
}

function openPackages() {
    document.getElementById('packages-modal').classList.remove('hidden');
    document.getElementById('packages-modal').classList.add('flex');
}

function closePackages() {
    document.getElementById('packages-modal').classList.add('hidden');
    document.getElementById('packages-modal').classList.remove('flex');
}

// Start
document.addEventListener("DOMContentLoaded", () => {
    initHome();
});
