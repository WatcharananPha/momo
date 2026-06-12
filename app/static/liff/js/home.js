const SERVICE_INFO = {
    GENERAL_CLEANING: { nameKey: "cleaning_general", price: 100, titleKey: "cleaning_general" },
    DEEP_CLEANING:    { nameKey: "cleaning_deep",    price: 300, titleKey: "cleaning_deep"    },
    LAUNDRY:          { nameKey: "laundry",          price: 150, titleKey: "laundry"          },
    MOVING:           { nameKey: "moving",           price: 500, titleKey: "moving"           },
    REPAIR:           { nameKey: "repair",           price: 250, titleKey: "repair"           }
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
    if (data && data.wallet && data.balance) {
        document.getElementById('wallet-balance').textContent = (data.wallet.balance || 0).toLocaleString();
        document.getElementById('point-balance').textContent = (data.balance.availablePoints || 0).toLocaleString();
    } else {
        document.getElementById('wallet-balance').textContent = "0";
        document.getElementById('point-balance').textContent = "0";
    }
}

function startBooking(type) {
    currentService = type;
    const s = SERVICE_INFO[type];
    const currency = window.i18n ? i18n.t('currency') : 'บาท';
    
    document.getElementById('modal-title').textContent = i18n.t(s.titleKey);
    document.getElementById('modal-service-name').textContent = i18n.t(s.nameKey);
    document.getElementById('modal-service-price').textContent = `${s.price} ${currency}`;
    
    document.getElementById('modal-initial-view').classList.remove('hidden');
    document.getElementById('modal-match-view').classList.add('hidden');
    rerollsLeft = 3;
    document.getElementById('reroll-count').textContent = rerollsLeft;

    const modal = document.getElementById('booking-modal');
    modal.classList.add('open');
    modal.classList.remove('hidden');
    document.getElementById('app-content').style.overflow = 'hidden';
}

window.closeModal = function() {
    const modal = document.getElementById('booking-modal');
    if (!modal) return;
    modal.classList.remove('open');
    setTimeout(() => {
        modal.classList.add('hidden');
        document.getElementById('app-content').style.overflow = 'auto';
    }, 400);
};

document.getElementById('confirm-booking-btn').onclick = async () => {
    const btn = document.getElementById('confirm-booking-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>';

    let lat = null, lng = null;
    try {
        const pos = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
    } catch (e) { console.warn("Location skipped"); }

    try {
        if (!accessToken) throw new Error("Not authenticated");
        const res = await fetch(`${API_BASE}/bookings/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({ 
                type: currentService, party_size: 1, 
                scheduled_at: new Date(Date.now() + 3600000).toISOString(), 
                location_name: "Current Location",
                customer_lat: lat, customer_lng: lng
            })
        });
        
        if (res.ok) {
            currentBooking = await res.json();
            showMatch(currentBooking.maid);
        } else {
            const err = await res.json();
            throw new Error(err.detail || "Matching failed");
        }
    } catch (e) {
        showToast(e.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Confirm Matching";
    }
};

function showMatch(maid) {
    document.getElementById('modal-initial-view').classList.add('hidden');
    document.getElementById('modal-match-view').classList.remove('hidden');
    document.getElementById('matched-maid-name').textContent = maid.fullName || "Certified Pro";
    document.getElementById('matched-maid-tier').textContent = `${maid.tier} Member`;
    if (maid.profilePictureUrl) document.getElementById('matched-maid-pic').src = maid.profilePictureUrl;
}

document.getElementById('reroll-btn').onclick = async () => {
    if (!currentBooking || rerollsLeft <= 0) return;
    const btn = document.getElementById('reroll-btn');
    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/bookings/${currentBooking.id}/reroll`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
            currentBooking = await res.json();
            rerollsLeft--;
            document.getElementById('reroll-count').textContent = rerollsLeft;
            showMatch(currentBooking.maid);
        }
    } finally { btn.disabled = false; }
};

document.getElementById('final-confirm-btn').onclick = async () => {
    if (!currentBooking) return;
    const btn = document.getElementById('final-confirm-btn');
    btn.disabled = true;
    try {
        const res = await fetch(`${API_BASE}/bookings/${currentBooking.id}/final-confirm`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
            closeModal();
            showToast("Success! Tracking started.", "success");
            setTimeout(() => { location.href = '/liff/tracking'; }, 1500);
        }
    } finally { btn.disabled = false; }
};

window.openWheel = function() {
    const el = document.getElementById('wheel-modal');
    if (el) {
        el.classList.remove('hidden');
        el.classList.add('flex');
    }
};

window.closeWheel = function() {
    const el = document.getElementById('wheel-modal');
    if (el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
};

window.spinWheel = function() {
    const btn = document.getElementById('spin-btn');
    const wheel = document.getElementById('wheel-canvas');
    if (!btn || !wheel) return;
    btn.disabled = true;
    const deg = Math.floor(Math.random() * 360) + 1800; 
    wheel.style.transform = `rotate(${deg}deg)`;
    setTimeout(() => {
        showToast("Bonus Points Added! ✨", "success");
        btn.disabled = false;
        closeWheel();
    }, 3500);
};

window.openPackages = function() {
    showToast("Payment System Under Development </dev>", "info");
};

function closePackages() {
    const el = document.getElementById('packages-modal');
    if (el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
}

document.addEventListener("DOMContentLoaded", initHome);
