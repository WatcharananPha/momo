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
        // Fallback for demo/error state
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
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-small mx-auto"></div> Finding Professional...';

    try {
        if (!accessToken) throw new Error("Not authenticated");
        
        const res = await fetch(`${API_BASE}/bookings/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({ 
                type: currentService, 
                party_size: 1, 
                scheduled_at: new Date(Date.now() + 3600000).toISOString(), 
                location_name: "My Home",
                notes: "Please be on time."
            })
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
        showToast(e.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = i18n.t('find_professional');
    }
};

function showMatch(maid) {
    document.getElementById('modal-initial-view').classList.add('hidden');
    document.getElementById('modal-match-view').classList.remove('hidden');
    
    document.getElementById('matched-maid-name').textContent = maid.fullName || maid.full_name;
    document.getElementById('matched-maid-tier').textContent = `${maid.tier} Level`;
    if (maid.profilePictureUrl) {
        document.getElementById('matched-maid-pic').src = maid.profilePictureUrl;
    }
}

document.getElementById('reroll-btn').onclick = async () => {
    if (!currentBooking || rerollsLeft <= 0) return;
    
    const btn = document.getElementById('reroll-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-small mx-auto"></div> Re-rolling...';

    try {
        const res = await fetch(`${API_BASE}/bookings/${currentBooking.id}/reroll`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (res.ok) {
            currentBooking = await res.json();
            rerollsLeft--;
            document.getElementById('reroll-count').textContent = rerollsLeft;
            if (rerollsLeft <= 0) btn.classList.add('opacity-50', 'cursor-not-allowed');
            showMatch(currentBooking.maid);
        } else {
            const err = await res.json();
            throw new Error(err.detail || "Reroll failed");
        }
    } catch (e) {
        showToast(e.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span data-i18n="reroll">${i18n.t('reroll')}</span> (<span id="reroll-count">${rerollsLeft}</span>)`;
    }
};

document.getElementById('final-confirm-btn').onclick = async () => {
    if (!currentBooking) return;

    const btn = document.getElementById('final-confirm-btn');
    btn.disabled = true;
    btn.innerHTML = '<div class="spinner-small mx-auto"></div> Confirming...';

    try {
        const res = await fetch(`${API_BASE}/bookings/${currentBooking.id}/final-confirm`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (res.ok) {
            closeModal();
            updateDashboardData();
            showToast("Booking Confirmed! Your professional is on the way.", "success");
            setTimeout(() => { location.href = '/liff/tracking'; }, 2000);
        } else {
            const err = await res.json();
            throw new Error(err.detail || "Confirmation failed");
        }
    } catch (e) {
        showToast(e.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = i18n.t('confirm_booking');
    }
};

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
