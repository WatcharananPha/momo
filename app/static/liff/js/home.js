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
let lastUserLat = null;
let lastUserLng = null;
let activeCampaignId = null;          // used for lucky wheel
let momo_referral_code = 'MOMO888';   // will be populated from point balance

async function initHome() {
    await initCoreLiff(true);
    hideCreditUI();
    fetchActiveCampaigns();
}

function hideCreditUI() {
    // Hide wallet balance card
    const walletBalanceEl = document.getElementById('wallet-balance');
    if (walletBalanceEl && walletBalanceEl.parentElement && walletBalanceEl.parentElement.parentElement) {
        walletBalanceEl.parentElement.parentElement.style.display = 'none';
    }
    // Hide points card
    const pointBalanceEl = document.getElementById('point-balance');
    if (pointBalanceEl && pointBalanceEl.parentElement && pointBalanceEl.parentElement.parentElement) {
        pointBalanceEl.parentElement.parentElement.style.display = 'none';
    }
}

async function fetchActiveCampaigns() {
    try {
        const res = await fetch(`${API_BASE}/gamification/campaigns/active`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (res.ok) {
            const campaigns = await res.json();
            activeCampaignId = campaigns.length > 0 ? campaigns[0].id : null;
        }
    } catch (e) {
        console.error("Fetch campaigns failed", e);
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

    lastUserLat = lat;
    lastUserLng = lng;

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
    loadNearbyMaids(lastUserLat, lastUserLng, maid);
}

async function loadNearbyMaids(lat, lng, matchedMaid) {
    const listEl = document.getElementById('nearby-maids-list');
    const pinsEl = document.getElementById('radar-maid-pins');
    if (!listEl || !pinsEl) return;
    listEl.innerHTML = '';
    pinsEl.innerHTML = '';
    
    if (!lat || !lng) {
        lat = 13.7563;
        lng = 100.5018;
    }
    
    document.getElementById('booking-loc-coords').textContent = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;

    try {
        const response = await fetch(`${API_BASE}/maids/nearby?lat=${lat}&lng=${lng}&skill=${currentService}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        let maids = [];
        if (response.ok) {
            maids = await response.json();
        } else {
            console.warn("Failed to fetch nearby list, using matched maid");
            maids = [matchedMaid];
        }
        
        // Ensure matchedMaid is in list
        if (!maids.some(m => m.id === matchedMaid.id)) {
            maids.unshift(matchedMaid);
        }

        maids.forEach((m) => {
            const isMatched = m.id === matchedMaid.id;
            const distanceText = (m.distance !== null && m.distance !== undefined) ? `${m.distance.toFixed(2)} km` : "0.50 km";
            
            const card = document.createElement('div');
            card.className = `flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                isMatched 
                ? 'bg-brand/5 border-brand/30 ring-1 ring-brand/10' 
                : 'bg-white border-gray-100 hover:border-gray-200'
            }`;
            
            card.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="relative shrink-0">
                        <img src="${m.profilePictureUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(m.fullName) + '&background=046c4e&color=fff'}" 
                             class="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-sm" alt="">
                        ${isMatched ? '<div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-brand border-2 border-white rounded-full"></div>' : ''}
                    </div>
                    <div class="text-left">
                        <div class="text-[13px] font-black text-ink flex items-center gap-1.5">
                            ${m.fullName}
                            ${isMatched ? '<span class="bg-brand text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">Matched</span>' : ''}
                        </div>
                        <div class="text-[10px] text-ink-light flex items-center gap-1.5 mt-0.5">
                            <span>${m.tier}</span>
                            <span>•</span>
                            <span class="flex items-center text-amber-500 font-bold gap-0.5">
                                <svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                                ${m.rating.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-[13px] font-black text-brand">${distanceText}</div>
                    <div class="text-[9px] text-ink-light font-bold">จากตำแหน่งของคุณ</div>
                </div>
            `;
            listEl.appendChild(card);

            if (m.latitude && m.longitude) {
                const dLat = m.latitude - lat;
                const dLng = m.longitude - lng;
                const scale = 80 / 0.05;
                const xOffset = Math.max(-80, Math.min(80, dLng * scale));
                const yOffset = Math.max(-80, Math.min(80, -dLat * scale));
                
                const pin = document.createElement('div');
                pin.className = "absolute w-8 h-8 flex flex-col items-center justify-center transition-all duration-1000";
                pin.style.left = `calc(50% + ${xOffset}px - 16px)`;
                pin.style.top = `calc(50% + ${yOffset}px - 16px)`;
                
                pin.innerHTML = `
                    <div class="relative group">
                        <div class="w-3.5 h-3.5 ${isMatched ? 'bg-emerald-500 ring-4 ring-emerald-500/30' : 'bg-brand/80 ring-4 ring-brand/10'} rounded-full border border-white shadow-md animate-pulse"></div>
                        <span class="absolute -top-6 left-1/2 -translate-x-1/2 bg-ink/90 text-white text-[8px] font-bold py-0.5 px-1.5 rounded whitespace-nowrap opacity-75">${m.fullName.split(' ')[0]} (${distanceText})</span>
                    </div>
                `;
                pinsEl.appendChild(pin);
            }
        });

        drawGoogleMap(lat, lng, maids, matchedMaid);

    } catch (e) {
        console.error("Error loading matching details", e);
    }
}

function drawGoogleMap(userLat, userLng, maids, matchedMaid) {
    const mapContainer = document.getElementById('booking-map');
    const radarContainer = document.getElementById('booking-radar');
    if (!mapContainer || !radarContainer) return;
    
    if (typeof google === 'undefined' || !google.maps) {
        mapContainer.classList.add('hidden');
        radarContainer.classList.remove('hidden');
        return;
    }
    
    mapContainer.classList.remove('hidden');
    radarContainer.classList.add('hidden');
    
    const userPos = { lat: userLat, lng: userLng };
    const mapObj = new google.maps.Map(mapContainer, {
        zoom: 14,
        center: userPos,
        disableDefaultUI: true,
        styles: [
            { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
            { "featureType": "transit", "stylers": [{ "visibility": "off" }] }
        ]
    });
    
    new google.maps.Marker({
        position: userPos,
        map: mapObj,
        title: "Your Location",
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: "#3b82f6",
            fillOpacity: 1,
            strokeWeight: 3,
            strokeColor: "#ffffff",
        }
    });
    
    maids.forEach(m => {
        if (!m.latitude || !m.longitude) return;
        const isMatched = m.id === matchedMaid.id;
        
        new google.maps.Marker({
            position: { lat: m.latitude, lng: m.longitude },
            map: mapObj,
            title: m.fullName,
            icon: {
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                scale: 1.2,
                fillColor: isMatched ? "#10b981" : "#046c4e",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#ffffff",
            }
        });
    });
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
            showToast("Booking confirmed! Proceed to tracking.", "success");
            closeModal();
            setTimeout(() => { location.href = '/liff/tracking'; }, 800);
        } else {
            const err = await res.json();
            throw new Error(err.detail || "Confirmation failed");
        }
    } catch (e) {
        showToast(e.message, "error");
    } finally {
        btn.disabled = false;
    }
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
    wheel.style.transition = 'transform 3s ease-out';
    wheel.style.transform = `rotate(${deg}deg)`;
    setTimeout(() => {
        showToast("Bonus Points Added! ✨", "success");
        btn.disabled = false;
        closeWheel();
    }, 3500);
};

window.openPackages = function() {
    showToast("Payment System Under Development", "info");
};

function closePackages() {
    const el = document.getElementById('packages-modal');
    if (el) {
        el.classList.add('hidden');
        el.classList.remove('flex');
    }
}

document.addEventListener("DOMContentLoaded", initHome);
