const LIFF_ID = "2010298695-2Jy19bfM";
const API_BASE = window.location.origin + "/api/v1";
let userProfile = null;
let accessToken = localStorage.getItem('momo_token');

// Immediate container creation
(function() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = "position:fixed; top:24px; left:0; right:0; z-index:9999; display:flex; flex-direction:column; align-items:center; gap:12px; pointer-events:none; padding:0 16px;";
    document.body.appendChild(container);
})();

window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) {
        alert(message); // Fallback
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') icon = `<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>`;
    else if (type === 'error') icon = `<svg class="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>`;
    else icon = `<svg class="w-5 h-5 text-blue-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

    toast.innerHTML = `${icon}<span class="text-[13px] font-semibold leading-tight tracking-wide text-white">${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};

function hideLoading() {
    console.log("Hiding loading screen...");
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.opacity = '0';
        setTimeout(() => {
            loading.style.display = 'none';
        }, 400);
    }
    const appContent = document.getElementById('app-content');
    if (appContent) {
        appContent.classList.add('visible');
        appContent.style.opacity = '1';
    }
}

function updateLangSwitcherUI() {
    const thBtn = document.getElementById('lang-th');
    const enBtn = document.getElementById('lang-en');
    if (!thBtn || !enBtn) return;
    
    if (i18n.lang === 'th') {
        thBtn.className = 'px-2 py-1 rounded-[5px] transition-colors bg-brand text-white';
        enBtn.className = 'px-2 py-1 rounded-[5px] transition-colors text-ink-muted';
    } else {
        enBtn.className = 'px-2 py-1 rounded-[5px] transition-colors bg-brand text-white';
        thBtn.className = 'px-2 py-1 rounded-[5px] transition-colors text-ink-muted';
    }
}

function setGreeting() {
    const h = new Date().getHours();
    const greetKey = h < 12 ? "greeting_morning" : h < 17 ? "greeting_afternoon" : "greeting_evening";
    const greetEl = document.getElementById('user-greeting');
    if (greetEl) {
        greetEl.setAttribute('data-i18n', greetKey);
        greetEl.textContent = i18n.t(greetKey);
    }
}

async function initCoreLiff(requireAuth = true) {
    console.log("Initializing Core LIFF...");
    // Initialize i18n
    if (window.i18n) {
        i18n.updateUI();
        updateLangSwitcherUI();
    }
    setGreeting();

    try {
        await liff.init({ liffId: LIFF_ID });
        console.log("LIFF initialized. LoggedIn:", liff.isLoggedIn());
        
        if (liff.isLoggedIn()) {
            const idToken = liff.getIDToken();
            await loginToBackend(idToken);
            hideLoading();
        } else if (requireAuth) {
            const intro = document.getElementById('intro-page');
            if (intro) {
                console.log("Showing intro page...");
                hideLoading();
                intro.classList.remove('hidden');
                intro.classList.add('visible');
                intro.style.display = 'flex';
            } else {
                console.log("No intro page found, redirecting to login...");
                liff.login({ redirectUri: window.location.origin + "/liff" });
            }
        } else {
            hideLoading();
        }
    } catch (e) {
        console.error("LIFF Init Error:", e);
        hideLoading(); 
        showToast("System Error. Please try again.", "error");
    }
}

async function loginToBackend(idToken) {
    if (!idToken) return;
    try {
        const res = await fetch(`${API_BASE}/auth/login/line`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: idToken })
        });
        
        if (!res.ok) {
            const errData = await res.json();
            const errorString = JSON.stringify(errData);
            if (res.status === 401 && (errorString.includes("expired") || errorString.includes("Invalid LINE ID Token"))) {
                liff.logout();
                localStorage.removeItem('momo_token');
                liff.login({ redirectUri: window.location.origin + "/liff" });
                return;
            }
            throw new Error(errData.detail || "Authentication failed");
        }
        
        const data = await res.json();
        accessToken = data.access_token;
        localStorage.setItem('momo_token', accessToken);
        
        userProfile = await liff.getProfile();
        
        const userNameEl = document.getElementById('user-name');
        const userPicEl = document.getElementById('user-picture');
        if (userNameEl) userNameEl.textContent = userProfile.displayName + "!";
        if (userPicEl) userPicEl.src = userProfile.pictureUrl;
        
    } catch (e) {
        console.error("Backend Login Error:", e);
        if (liff.isLoggedIn()) {
            showToast(`Login Error: ${e.message}`, 'error');
        }
    }
}
async function fetchWalletAndPoints() {
    if (!accessToken) return null;
    try {
        const [wRes, pRes] = await Promise.all([
            fetch(`${API_BASE}/credit/wallet`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
            fetch(`${API_BASE}/points/balance/me`, { headers: { 'Authorization': `Bearer ${accessToken}` } })
        ]);

        if (!wRes.ok || !pRes.ok) {
            console.warn("Could not fetch balance data: ", wRes.status, pRes.status);
            return null;
        }

        const wallet = await wRes.json();
        const balance = await pRes.json();
        return { wallet, balance };
    } catch (e) {
        console.error("Data Fetch Error (Wallet/Points):", e);
        return null;
    }
}

async function fetchCreditHistory() {
    if (!accessToken) return [];
    try {
        const res = await fetch(`${API_BASE}/credit/history`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!res.ok) throw new Error("Failed to fetch history");
        return await res.json();
    } catch (e) {
        console.error("History Fetch Error:", e);
        return [];
    }
}

async function shareReferral() {
    if (!accessToken) return;
    try {
        const res = await fetch(`${API_BASE}/points/balance/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        const referralCode = data.referral_code || 'MOMO888';
        const shareText = `Try Momo — effortless home care! Use my code ${referralCode} to get 50 bonus points. Sign up here: ${window.location.origin}/liff`;

        if (liff.isApiAvailable && liff.isApiAvailable('shareTargetPicker')) {
            await liff.shareTargetPicker([{
                type: "text",
                text: shareText
            }]);
        } else {
            // Fallback: Copy to clipboard
            const el = document.createElement('textarea');
            el.value = shareText;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            showToast("Referral link copied to clipboard!", "success");
        }
    } catch (e) {
        console.error("Referral Error:", e);
        showToast("Could not share referral", "error");
    }
}
