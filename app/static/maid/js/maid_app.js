const LIFF_ID = "2010298695-2Jy19bfM"; // Using the same LIFF ID for prototype testing
const API_BASE = window.location.origin + "/api/v1";
let isPartnerActive = false; 
let accessToken = localStorage.getItem('momo_maid_token');
let currentMaidData = null;
let currentActiveJobId = null;

// Inject Toast Container
document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
});

window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') icon = `<svg class="w-5 h-5 text-emerald-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>`;
    else if (type === 'error') icon = `<svg class="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>`;
    else icon = `<svg class="w-5 h-5 text-partner shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

    toast.innerHTML = `${icon}<span class="text-[13px] font-semibold leading-tight tracking-wide text-white">${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
};

async function initMaidApp() {
    try {
        await liff.init({ liffId: LIFF_ID });
        
        if (!liff.isLoggedIn()) {
            liff.login();
        } else {
            const idToken = liff.getIDToken();
            await loginToBackend(idToken);
        }
    } catch (e) {
        console.error("LIFF Init Error:", e);
    } finally {
        setTimeout(() => {
            document.getElementById('loading').style.opacity = '0';
            setTimeout(() => document.getElementById('loading').style.display = 'none', 400);
            
            if (isPartnerActive) {
                document.getElementById('app-content').classList.add('visible');
            }
        }, 800);
    }
}

async function loginToBackend(idToken) {
    try {
        const res = await fetch(`${API_BASE}/auth/login/line`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: idToken })
        });
        
        if (!res.ok) throw new Error("Authentication failed");
        
        const data = await res.json();
        accessToken = data.access_token;
        localStorage.setItem('momo_maid_token', accessToken);
        
        await checkMaidProfile();
    } catch (e) {
        console.error("Login Error:", e);
        if (liff.isLoggedIn()) {
            showToast("Session expired. Reconnecting...", "error");
            liff.logout();
            liff.login();
        }
    }
}

async function checkMaidProfile() {
    try {
        const res = await fetch(`${API_BASE}/maids/me`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (res.ok) {
            currentMaidData = await res.json();
            isPartnerActive = true;
            populateProfileUI(currentMaidData);
            document.getElementById('intro-page').style.display = 'none';
            document.getElementById('app-content').style.display = 'block';
            fetchPendingJobs();
        } else if (res.status === 404) {
            isPartnerActive = false;
            document.getElementById('intro-page').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
        }
    } catch (e) {
        console.error("Profile check failed:", e);
    }
}

function populateProfileUI(maid) {
    document.getElementById('maid-name').textContent = maid.full_name;
    document.getElementById('maid-tier').textContent = maid.tier;
    document.getElementById('maid-rating').textContent = maid.rating.toFixed(1);
    document.getElementById('maid-jobs').textContent = maid.job_completed;
}

async function startOnboarding() {
    const profile = await liff.getProfile();
    const payload = {
        full_name: profile.displayName,
        phone_number: "0999999999", // Mock
        profile_picture_url: profile.pictureUrl,
        skills: [{ skill: "GENERAL_CLEANING", level: 5 }],
        test_score: 85,
        base_rate: 450,
        demographics: {}
    };

    try {
        const res = await fetch(`${API_BASE}/maids/onboard`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast("Welcome to Momo Pro!", "success");
            await checkMaidProfile();
            setTimeout(() => {
                document.getElementById('app-content').classList.add('visible');
            }, 50);
        } else {
            showToast("Onboarding failed.", "error");
        }
    } catch (e) {
        console.error("Onboarding error", e);
    }
}

async function fetchPendingJobs() {
    try {
        const res = await fetch(`${API_BASE}/maids/jobs/pending`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (res.ok) {
            const jobs = await res.json();
            renderJobs(jobs);
        }
    } catch (e) {
        console.error("Fetch pending jobs error", e);
    }
}

function renderJobs(jobs) {
    const container = document.getElementById('jobs-container');
    if (!container) return;
    
    container.innerHTML = '';
    if (jobs.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No new job requests</p>';
        return;
    }

    jobs.forEach(job => {
        const html = `
            <div class="bg-white rounded-[20px] p-5 shadow-card border border-slate-100" id="job-card-${job.id}">
                <div class="flex items-start justify-between mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 bg-partner-surface text-partner rounded-full flex items-center justify-center">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 3l18 18M8.5 2.5l10 10M16 6l2 2-8 8-4-1 1-4z"></path></svg>
                        </div>
                        <div>
                            <h4 class="font-bold text-[14px] text-slate-800">${job.type}</h4>
                            <p class="text-[11px] font-semibold text-partner">${job.party_size} Hours • ${job.location_name}</p>
                        </div>
                    </div>
                    <span class="font-black text-[16px] text-slate-800">${job.credit_cost} บาท</span>
                </div>
                <button class="w-full bg-partner text-white font-bold text-[13px] py-3 rounded-xl btn-press shadow-sm" onclick="acceptJob(this, '${job.id}', '${job.type}', '${job.location_name}')">
                    Accept Job
                </button>
            </div>
        `;
        container.innerHTML += html;
    });
}

async function acceptJob(btn, jobId, type, location) {
    btn.innerHTML = '<div class="spinner-small mx-auto"></div>';
    btn.disabled = true;
    
    try {
        const res = await fetch(`${API_BASE}/maids/jobs/${jobId}/accept`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (res.ok) {
            btn.parentElement.style.display = 'none';
            currentActiveJobId = jobId;
            
            // Show Active Job Section
            const activeSection = document.getElementById('active-job-section');
            document.getElementById('active-job-type').textContent = type;
            document.getElementById('active-job-location').textContent = location;
            
            activeSection.classList.remove('hidden');
            activeSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            throw new Error("Job might have been taken");
        }
    } catch (e) {
        showToast("Failed to accept job: " + e.message, "error");
        btn.disabled = false;
        btn.innerHTML = 'Accept Job';
    }
}

let jobStep = 1;
const STATUS_MAP = {
    1: 'PENDING',
    2: 'ARRIVED',
    3: 'IN_PROGRESS',
    4: 'COMPLETED'
};

async function nextStatus() {
    if (!currentActiveJobId) return;
    
    const btn = document.getElementById('status-btn');
    btn.innerHTML = '<div class="spinner-small mx-auto border-slate-900 border-t-transparent"></div>';
    btn.disabled = true;
    
    jobStep++;
    const newStatus = STATUS_MAP[jobStep];

    try {
        await fetch(`${API_BASE}/bookings/${currentActiveJobId}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}` 
            },
            body: JSON.stringify({ status: newStatus })
        });

        btn.disabled = false;
        
        if (jobStep === 2) {
            document.getElementById('prog-2').classList.replace('bg-slate-600', 'bg-partner');
            btn.textContent = "Start Cleaning";
        } else if (jobStep === 3) {
            document.getElementById('prog-3').classList.replace('bg-slate-600', 'bg-partner');
            btn.textContent = "Complete Job";
            btn.classList.replace('bg-white', 'bg-emerald-400');
            btn.classList.replace('text-slate-900', 'text-white');
        } else if (jobStep === 4) {
            document.getElementById('prog-4').classList.replace('bg-slate-600', 'bg-partner');
            showToast("Job Completed! Earnings added to your wallet.", "success");
            document.getElementById('active-job-section').classList.add('hidden');
            jobStep = 1; // reset
            currentActiveJobId = null;
            btn.textContent = "I have Arrived"; // reset UI for next job
            btn.classList.replace('bg-emerald-400', 'bg-white');
            btn.classList.replace('text-white', 'text-slate-900');
            [2,3,4].forEach(n => document.getElementById(`prog-${n}`).classList.replace('bg-partner', 'bg-slate-600'));
        }
    } catch (e) {
        showToast("Failed to update status", "error");
        btn.disabled = false;
        jobStep--; // revert
        btn.textContent = "Try Again";
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initMaidApp();
});
