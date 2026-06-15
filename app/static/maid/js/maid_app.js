// Force client-side redirection to /liff/maid to comply with LINE Developers Console redirectUri prefix rules
if (window.location.pathname === "/maid" || window.location.pathname.startsWith("/maid/")) {
    window.location.replace(window.location.origin + window.location.pathname.replace("/maid", "/liff/maid") + window.location.search);
}

const LIFF_ID = "2010298695-2Jy19bfM"; // Using the same LIFF ID for prototype testing
const API_BASE = window.location.origin + "/api/v1";

// Persistent State using LocalStorage for Mock Mode
let isPartnerActive = false;
let accessToken = localStorage.getItem('momo_maid_token');
let currentMaidData = null;
let currentActiveJobId = null;
let locationWatchId = null;
let currentCustomerPhone = '';

// Local Simulation State (used as fallbacks or overrides)
let useLocalMock = false;
let activeView = 'jobs';
let activeJobSubTab = 'available';
let activeJobFilter = 'ALL';
let autoAcceptInterval = null;
let jobTimerInterval = null;
let jobTimerSeconds = 0;
let vacationMode = localStorage.getItem('momo_vacation_mode') === 'true';

// Quiz State
let quizCurrentStep = 0;
let quizScore = 0;
let quizTimerVal = 0;
let quizTimerInterval = null;
let quizSelectedAnswer = null;

const quizQuestions = [
    {
        question: "หากเดินทางไปถึงบ้านลูกค้าแล้วไม่มีคนเปิดประตูรับสาย และไม่สามารถติดต่อได้ คุณควรดำเนินการอย่างไร?",
        options: [
            { text: "เดินทางกลับทันทีและส่งบิลเรียกเก็บเงินชดเชย", correct: false },
            { text: "รอ ณ จุดปักหมุดอย่างน้อย 15 นาที พยายามโทรติดต่อผ่านแอป/ LINE และอัปเดตแจ้งระบบช่วยเหลือในหน้าแอปก่อนพิจารณายกเลิกงาน", correct: true },
            { text: "หาทางข้ามรั้วหรือเปิดประตูเข้าไปในบริเวณบ้านเพื่อทำความสะอาดด่วน", correct: false }
        ],
        explanation: "การรอ 15 นาทีและพยายามติดต่อในช่องทางหลัก พร้อมรายงานในแอปเป็นขั้นตอนมาตรฐานเพื่อรักษาสิทธิ์ความปลอดภัยและผลประโยชน์ของคุณและระบบจอง"
    },
    {
        question: "หลักสำคัญที่สุดสำหรับการบริการระดับมืออาชีพของ MaidBooking คืออะไร?",
        options: [
            { text: "รีบทำความสะอาดให้เร็วที่สุดโดยไม่สนใจความต้องการย่อยของลูกค้าเพื่อไปงานถัดไป", correct: false },
            { text: "เรื่องความปลอดภัย ความซื่อสัตย์ การแต่งกายสุภาพด้วยเสื้อยูนิฟอร์ม และทำความสะอาดตามหัวข้อที่ลูกค้าจัดเตรียมหรือแจ้งโน้ตไว้ครบถ้วน", correct: true },
            { text: "การพูดคุยสนทนาเรื่องส่วนตัวอย่างเป็นกันเองและแนะนำบริการส่วนตัวให้ลูกค้า", correct: false }
        ],
        explanation: "มาตรฐาน MaidBooking คือความปลอดภัย ความซื่อสัตย์ ความน่าเชื่อถือในรูปลักษณ์ และใส่ใจในงานบริการที่ลูกค้าจ่ายเงินจอง"
    },
    {
        question: "หากลูกค้าขอจ้างคุณไปทำงานนอกระบบ (คุยนอกรอบ/จ่ายสดไม่ผ่านแอป) ในวันหลัง คุณต้องทำอย่างไร?",
        options: [
            { text: "รับงานโดยตรงทันทีเพื่อรับเงินเต็มจำนวนไม่ต้องโดนหักเปอร์เซ็นต์", correct: false },
            { text: "ยินดีทำให้และพาเพื่อนแม่บ้านคนอื่นไปรับงานเพิ่มด้วย", correct: false },
            { text: "ปฏิเสธอย่างสุภาพ อธิบายว่าระบบไม่ครอบคลุมประกันความเสียหายและความปลอดภัยให้กรณีเกิดเหตุ และแนะนำให้จองผ่านระบบแอปเพื่อความคุ้มครองสูงสุด", correct: true }
        ],
        explanation: "การรับงานนอกระบบละเมิดกฎการให้บริการ และทำให้สูญเสียประกันความปลอดภัยและการดูแลกรณีเกิดทรัพย์สินเสียหายหรืออุบัติเหตุ"
    }
];

// Seed Mock Jobs
const mockJobs = [
    {
        id: "mock-job-1",
        type: "GENERAL_CLEANING",
        typeName: "ทำความสะอาดทั่วไป",
        location_name: "Ideo Mobi สุขุมวิท 81 (BTS อ่อนนุช)",
        location_desc: "อาคาร A ชั้น 12 ห้อง 1205 มีคีย์การ์ดฝากไว้ที่นิติบุคคลตอนบ่ายสอง",
        party_size: 2, // Hours
        notes: "เช็ดฝุ่น กวาด ถูห้องขนาด 32 ตร.ม. และล้างระเบียงภายนอก ห้องนอนมีฝุ่นเยอะหน่อย มีแมว 1 ตัว (เชื่องมาก)",
        credit_cost: 550,
        customer_name: "คุณณิชาภา (Nichapa)",
        customer_tags: ["No Pets (In bedroom)", "Friendly", "Provide Tools"],
        membership_tier: "GOLD",
        scheduled_at: "วันนี้, 15:30 - 17:30",
        distance: "1.2 กม.",
        customer_rating: 4.8,
        customer_lat: 13.7055,
        customer_lng: 100.6015
    },
    {
        id: "mock-job-2",
        type: "DEEP_CLEANING",
        typeName: "ทำความสะอาดบิ๊กคลีนนิ่ง (Deep Clean)",
        location_name: "บ้านเดี่ยว แสนสิริ พัฒนาการ",
        location_desc: "ซอย 7 บ้านเลขที่ 88/12 บ้าน 2 ชั้น พื้นที่ 180 ตร.ม.",
        party_size: 5, // Hours
        notes: "ต้องการล้างตู้เย็นภายนอก-ใน เช็ดกระจกขอบสูงทุกจุด และล้างลานจอดรถ มีเครื่องดูดฝุ่นและน้ำยาให้ครบถ้วน",
        credit_cost: 1550,
        customer_name: "คุณวิทวัส (Witawat)",
        customer_tags: ["Cats in house", "Provide Tools", "Vaccinated Only"],
        membership_tier: "PLATINUM",
        scheduled_at: "พรุ่งนี้, 09:00 - 14:00",
        distance: "4.8 กม.",
        customer_rating: 4.95,
        customer_lat: 13.7381,
        customer_lng: 100.6322
    },
    {
        id: "mock-job-3",
        type: "IRONING",
        typeName: "รีดผ้าและจัดระเบียบ",
        location_name: "Lumpini Suite ดินแดง-ราชปรารภ",
        location_desc: "ชั้น 21 ห้อง 2108 มีเตารีดไอน้ำแบบยืนพร้อมใช้งาน",
        party_size: 3, // Hours
        notes: "รีดเสื้อเชิ้ตทำงาน 15 ตัว กางเกงสแล็ค 5 ตัว พับเก็บในตู้ให้เรียบร้อย ขอสเปรย์ฉีดผ้าหอมกลิ่นธรรมชาติติดตัวมาด้วยนะคะ",
        credit_cost: 750,
        customer_name: "คุณจรรยา (Janya)",
        customer_tags: ["No Pets", "Bring Spray"],
        membership_tier: "SILVER",
        scheduled_at: "พรุ่งนี้, 13:00 - 16:00",
        distance: "2.1 กม.",
        customer_rating: 4.6,
        customer_lat: 13.7545,
        customer_lng: 100.5422
    },
    {
        id: "mock-job-4",
        type: "COOKING",
        typeName: "เตรียมวัตถุดิบและทำอาหาร",
        location_name: "Noble Red อารีย์ (ซอย 1)",
        location_desc: "บ้านเลขที่ 12 ใกล้ BTS อารีย์ มีที่จอดรถในบ้าน",
        party_size: 3, // Hours
        notes: "ช่วยทำกับข้าว 3 เมนู: แกงส้มชะอมไข่ กะเพราไก่สับ และต้มจืดเต้าหู้ไข่ วัตถุดิบซื้อเตรียมไว้ให้ในตู้เย็นแล้วค่ะ",
        credit_cost: 900,
        customer_name: "คุณปกรณ์ (Pakorn)",
        customer_tags: ["Ingredients Ready", "High Rating"],
        membership_tier: "DIAMOND",
        scheduled_at: "17 มิ.ย., 16:30 - 19:30",
        distance: "5.5 กม.",
        customer_rating: 5.0,
        customer_lat: 13.7795,
        customer_lng: 100.5445
    }
];

// Initialize DB elements in localStorage if not exists
if (!localStorage.getItem('momo_wallet_balance')) {
    localStorage.setItem('momo_wallet_balance', '2450');
}
if (!localStorage.getItem('momo_jobs_completed')) {
    localStorage.setItem('momo_jobs_completed', '142');
}
if (!localStorage.getItem('momo_rating')) {
    localStorage.setItem('momo_rating', '4.85');
}
if (!localStorage.getItem('momo_transactions')) {
    const defaultTx = [
        { type: 'JOB_PAYOUT', amount: 550, title: 'รายได้จากงาน คุณสุชาดา', date: 'วันนี้, 11:30 น.' },
        { type: 'JOB_PAYOUT', amount: 750, title: 'รายได้จากงาน คุณนพดล', date: 'เมื่อวานนี้, 16:00 น.' },
        { type: 'WITHDRAW', amount: -1500, title: 'ถอนเงินสำเร็จ (PromptPay)', date: '13 มิ.ย. 2569, 09:30 น.' }
    ];
    localStorage.setItem('momo_transactions', JSON.stringify(defaultTx));
}
if (!localStorage.getItem('momo_completed_jobs')) {
    const defaultHistory = [
        { id: "h1", type: "GENERAL_CLEANING", typeName: "ทำความสะอาดทั่วไป", location_name: "Lumpini Place Rama 9", customer_name: "คุณสุชาดา", date: "วันนี้, 09:00 - 11:00", payout: 550, rating: 5, comment: "สุภาพ ทำงานเรียบร้อย ว่องไวมากค่ะ" },
        { id: "h2", type: "IRONING", typeName: "รีดผ้าและจัดระเบียบ", location_name: "Condo One Thonglor", customer_name: "คุณนพดล", date: "เมื่อวานนี้, 13:00 - 16:00", payout: 750, rating: 5, comment: "รีดผ้าสแล็คได้เรียบมากครับ ตรงเวลาดี" }
    ];
    localStorage.setItem('momo_completed_jobs', JSON.stringify(defaultHistory));
}
if (!localStorage.getItem('momo_active_job')) {
    localStorage.setItem('momo_active_job', '');
}
let needScheduleInit = false;
try {
    const stored = localStorage.getItem('momo_schedule');
    if (!stored || stored === '{}') {
        needScheduleInit = true;
    } else {
        JSON.parse(stored);
    }
} catch (e) {
    needScheduleInit = true;
}

if (needScheduleInit) {
    const defaultSchedule = {
        monday: { morning: true, afternoon: true, evening: false },
        tuesday: { morning: true, afternoon: false, evening: false },
        wednesday: { morning: true, afternoon: true, evening: true },
        thursday: { morning: false, afternoon: true, evening: false },
        friday: { morning: true, afternoon: true, evening: false },
        saturday: { morning: false, afternoon: false, evening: false },
        sunday: { morning: false, afternoon: false, evening: false }
    };
    localStorage.setItem('momo_schedule', JSON.stringify(defaultSchedule));
}

// ── App Startup ──
document.addEventListener("DOMContentLoaded", () => {
    // Inject Toast Container
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    initMaidApp();
});

async function initMaidApp() {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
        console.log("Localhost detected: attempting to load mock token...");
        try {
            const res = await fetch(`${API_BASE}/auth/mock-maid`);
            if (res.ok) {
                const data = await res.json();
                accessToken = data.access_token;
                localStorage.setItem('momo_maid_token', accessToken);
                console.log("Obtained API mock token for maid:", data.full_name);
                await checkMaidProfile();
            } else {
                console.warn("Backend auth failed or no seeded maids. Running local mock mode.");
                enableLocalMockMode();
            }
        } catch (e) {
            console.error("Local token fetch failed. Falling back to local mock mode:", e);
            enableLocalMockMode();
        } finally {
            hideLoadingScreen();
        }
        return;
    }

    try {
        await liff.init({ liffId: LIFF_ID });
        
        if (!liff.isLoggedIn()) {
            liff.login({ redirectUri: window.location.href });
        } else {
            const idToken = liff.getIDToken();
            await loginToBackend(idToken);
        }
    } catch (e) {
        console.error("LIFF Init Error:", e);
        enableLocalMockMode(); // fallback in case of errors
    } finally {
        hideLoadingScreen();
    }
}

function hideLoadingScreen() {
    setTimeout(() => {
        const loader = document.getElementById('loading');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 400);
        }
        
        const content = document.getElementById('app-content');
        if (content && isPartnerActive) {
            content.style.display = 'block';
            content.classList.add('visible');
        }
    }, 800);
}

function enableLocalMockMode() {
    useLocalMock = true;
    isPartnerActive = true;
    currentMaidData = {
        full_name: "คุณสมศรี ใจดี",
        tier: "ELITE",
        rating: parseFloat(localStorage.getItem('momo_rating') || '4.85'),
        job_completed: parseInt(localStorage.getItem('momo_jobs_completed') || '142'),
        skills: [
            { skill: "GENERAL_CLEANING", level: 5 },
            { skill: "IRONING", level: 4 },
            { skill: "COOKING", level: 2 }
        ]
    };
    
    // UI Populate
    populateProfileUI(currentMaidData);
    document.getElementById('intro-page').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    
    // Load lists
    renderJobs(mockJobs);
    updateScheduleUI();
    updateEarningsUI();
    updateAccountUI();
    
    // Check if there is an active job in localStorage
    const savedActiveJob = localStorage.getItem('momo_active_job');
    if (savedActiveJob) {
        const job = JSON.parse(savedActiveJob);
        loadSimulatedActiveJob(job);
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
        console.error("Login Error, falling back to local simulation:", e);
        enableLocalMockMode();
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
            
            // Trigger fetch jobs from server
            fetchPendingJobs();
            updateScheduleUI();
            updateEarningsUI();
            updateAccountUI();
        } else if (res.status === 404) {
            isPartnerActive = false;
            document.getElementById('intro-page').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
        } else {
            enableLocalMockMode();
        }
    } catch (e) {
        console.error("Profile check failed, falling back to mock:", e);
        enableLocalMockMode();
    }
}

function populateProfileUI(maid) {
    document.getElementById('maid-name').textContent = maid.full_name;
    document.getElementById('maid-tier-badge').textContent = maid.tier;
    document.getElementById('maid-rating').textContent = maid.rating.toFixed(2);
    document.getElementById('maid-jobs').textContent = maid.job_completed;
    
    const balance = parseFloat(localStorage.getItem('momo_wallet_balance') || '2450');
    document.getElementById('quick-wallet-balance').textContent = `฿${balance.toLocaleString()}`;
    
    // Set avatars
    const imgUrl = maid.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(maid.full_name)}&background=eff6ff&color=1e40af&size=128&bold=true`;
    document.getElementById('maid-picture').src = imgUrl;
    document.getElementById('profile-picture-full').src = imgUrl;
}

// ── API Job Fetching ──
async function fetchPendingJobs() {
    if (useLocalMock) {
        renderJobs(mockJobs);
        return;
    }
    
    try {
        const res = await fetch(`${API_BASE}/maids/jobs/pending`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (res.ok) {
            const jobs = await res.json();
            // enhance backend jobs with distance / details for mockup richness
            const enhanced = jobs.map((j, index) => {
                return {
                    id: j.id,
                    type: j.type,
                    typeName: translateType(j.type),
                    location_name: j.location_name,
                    location_desc: j.notes || "กรุณาดูรายละเอียดงานเพิ่มเติมเมื่อรับงานแล้ว",
                    party_size: j.party_size || 2,
                    notes: j.notes || "ไม่มีข้อกำหนดพิเศษ",
                    credit_cost: j.credit_cost || 450,
                    customer_name: j.customer_name || "ลูกค้าทั่วไป",
                    customer_tags: j.customer_tags || ["No Pets"],
                    membership_tier: j.membership_tier || "SILVER",
                    scheduled_at: "วันนี้, " + (14 + index) + ":00 - " + (16 + index) + ":00 น.",
                    distance: (1.5 + index).toFixed(1) + " กม.",
                    customer_rating: 4.8,
                    customer_lat: 13.7563 + (index * 0.01),
                    customer_lng: 100.5018 + (index * 0.01)
                };
            });
            
            // Merge mockJobs for mockup fullness if backend returns empty
            if (enhanced.length === 0) {
                renderJobs(mockJobs);
            } else {
                renderJobs(enhanced);
            }
        } else {
            renderJobs(mockJobs);
        }
    } catch (e) {
        console.error("Fetch pending jobs error, loading mocks", e);
        renderJobs(mockJobs);
    }
}

function translateType(type) {
    const map = {
        'GENERAL_CLEANING': 'ทำความสะอาดทั่วไป',
        'DEEP_CLEANING': 'ทำความสะอาดใหญ่ (Deep)',
        'IRONING': 'รีดผ้าและจัดเสื้อผ้า',
        'COOKING': 'จัดเตรียมและทำอาหาร',
        'LAUNDRY': 'ซักอบรีดพรีเมียม'
    };
    return map[type] || type;
}

// ── Views Switcher ──
window.switchView = function(viewName) {
    activeView = viewName;
    
    // Hide all view sections
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
    });
    
    // Show selected
    document.getElementById(`view-${viewName}`).classList.remove('hidden');
    
    // Update Nav bar icons active states
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.replace('text-partner', 'text-slate-400');
        btn.querySelector('svg').setAttribute('stroke-width', '2');
    });
    
    const activeNav = document.getElementById(`nav-${viewName}`);
    if (activeNav) {
        activeNav.classList.replace('text-slate-400', 'text-partner');
        activeNav.querySelector('svg').setAttribute('stroke-width', '2.5');
    }
    
    // Refresh individual view data
    if (viewName === 'jobs') {
        if (activeJobSubTab === 'available') {
            fetchPendingJobs();
        }
    } else if (viewName === 'schedule') {
        updateScheduleUI();
    } else if (viewName === 'earnings') {
        updateEarningsUI();
    } else if (viewName === 'account') {
        updateAccountUI();
    }
};

window.switchJobSubTab = function(tabName) {
    activeJobSubTab = tabName;
    
    const subAvailable = document.getElementById('subtab-available');
    const subActive = document.getElementById('subtab-active');
    
    if (tabName === 'available') {
        subAvailable.className = "flex-1 pb-3 text-center text-[13px] font-black text-partner border-b-2 border-partner transition-all";
        subActive.className = "flex-1 pb-3 text-center text-[13px] font-bold text-slate-400 border-b-2 border-transparent hover:text-slate-600 transition-all flex justify-center items-center gap-1.5";
        
        document.getElementById('subview-available-jobs').classList.remove('hidden');
        document.getElementById('subview-active-job').classList.add('hidden');
        fetchPendingJobs();
    } else {
        subAvailable.className = "flex-1 pb-3 text-center text-[13px] font-bold text-slate-400 border-b-2 border-transparent hover:text-slate-600 transition-all";
        subActive.className = "flex-1 pb-3 text-center text-[13px] font-black text-partner border-b-2 border-partner transition-all flex justify-center items-center gap-1.5";
        
        document.getElementById('subview-available-jobs').classList.add('hidden');
        document.getElementById('subview-active-job').classList.remove('hidden');
        
        renderActiveJobView();
    }
};

// ── Render Jobs Feed ──
function renderJobs(jobs) {
    const container = document.getElementById('jobs-container');
    if (!container) return;
    
    // filter
    let filtered = jobs;
    if (activeJobFilter !== 'ALL') {
        filtered = jobs.filter(j => j.type === activeJobFilter);
    }
    
    document.getElementById('available-jobs-count').textContent = filtered.length;
    
    container.innerHTML = '';
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="bg-white rounded-[24px] p-8 text-center border border-slate-100 shadow-premium">
                <div class="w-14 h-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <p class="font-bold text-slate-700 text-sm mb-1">ไม่มีงานใหม่ในขณะนี้</p>
                <p class="text-xs text-slate-400 leading-normal">เมื่อมีลูกค้ากดจองงานในพื้นที่ใกล้คุณ ระบบจะแจ้งเตือนขึ้นทันที</p>
            </div>
        `;
        return;
    }
    
    filtered.forEach(job => {
        const tagsHtml = job.customer_tags.map(tag => 
            `<span class="bg-partner-surface text-partner text-[9px] px-2 py-0.5 rounded font-black border border-partner/5 uppercase">${tag}</span>`
        ).join(' ');
        
        let tierColor = 'bg-slate-100 text-slate-500';
        if (job.membership_tier === 'GOLD') tierColor = 'bg-amber-400 text-slate-900 font-bold';
        else if (job.membership_tier === 'PLATINUM') tierColor = 'bg-slate-700 text-white font-bold';
        else if (job.membership_tier === 'DIAMOND') tierColor = 'bg-blue-600 text-white font-bold';
        
        const html = `
            <div class="bg-white rounded-[24px] p-5 shadow-premium border border-slate-100 mb-1 cursor-pointer transition-all hover:border-partner/20" onclick="openJobDetailSheet('${job.id}')">
                <div class="flex items-start justify-between gap-3 mb-3.5">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 bg-partner-surface text-partner rounded-2xl flex items-center justify-center shrink-0 border border-partner/10">
                            ${getJobIcon(job.type)}
                        </div>
                        <div class="min-w-0">
                            <h4 class="font-black text-[14px] text-slate-800 leading-tight truncate text-break-thai text-md-responsive">${job.typeName}</h4>
                            <p class="text-[11px] font-bold text-slate-400 mt-1 flex items-center gap-1 min-w-0 text-sm-responsive">
                                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                <span class="truncate">${job.scheduled_at} (${job.party_size} ชม.)</span>
                            </p>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="font-black text-[18px] text-partner leading-none text-md-responsive">฿${job.credit_cost}</p>
                        <p class="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider text-xs-responsive">${job.distance} จากคุณ</p>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 mb-4 border-t border-slate-50 pt-3 flex-wrap">
                    <span class="text-[9px] px-2 py-0.5 rounded font-black uppercase ${tierColor}">${job.membership_tier}</span>
                    ${tagsHtml}
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <button class="w-full bg-partner text-white font-bold text-xs py-3 rounded-xl btn-press shadow-glow-blue" onclick="event.stopPropagation(); quickAcceptJob('${job.id}')">
                        กดรับงานด่วน
                    </button>
                    <button class="w-full bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold py-3 rounded-xl btn-press border border-slate-200/50" onclick="event.stopPropagation(); skipJob('${job.id}')">
                        ปฏิเสธ
                    </button>
                </div>
            </div>
        `;
        container.innerHTML += html;
    });
}

function getJobIcon(type) {
    if (type === 'GENERAL_CLEANING') return `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19.5 8.25l-1.5 1.5M19.5 8.25l-3-3M19.5 8.25h-3.75A2.25 2.25 0 0010.5 10.5v1.5m.75 8.25h9.75m-9.75 0a1.5 1.5 0 01-1.5-1.5v-3m1.5 4.5h-.75A2.25 2.25 0 019 18v-1.5m8.25-13.5h-9.75m0 0a1.5 1.5 0 00-1.5 1.5v3M7.5 4.5H6.75A2.25 2.25 0 004.5 6.75v1.5M10.5 21v-3.75A2.25 2.25 0 008.25 15H4.5m0 6v-3.75A2.25 2.25 0 016.75 15H8.25"></path></svg>`;
    if (type === 'DEEP_CLEANING') return `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9.813 15.904L9 21m0 0l-.813-5.096M9 21h3.75m-3.75 0H5.25m4.563-10.219a3 3 0 114.376 4.376L9 21m4.563-15.219l1.563-1.563M9.812 5.781l-1.563-1.563M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
    if (type === 'IRONING') return `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>`;
    return `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>`;
}

window.filterAvailableJobs = function(category) {
    activeJobFilter = category;
    
    // Update active style on filter buttons
    document.querySelectorAll('.job-filter-btn').forEach(btn => {
        btn.className = "job-filter-btn shrink-0 px-4 py-1.5 rounded-full text-xs font-bold bg-white text-slate-500 border border-slate-200 hover:border-slate-300 transition-all";
    });
    
    // Find clicked button
    const btns = Array.from(document.querySelectorAll('.job-filter-btn'));
    const clicked = btns.find(b => b.textContent.includes(category === 'ALL' ? 'ทั้งหมด' : (category === 'GENERAL_CLEANING' ? 'ทั่วไป' : category === 'DEEP_CLEANING' ? 'บิ๊ก' : category === 'IRONING' ? 'รีด' : 'อาหาร')));
    if (clicked) {
        clicked.className = "job-filter-btn shrink-0 px-4 py-1.5 rounded-full text-xs font-bold bg-partner text-white border border-partner shadow-sm transition-all";
    }
    
    fetchPendingJobs();
};

window.skipJob = function(jobId) {
    // Just remove from mockup list
    const index = mockJobs.findIndex(j => j.id === jobId);
    if (index > -1) {
        mockJobs.splice(index, 1);
        showToast("ข้ามงานเรียบร้อยแล้ว", "info");
        fetchPendingJobs();
    }
};

// ── Open Job Detail Sheet ──
window.openJobDetailSheet = function(jobId) {
    const job = mockJobs.find(j => j.id === jobId);
    if (!job) return;
    
    const container = document.getElementById('job-detail-content');
    if (!container) return;
    
    let tierColor = 'bg-slate-100 text-slate-500';
    if (job.membership_tier === 'GOLD') tierColor = 'bg-amber-400 text-slate-900 font-bold';
    else if (job.membership_tier === 'PLATINUM') tierColor = 'bg-slate-700 text-white font-bold';
    else if (job.membership_tier === 'DIAMOND') tierColor = 'bg-blue-600 text-white font-bold';

    const tagsHtml = job.customer_tags.map(tag => 
        `<span class="bg-partner-surface text-partner text-[9px] px-2.5 py-1 rounded font-black border border-partner/5 uppercase">${tag}</span>`
    ).join(' ');

    container.innerHTML = `
        <div class="pb-6">
            <!-- Header title -->
            <div class="flex items-start justify-between mb-4">
                <div>
                    <span class="text-[10px] font-black text-partner bg-partner-surface px-2.5 py-1 rounded-full uppercase tracking-wider">${translateType(job.type)}</span>
                    <h3 class="font-black text-slate-800 text-[18px] mt-2">${job.typeName}</h3>
                </div>
                <div class="text-right">
                    <span class="font-black text-[22px] text-partner">฿${job.credit_cost}</span>
                    <p class="text-[9.5px] text-slate-400 font-bold tracking-wide mt-0.5">ระยะทาง: ${job.distance}</p>
                </div>
            </div>

            <!-- Customer brief -->
            <div class="flex items-center gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100 mb-5">
                <div class="w-10 h-10 rounded-xl bg-white border flex items-center justify-center font-black text-partner text-md shadow-sm">
                    ${job.customer_name.charAt(3)}
                </div>
                <div>
                    <div class="flex items-center gap-1.5">
                        <h4 class="font-bold text-slate-800 text-[13px]">${job.customer_name}</h4>
                        <span class="text-[8px] px-1.5 py-0.5 rounded font-black uppercase ${tierColor}">${job.membership_tier}</span>
                    </div>
                    <p class="text-[11px] text-slate-400 font-bold flex items-center gap-0.5 mt-0.5">
                        <svg class="w-3 h-3 text-amber-400 fill-current" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>
                        ${job.customer_rating.toFixed(2)} • สมาชิกครอบครัว MaidBooking
                    </p>
                </div>
            </div>

            <!-- Tags -->
            <div class="flex flex-wrap gap-1.5 mb-5">
                ${tagsHtml}
            </div>

            <!-- Time and Place Details -->
            <div class="space-y-4 mb-6 bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                <div class="flex gap-3">
                    <div class="w-8 h-8 rounded-lg bg-partner-surface text-partner flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">เวลานัดหมายปฏิบัติงาน</p>
                        <p class="text-[13px] font-black text-slate-800 mt-0.5">${job.scheduled_at} (${job.party_size} ชั่วโมง)</p>
                    </div>
                </div>
                <div class="flex gap-3">
                    <div class="w-8 h-8 rounded-lg bg-partner-surface text-partner flex items-center justify-center shrink-0">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                    </div>
                    <div>
                        <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">สถานที่นัดหมาย</p>
                        <p class="text-[13px] font-black text-slate-800 mt-0.5">${job.location_name}</p>
                        <p class="text-[11px] text-slate-500 mt-1 leading-normal">${job.location_desc}</p>
                    </div>
                </div>
            </div>

            <!-- Notes/Instructions -->
            <div class="mb-6">
                <h4 class="font-black text-slate-800 text-[13px] mb-2">ข้อกำหนดเพิ่มเติมและคำแนะนำจากลูกค้า</h4>
                <div class="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 text-[12px] text-slate-600 leading-relaxed">
                    <span class="font-bold text-amber-800 block mb-1">💡 โน้ตจากลูกค้า:</span>
                    "${job.notes}"
                </div>
            </div>

            <!-- Route Mockup SVG -->
            <div class="mb-6">
                <h4 class="font-black text-slate-800 text-[13px] mb-2">การเดินทางและการนำทาง</h4>
                <div class="h-32 bg-slate-100 border rounded-2xl relative overflow-hidden flex items-center justify-center">
                    <!-- SVG map mockup -->
                    <svg class="absolute inset-0 w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                        <!-- roads -->
                        <path d="M 0,50 L 200,50 M 50,0 L 50,100 M 150,0 L 150,100" stroke="#fff" stroke-width="10" stroke-linecap="round"/>
                        <path d="M 0,50 L 200,50 M 50,0 L 50,100 M 150,0 L 150,100" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="4" stroke-linecap="round"/>
                        <!-- route line -->
                        <path d="M 50,80 L 50,50 L 150,50 L 150,25" fill="none" stroke="#3b82f6" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse"/>
                        <!-- icons -->
                        <circle cx="50" cy="80" r="8" fill="#1e40af" stroke="#fff" stroke-width="2"/>
                        <text x="50" y="83" font-size="8" font-family="sans-serif" font-weight="bold" fill="#fff" text-anchor="middle">คุณ</text>
                        
                        <circle cx="150" cy="25" r="8" fill="#ef4444" stroke="#fff" stroke-width="2"/>
                        <text x="150" y="28" font-size="8" font-family="sans-serif" font-weight="bold" fill="#fff" text-anchor="middle">📌</text>
                    </svg>
                    <div class="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                        ประมาณ 12 นาทีขับรถ
                    </div>
                </div>
            </div>

            <!-- Action buttons -->
            <div class="space-y-2.5">
                <button onclick="acceptJobFromSheet('${job.id}')" class="w-full bg-partner text-white font-black text-[14px] py-4 rounded-xl shadow-glow-blue btn-press">
                    ยืนยันกดรับงาน (ค่าจ้าง ฿${job.credit_cost})
                </button>
                <button onclick="closeJobDetailSheet()" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold text-[12px] py-3 rounded-xl transition-all btn-press">
                    ปิดหน้าต่าง
                </button>
            </div>
        </div>
    `;

    document.getElementById('sheet-overlay').classList.remove('hidden');
    document.getElementById('job-detail-sheet').classList.add('open');
};

window.closeJobDetailSheet = function() {
    document.getElementById('sheet-overlay').classList.add('hidden');
    document.getElementById('job-detail-sheet').classList.remove('open');
};

// ── Accept Job Process ──
window.quickAcceptJob = function(jobId) {
    acceptJobFromSheet(jobId);
};

async function acceptJobFromSheet(jobId) {
    closeJobDetailSheet();
    
    // Find job details
    const job = mockJobs.find(j => j.id === jobId);
    if (!job) return;

    if (useLocalMock) {
        showToast("รับงานสำเร็จ! อัปเดตตารางและเตรียมเดินทางได้เลย", "success");
        // Save to localStorage
        localStorage.setItem('momo_active_job', JSON.stringify(job));
        
        // Remove from available jobs mock list
        const index = mockJobs.findIndex(j => j.id === jobId);
        if (index > -1) mockJobs.splice(index, 1);
        
        loadSimulatedActiveJob(job);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/maids/jobs/${jobId}/accept`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        if (res.ok) {
            const resp = await res.json();
            showToast("รับงานสำเร็จ!", "success");
            
            // Sync with backend structure
            const activeJob = {
                ...job,
                id: jobId,
                customer_name: resp.customer_name || job.customer_name,
                customer_phone: resp.customer_phone || "099-999-9999"
            };
            localStorage.setItem('momo_active_job', JSON.stringify(activeJob));
            
            loadSimulatedActiveJob(activeJob);
        } else {
            throw new Error("งานนี้อาจมีผู้รับไปแล้ว");
        }
    } catch (e) {
        showToast("รับงานไม่สำเร็จ: " + e.message, "error");
        enableLocalMockMode(); // Fallback
    }
}

// ── Loaded Active Job Simulation ──
function loadSimulatedActiveJob(job) {
    currentActiveJobId = job.id;
    currentCustomerPhone = job.customer_phone || "099-999-9999";
    
    // Switch to active job sub-tab
    switchJobSubTab('active');
    
    // Show active dot in sub-tab
    document.getElementById('active-jobs-dot').classList.remove('hidden');
}

function renderActiveJobView() {
    const container = document.getElementById('active-job-details-container');
    if (!container) return;

    const savedActiveJob = localStorage.getItem('momo_active_job');
    if (!savedActiveJob) {
        document.getElementById('active-jobs-dot').classList.add('hidden');
        container.innerHTML = `
            <div class="bg-white rounded-[24px] p-8 text-center border border-slate-100 shadow-premium mt-4">
                <div class="w-14 h-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-7 h-7" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <p class="font-bold text-slate-700 text-sm mb-1">ยังไม่มีงานที่รับไว้ในขณะนี้</p>
                <p class="text-xs text-slate-400 leading-normal">คุณสามารถเปิดตารางพร้อมรับงานด่วนเพื่อรับการโพสต์แจ้งเตือนจับคู่ได้ตลอดเวลา</p>
            </div>
        `;
        return;
    }

    const job = JSON.parse(savedActiveJob);
    
    // Check what step of job we are at. Step is saved in localStorage
    let currentStep = parseInt(localStorage.getItem('momo_active_step') || '1');
    
    let step1Class = "bg-partner";
    let step2Class = currentStep >= 2 ? "bg-partner" : "bg-slate-300";
    let step3Class = currentStep >= 3 ? "bg-partner" : "bg-slate-300";
    let step4Class = currentStep >= 4 ? "bg-partner" : "bg-slate-300";

    let stepText = "กำลังเดินทางไปพบลูกค้า";
    let actionBtnHtml = `<button onclick="advanceActiveStep(2)" class="w-full bg-partner text-white font-black text-[14px] py-4 rounded-xl btn-press shadow-glow-blue">ฉันมาถึงสถานที่นัดหมายแล้ว</button>`;
    
    if (currentStep === 2) {
        stepText = "มาถึงสถานที่นัดหมายแล้ว";
        actionBtnHtml = `
            <div class="grid grid-cols-2 gap-2">
                <button onclick="advanceActiveStep(3)" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-4 rounded-xl btn-press shadow-md">
                    เริ่มปฏิบัติการทำความสะอาด
                </button>
                <button onclick="openChatModal()" class="w-full bg-slate-800 text-white font-bold text-xs py-4 rounded-xl btn-press flex items-center justify-center gap-1.5 shadow-sm">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                    แชทติดต่อลูกค้า
                </button>
            </div>
        `;
    } else if (currentStep === 3) {
        stepText = "กำลังปฏิบัติงาน...";
        startJobTimer();
        actionBtnHtml = `
            <div class="mb-4">
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">เช็คลิสต์งานย่อยที่ต้องทำ</p>
                <div class="bg-slate-50 border rounded-2xl p-4 space-y-3 text-xs text-slate-600">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked class="w-4 h-4 rounded text-partner focus:ring-partner border-slate-200">
                        <span>ปัดฝุ่นและกวาดหยากไย่รอบห้อง</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked class="w-4 h-4 rounded text-partner focus:ring-partner border-slate-200">
                        <span>เช็ดฝุ่นตามตู้ เตียง และขอบหน้าต่าง</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" class="w-4 h-4 rounded text-partner focus:ring-partner border-slate-200" id="checklist-3" onchange="checkCompleteStatusReady()">
                        <span>ถูพื้นห้องรับแขกและห้องครัว</span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" class="w-4 h-4 rounded text-partner focus:ring-partner border-slate-200" id="checklist-4" onchange="checkCompleteStatusReady()">
                        <span>ขัดพื้นและทำความสะอาดสุขภัณฑ์ในห้องน้ำ</span>
                    </label>
                </div>
            </div>
            <button id="complete-job-final-btn" disabled onclick="completeActiveJob()" class="w-full bg-slate-200 text-slate-400 font-black text-[14px] py-4 rounded-xl cursor-not-allowed transition-all">
                เสร็จสิ้นและส่งมอบงาน (฿${job.credit_cost})
            </button>
        `;
    }

    container.innerHTML = `
        <div class="bg-slate-900 rounded-[28px] p-6 text-white shadow-xl relative overflow-hidden mt-4 animate-fade-in pop-in">
            <div class="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-xl -mr-10 -mt-10"></div>
            
            <div class="relative z-10">
                <div class="flex items-center justify-between mb-3">
                    <span class="bg-partner/40 text-partner-light border border-partner/20 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">${stepText}</span>
                    <span class="font-bold text-xs" id="active-job-timer-display">${currentStep === 3 ? '00:00:00' : job.scheduled_at}</span>
                </div>
                
                <h4 class="font-black text-[20px] mb-1 leading-snug">${job.location_name}</h4>
                <p class="text-[11px] text-slate-400 mb-6">ผู้จอง: ${job.customer_name} • ${translateType(job.type)}</p>
                
                <!-- Progress bar timeline -->
                <div class="grid grid-cols-4 gap-2 mb-2">
                    <div class="h-1.5 ${step1Class} rounded-full transition-all duration-300"></div>
                    <div class="h-1.5 ${step2Class} rounded-full transition-all duration-300"></div>
                    <div class="h-1.5 ${step3Class} rounded-full transition-all duration-300"></div>
                    <div class="h-1.5 ${step4Class} rounded-full transition-all duration-300"></div>
                </div>
                <div class="flex justify-between text-[8px] font-black text-slate-400 uppercase tracking-widest mb-6">
                    <span>1. เดินทาง</span>
                    <span>2. ถึงจุดงาน</span>
                    <span>3. เริ่มล้าง</span>
                    <span>4. เสร็จสิ้น</span>
                </div>

                <!-- Call and Chat buttons always available for safety -->
                <div class="flex gap-2 mb-6 pt-4 border-t border-white/5">
                    <a href="tel:${currentCustomerPhone}" class="flex-1 bg-white/10 hover:bg-white/15 text-white font-bold text-xs py-3 rounded-xl border border-white/10 flex items-center justify-center gap-1 btn-press">
                        📞 โทรหาลูกค้า
                    </a>
                    <button onclick="cancelActiveJobSim()" class="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs px-4 py-3 rounded-xl border border-rose-500/10 transition-all btn-press">
                        ยกเลิกงาน
                    </button>
                </div>

                <!-- Step actions area -->
                <div class="bg-white rounded-2xl p-4 text-slate-800 shadow-inner">
                    ${actionBtnHtml}
                </div>
            </div>
        </div>
    `;
}

window.checkCompleteStatusReady = function() {
    const check3 = document.getElementById('checklist-3');
    const check4 = document.getElementById('checklist-4');
    const btn = document.getElementById('complete-job-final-btn');
    
    if (check3 && check4 && btn) {
        if (check3.checked && check4.checked) {
            btn.disabled = false;
            btn.className = "w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[14px] py-4 rounded-xl cursor-pointer btn-press shadow-md transition-all";
        } else {
            btn.disabled = true;
            btn.className = "w-full bg-slate-200 text-slate-400 font-black text-[14px] py-4 rounded-xl cursor-not-allowed transition-all";
        }
    }
};

window.advanceActiveStep = async function(stepNum) {
    if (useLocalMock) {
        localStorage.setItem('momo_active_step', stepNum.toString());
        renderActiveJobView();
        
        if (stepNum === 2) {
            showToast("คุณเดินทางมาถึงแล้ว ถ่ายรูปหรือแจ้งเปิดงานได้เลย", "success");
        } else if (stepNum === 3) {
            showToast("เริ่มจับเวลาการทำความสะอาดล้างบ้าน", "success");
        }
        return;
    }

    // Call backend API status
    try {
        const statuses = { 2: 'ARRIVED', 3: 'IN_PROGRESS', 4: 'COMPLETED' };
        const res = await fetch(`${API_BASE}/bookings/${currentActiveJobId}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}` 
            },
            body: JSON.stringify({ status: statuses[stepNum] })
        });
        
        if (res.ok) {
            localStorage.setItem('momo_active_step', stepNum.toString());
            renderActiveJobView();
        } else {
            showToast("อัปเดตสถานะงานล้มเหลว", "error");
        }
    } catch (e) {
        // Fallback
        localStorage.setItem('momo_active_step', stepNum.toString());
        renderActiveJobView();
    }
};

function startJobTimer() {
    if (jobTimerInterval) clearInterval(jobTimerInterval);
    jobTimerSeconds = 0;
    
    jobTimerInterval = setInterval(() => {
        jobTimerSeconds++;
        const hrs = Math.floor(jobTimerSeconds / 3600).toString().padStart(2, '0');
        const mins = Math.floor((jobTimerSeconds % 3600) / 60).toString().padStart(2, '0');
        const secs = (jobTimerSeconds % 60).toString().padStart(2, '0');
        
        const display = document.getElementById('active-job-timer-display');
        if (display) {
            display.textContent = `เวลาทำความสะอาด: ${hrs}:${mins}:${secs}`;
        }
    }, 1000);
}

window.cancelActiveJobSim = function() {
    if (confirm("คุณแน่ใจหรือไม่ที่จะยกเลิกงานนี้? การยกเลิกงานนาทีสุดท้ายอาจส่งผลกระทบต่อระดับคะแนน Pro ของคุณ")) {
        if (jobTimerInterval) clearInterval(jobTimerInterval);
        localStorage.removeItem('momo_active_job');
        localStorage.removeItem('momo_active_step');
        showToast("ยกเลิกงานเรียบร้อย กลับคืนสู่โหมดว่าง", "info");
        switchJobSubTab('available');
    }
};

window.completeActiveJob = async function() {
    if (jobTimerInterval) clearInterval(jobTimerInterval);
    
    const savedActiveJob = localStorage.getItem('momo_active_job');
    if (!savedActiveJob) return;
    
    const job = JSON.parse(savedActiveJob);
    const payout = job.credit_cost;

    if (useLocalMock) {
        triggerLocalCompletion(job, payout);
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/bookings/${currentActiveJobId}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}` 
            },
            body: JSON.stringify({ status: 'COMPLETED' })
        });
        
        if (res.ok) {
            triggerLocalCompletion(job, payout);
        } else {
            showToast("ล้มเหลวในการจบงานจากเซิร์ฟเวอร์ บันทึกจบงานแบบออฟไลน์", "warning");
            triggerLocalCompletion(job, payout);
        }
    } catch (e) {
        triggerLocalCompletion(job, payout);
    }
};

function triggerLocalCompletion(job, payout) {
    // Deduct and save state
    const currentBal = parseFloat(localStorage.getItem('momo_wallet_balance') || '2450');
    const newBal = currentBal + payout;
    localStorage.setItem('momo_wallet_balance', newBal.toString());

    const completedCount = parseInt(localStorage.getItem('momo_jobs_completed') || '142') + 1;
    localStorage.setItem('momo_jobs_completed', completedCount.toString());

    // Save transaction
    const txs = JSON.parse(localStorage.getItem('momo_transactions') || '[]');
    txs.unshift({
        type: 'JOB_PAYOUT',
        amount: payout,
        title: `รายได้จากงาน ${job.customer_name}`,
        date: 'เมื่อสักครู่นี้'
    });
    localStorage.setItem('momo_transactions', JSON.stringify(txs));

    // Save history
    const history = JSON.parse(localStorage.getItem('momo_completed_jobs') || '[]');
    history.unshift({
        id: "h-" + Date.now(),
        type: job.type,
        typeName: job.typeName,
        location_name: job.location_name,
        customer_name: job.customer_name,
        date: "วันนี้, " + job.scheduled_at,
        payout: payout,
        rating: 5,
        comment: "ปฏิบัติงานตรงใจมาก รวดเร็วทันเวลา"
    });
    localStorage.setItem('momo_completed_jobs', JSON.stringify(history));

    // Clean active job states
    localStorage.removeItem('momo_active_job');
    localStorage.removeItem('momo_active_step');
    currentActiveJobId = null;

    // Show success overlay
    document.getElementById('success-reward-payout').textContent = `+฿${payout.toLocaleString()}.00`;
    document.getElementById('success-overlay').classList.remove('hidden');
    
    // Sync UI
    if (currentMaidData) {
        currentMaidData.job_completed = completedCount;
        populateProfileUI(currentMaidData);
    }
}

window.dismissSuccessOverlay = function() {
    document.getElementById('success-overlay').classList.add('hidden');
    switchJobSubTab('available');
    switchView('jobs');
};

// ── Schedule Management Tab ──
function updateScheduleUI() {
    const container = document.getElementById('schedule-days-list');
    if (!container) return;
    
    // Sync toggle checkbox
    const vacToggle = document.getElementById('vacation-toggle');
    if (vacToggle) {
        vacToggle.checked = vacationMode;
    }
    
    const defaultSchedule = {
        monday: { morning: true, afternoon: true, evening: false },
        tuesday: { morning: true, afternoon: false, evening: false },
        wednesday: { morning: true, afternoon: true, evening: true },
        thursday: { morning: false, afternoon: true, evening: false },
        friday: { morning: true, afternoon: true, evening: false },
        saturday: { morning: false, afternoon: false, evening: false },
        sunday: { morning: false, afternoon: false, evening: false }
    };
    
    let schedule = {};
    try {
        const stored = localStorage.getItem('momo_schedule');
        if (stored && stored !== '{}') {
            schedule = JSON.parse(stored);
        }
    } catch (e) {
        console.error("Failed to parse momo_schedule", e);
    }
    
    if (Object.keys(schedule).length === 0) {
        schedule = defaultSchedule;
        localStorage.setItem('momo_schedule', JSON.stringify(defaultSchedule));
    }
    
    const dayNamesTH = {
        monday: 'จันทร์',
        tuesday: 'อังคาร',
        wednesday: 'พุธ',
        thursday: 'พฤหัสฯ',
        friday: 'ศุกร์',
        saturday: 'เสาร์',
        sunday: 'อาทิตย์'
    };

    container.innerHTML = '';
    
    Object.keys(dayNamesTH).forEach(day => {
        const slots = schedule[day] || { morning: false, afternoon: false, evening: false };
        
        const mClass = slots.morning && !vacationMode ? 'schedule-slot-active' : 'schedule-slot-inactive';
        const aClass = slots.afternoon && !vacationMode ? 'schedule-slot-active' : 'schedule-slot-inactive';
        const eClass = slots.evening && !vacationMode ? 'schedule-slot-active' : 'schedule-slot-inactive';

        const row = document.createElement('div');
        row.className = "grid grid-cols-4 gap-2 items-center text-center min-w-0";
        row.innerHTML = `
            <span class="text-left font-black text-slate-700 text-[10px] xs:text-xs truncate" title="${dayNamesTH[day]}">${dayNamesTH[day]}</span>
            <button onclick="toggleScheduleSlot('${day}', 'morning')" class="py-2.5 px-0.5 text-[10px] xs:text-[11px] font-bold rounded-xl transition-all btn-press truncate ${mClass}" ${vacationMode ? 'disabled' : ''}>
                ${slots.morning && !vacationMode ? 'เปิด' : 'ปิด'}
            </button>
            <button onclick="toggleScheduleSlot('${day}', 'afternoon')" class="py-2.5 px-0.5 text-[10px] xs:text-[11px] font-bold rounded-xl transition-all btn-press truncate ${aClass}" ${vacationMode ? 'disabled' : ''}>
                ${slots.afternoon && !vacationMode ? 'เปิด' : 'ปิด'}
            </button>
            <button onclick="toggleScheduleSlot('${day}', 'evening')" class="py-2.5 px-0.5 text-[10px] xs:text-[11px] font-bold rounded-xl transition-all btn-press truncate ${eClass}" ${vacationMode ? 'disabled' : ''}>
                ${slots.evening && !vacationMode ? 'เปิด' : 'ปิด'}
            </button>
        `;
        container.appendChild(row);
    });

    // Populate upcoming jobs in schedule tab
    const upcomingContainer = document.getElementById('upcoming-jobs-schedule');
    if (upcomingContainer) {
        upcomingContainer.innerHTML = '';
        
        // Show active job if any, or seed a future mock job
        const savedActive = localStorage.getItem('momo_active_job');
        if (savedActive) {
            const job = JSON.parse(savedActive);
            upcomingContainer.innerHTML += `
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-slate-800 text-[13px]">${job.typeName}</h4>
                        <p class="text-[10px] text-slate-400 mt-1">${job.scheduled_at} • ${job.location_name}</p>
                    </div>
                    <span class="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">งานปัจจุบัน</span>
                </div>
            `;
        }
        
        upcomingContainer.innerHTML += `
            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex justify-between items-center">
                <div>
                    <h4 class="font-bold text-slate-800 text-[13px]">ทำความสะอาดทั่วไป (ทั่วไป)</h4>
                    <p class="text-[10px] text-slate-400 mt-1">มะรืนนี้, 09:00 - 11:00 • Condo KnightsBridge อ่อนนุช</p>
                </div>
                <span class="bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">ยืนยันแล้ว</span>
            </div>
        `;
    }
}

window.toggleScheduleSlot = function(day, slot) {
    if (vacationMode) return;
    
    const schedule = JSON.parse(localStorage.getItem('momo_schedule') || '{}');
    if (!schedule[day]) schedule[day] = { morning: false, afternoon: false, evening: false };
    
    schedule[day][slot] = !schedule[day][slot];
    localStorage.setItem('momo_schedule', JSON.stringify(schedule));
    
    showToast("อัปเดตสล็อตตารางให้บริการเรียบร้อย", "success");
    updateScheduleUI();
};

window.toggleVacationMode = function(checkbox) {
    vacationMode = checkbox.checked;
    localStorage.setItem('momo_vacation_mode', vacationMode);
    showToast(vacationMode ? "เปิดโหมดพักร้อน ปิดรับคิวงานทั้งหมดชั่วคราว" : "ปิดโหมดพักร้อน เปิดให้บริการตามตารางปกติ", "info");
    updateScheduleUI();
};

// ── Earnings tab ──
function updateEarningsUI() {
    const balance = parseFloat(localStorage.getItem('momo_wallet_balance') || '2450');
    
    const balDiv = document.getElementById('earnings-wallet-balance');
    if (balDiv) balDiv.textContent = `฿${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const maxWithdraw = document.getElementById('max-withdraw-label');
    if (maxWithdraw) maxWithdraw.textContent = balance.toLocaleString();

    // Sum weekly
    const txs = JSON.parse(localStorage.getItem('momo_transactions') || '[]');
    let weeklySum = 0;
    let jobCount = 0;
    
    txs.forEach(t => {
        if (t.type === 'JOB_PAYOUT') {
            weeklySum += t.amount;
            jobCount++;
        }
    });

    const totalDiv = document.getElementById('earnings-weekly-total');
    if (totalDiv) totalDiv.textContent = `฿${weeklySum.toLocaleString()}`;

    const countDiv = document.getElementById('earnings-weekly-jobs');
    if (countDiv) countDiv.textContent = `${jobCount} งาน`;

    // Render bar chart (mock columns heights)
    const chartContainer = document.getElementById('earnings-chart-container');
    if (chartContainer) {
        chartContainer.innerHTML = '';
        const dailyEarnings = [
            { day: 'จ.', amount: 550 },
            { day: 'อ.', amount: 0 },
            { day: 'พ.', amount: 750 },
            { day: 'พฤ.', amount: 0 },
            { day: 'ศ.', amount: 0 },
            { day: 'ส.', amount: 1200 },
            { day: 'อา.', amount: 550 }
        ];

        // Max scale for chart
        const maxVal = 1500;
        
        dailyEarnings.forEach(d => {
            const wrapper = document.createElement('div');
            wrapper.className = "flex flex-col items-center gap-1.5 flex-1";
            
            if (d.amount > 0) {
                const heightPct = Math.min((d.amount / maxVal) * 100, 100);
                wrapper.innerHTML = `
                    <span class="text-[9px] font-bold text-slate-400">฿${d.amount}</span>
                    <div class="chart-bar" style="height: ${heightPct}%; width: 18px;"></div>
                    <span class="text-[10px] font-bold text-slate-600">${d.day}</span>
                `;
            } else {
                wrapper.innerHTML = `
                    <div class="chart-bar-empty" style="width: 18px;"></div>
                    <span class="text-[10px] font-bold text-slate-400">${d.day}</span>
                `;
            }
            chartContainer.appendChild(wrapper);
        });
    }

    // Render transactions
    const txContainer = document.getElementById('transactions-container');
    if (txContainer) {
        txContainer.innerHTML = '';
        if (txs.length === 0) {
            txContainer.innerHTML = '<p class="text-xs text-slate-400 text-center py-4">ไม่มีประวัติรายการ</p>';
            return;
        }

        txs.forEach(t => {
            const isAdd = t.type === 'JOB_PAYOUT';
            const sign = isAdd ? '+' : '';
            const colorClass = isAdd ? 'text-emerald-500' : 'text-rose-500';
            const iconBg = isAdd ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500';
            
            const html = `
                <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0">
                            ${isAdd ? '📥' : '📤'}
                        </div>
                        <div>
                            <h4 class="font-bold text-slate-800 text-[12.5px]">${t.title}</h4>
                            <p class="text-[10px] text-slate-400 mt-0.5">${t.date}</p>
                        </div>
                    </div>
                    <span class="font-black text-sm ${colorClass}">${sign}฿${t.amount.toLocaleString()}</span>
                </div>
            `;
            txContainer.innerHTML += html;
        });
    }
}

// ── Withdrawal Modal Actions ──
window.openWithdrawModal = function() {
    const balance = parseFloat(localStorage.getItem('momo_wallet_balance') || '2450');
    if (balance <= 0) {
        showToast("คุณไม่มียอดคงเหลือสำหรับการถอนเงิน", "error");
        return;
    }
    document.getElementById('withdraw-amount-input').value = '';
    document.getElementById('withdraw-modal').classList.remove('hidden');
};

window.closeWithdrawModal = function() {
    document.getElementById('withdraw-modal').classList.add('hidden');
};

window.setMaxWithdraw = function() {
    const balance = parseFloat(localStorage.getItem('momo_wallet_balance') || '2450');
    document.getElementById('withdraw-amount-input').value = balance;
};

window.submitWithdraw = function() {
    const input = document.getElementById('withdraw-amount-input');
    const amount = parseFloat(input.value);
    const bank = document.getElementById('withdraw-bank-select').value;
    const balance = parseFloat(localStorage.getItem('momo_wallet_balance') || '2450');

    if (isNaN(amount) || amount <= 0) {
        showToast("กรุณาระบุจำนวนเงินที่ถูกต้อง", "error");
        return;
    }
    if (amount < 100) {
        showToast("ถอนเงินขั้นต่ำ 100 บาท", "error");
        return;
    }
    if (amount > balance) {
        showToast("ยอดเงินของคุณไม่เพียงพอสำหรับการถอนเงิน", "error");
        return;
    }

    // Process
    const newBal = balance - amount;
    localStorage.setItem('momo_wallet_balance', newBal.toString());

    // Log Tx
    const txs = JSON.parse(localStorage.getItem('momo_transactions') || '[]');
    txs.unshift({
        type: 'WITHDRAW',
        amount: amount,
        title: `ถอนเงินเข้าบัญชี ${bank}`,
        date: 'เมื่อสักครู่นี้'
    });
    localStorage.setItem('momo_transactions', JSON.stringify(txs));

    closeWithdrawModal();
    showToast(`ส่งเรื่องถอนเงิน ฿${amount.toLocaleString()} สำเร็จแล้ว!`, "success");
    
    updateEarningsUI();
    
    // Quick refresh jobs tab balance summary too
    if (currentMaidData) {
        populateProfileUI(currentMaidData);
    }
};

// ── Account profile tab ──
function updateAccountUI() {
    if (!currentMaidData) return;
    
    document.getElementById('profile-name-full').textContent = currentMaidData.full_name;
    document.getElementById('profile-phone-full').textContent = `โทร: ${currentMaidData.phone_number || '081-234-5678'}`;
    document.getElementById('profile-tier-text').textContent = `${currentMaidData.tier} PRO`;

    // Render skills
    const skillsContainer = document.getElementById('account-skills-list');
    if (skillsContainer) {
        skillsContainer.innerHTML = '';
        currentMaidData.skills.forEach(s => {
            const pct = (s.level / 5) * 100;
            const skillName = translateType(s.skill);
            
            const item = document.createElement('div');
            item.innerHTML = `
                <div class="flex justify-between items-center mb-1">
                    <div class="flex items-center gap-1.5">
                        <span class="text-[13px] font-bold text-slate-800">${skillName}</span>
                        <span class="bg-partner-surface text-partner text-[8px] font-black px-1.5 py-0.5 rounded">ระดับ ${s.level}/5</span>
                    </div>
                    <span class="text-[10px] text-emerald-500 font-bold">ผ่านเกณฑ์แล้ว</span>
                </div>
                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div class="bg-partner h-full rounded-full" style="width: ${pct}%"></div>
                </div>
            `;
            skillsContainer.appendChild(item);
        });
    }

    // Render reviews
    const reviewsContainer = document.getElementById('profile-reviews-container');
    if (reviewsContainer) {
        reviewsContainer.innerHTML = '';
        const history = JSON.parse(localStorage.getItem('momo_completed_jobs') || '[]');
        
        history.forEach(h => {
            if (!h.comment) return;
            
            const item = document.createElement('div');
            item.className = "bg-white rounded-2xl p-4 border border-slate-100 shadow-sm";
            item.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-bold text-slate-800 text-[12.5px]">${h.customer_name}</h4>
                    <div class="flex text-amber-400">
                        ${'★'.repeat(h.rating)}${'☆'.repeat(5-h.rating)}
                    </div>
                </div>
                <p class="text-[11.5px] text-slate-500 leading-normal italic">"${h.comment}"</p>
                <div class="flex justify-between items-center mt-2 border-t border-slate-50 pt-2 text-[9px] text-slate-400 font-bold">
                    <span>${translateType(h.type)}</span>
                    <span>${h.date.split('•')[0]}</span>
                </div>
            `;
            reviewsContainer.appendChild(item);
        });
    }
}

// ── Onboarding pre-test Quiz flow ──
window.showQuizQuestions = function() {
    document.getElementById('quiz-intro').style.display = 'none';
    document.getElementById('quiz-question-container').classList.remove('hidden');
    document.getElementById('quiz-question-container').classList.add('flex');
    
    quizCurrentStep = 0;
    quizScore = 0;
    loadQuizQuestion();
    
    // Quiz timer
    quizTimerVal = 0;
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    quizTimerInterval = setInterval(() => {
        quizTimerVal++;
        const mins = Math.floor(quizTimerVal / 60).toString().padStart(2, '0');
        const secs = (quizTimerVal % 60).toString().padStart(2, '0');
        document.getElementById('quiz-timer').textContent = `เวลา: ${mins}:${secs}`;
    }, 1000);
};

function loadQuizQuestion() {
    quizSelectedAnswer = null;
    document.getElementById('quiz-next-btn').disabled = true;
    document.getElementById('quiz-next-btn').className = "w-full mt-6 bg-slate-200 text-slate-400 font-bold py-4 rounded-xl cursor-not-allowed transition-all";

    const q = quizQuestions[quizCurrentStep];
    document.getElementById('quiz-progress-text').textContent = `คำถามข้อที่ ${quizCurrentStep + 1} จาก 3`;
    document.getElementById('quiz-progress-bar').style.width = `${((quizCurrentStep + 1) / 3) * 100}%`;
    document.getElementById('quiz-question-title').textContent = q.question;

    const optContainer = document.getElementById('quiz-options-container');
    optContainer.innerHTML = '';

    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-[13px] font-medium text-slate-700 hover:border-partner/20 transition-all flex items-start gap-3";
        btn.onclick = () => selectQuizOption(btn, index);
        btn.innerHTML = `
            <div class="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center shrink-0 text-[10px] font-black text-white mt-0.5" id="opt-radio-${index}">
            </div>
            <span>${opt.text}</span>
        `;
        optContainer.appendChild(btn);
    });
}

function selectQuizOption(btn, index) {
    quizSelectedAnswer = index;
    
    // Reset other options style
    document.querySelectorAll('#quiz-options-container button').forEach(b => {
        b.className = "w-full text-left bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-[13px] font-medium text-slate-700 hover:border-partner/20 transition-all flex items-start gap-3";
    });
    document.querySelectorAll('#quiz-options-container button div').forEach(d => {
        d.className = "w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center shrink-0 text-[10px] font-black text-white mt-0.5";
        d.innerHTML = "";
    });

    // Mark current
    btn.className = "w-full text-left bg-partner-surface border border-partner p-4 rounded-2xl text-[13px] font-bold text-partner transition-all flex items-start gap-3";
    const radio = document.getElementById(`opt-radio-${index}`);
    radio.className = "w-5 h-5 rounded-full border border-partner bg-partner flex items-center justify-center shrink-0 text-[10px] font-black text-white mt-0.5";
    radio.innerHTML = "✓";

    // Enable next button
    const nextBtn = document.getElementById('quiz-next-btn');
    nextBtn.disabled = false;
    nextBtn.className = "w-full mt-6 bg-partner text-white font-bold py-4 rounded-xl cursor-pointer btn-press shadow-glow-blue transition-all";
}

window.handleQuizNext = function() {
    const q = quizQuestions[quizCurrentStep];
    if (q.options[quizSelectedAnswer].correct) {
        quizScore++;
    }

    quizCurrentStep++;
    if (quizCurrentStep < quizQuestions.length) {
        loadQuizQuestion();
    } else {
        showQuizResult();
    }
};

function showQuizResult() {
    if (quizTimerInterval) clearInterval(quizTimerInterval);
    document.getElementById('quiz-question-container').style.display = 'none';
    document.getElementById('quiz-result-page').classList.remove('hidden');
    document.getElementById('quiz-result-page').classList.add('flex');

    const scorePct = (quizScore / 3) * 100;
    const isPassed = quizScore === 3; // Must be 100% correct

    const icon = document.getElementById('quiz-result-icon');
    const title = document.getElementById('quiz-result-title');
    const desc = document.getElementById('quiz-result-desc');
    const failDetails = document.getElementById('quiz-fail-details');
    const actionBtn = document.getElementById('quiz-result-action-btn');

    if (isPassed) {
        icon.className = "w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-emerald-500/20 animate-bounce";
        icon.innerHTML = `<svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="3.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>`;
        title.textContent = "สอบผ่านแบบทดสอบ!";
        desc.textContent = "คุณได้คะแนนเต็ม 3/3 ข้อ ทักษะความปลอดภัยของคุณตรงตามเงื่อนไข ยินดีต้อนรับสู่ครอบครัว MaidBooking";
        failDetails.classList.add('hidden');
        
        actionBtn.textContent = "เปิดใช้งานบัญชีผู้ให้บริการ";
        actionBtn.onclick = startOnboarding;
    } else {
        icon.className = "w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-6 text-white shadow-lg shadow-rose-500/20";
        icon.innerHTML = `<svg class="w-10 h-10" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
        title.textContent = "แบบทดสอบยังไม่ผ่าน";
        desc.textContent = `คุณทำคะแนนได้ ${quizScore}/3 ข้อ (ต้องได้คะแนน 3/3 เพื่อผ่านการอนุมัติ)`;
        
        // Show correct explanation for the ones likely missed
        failDetails.classList.remove('hidden');
        document.getElementById('quiz-fail-text').innerHTML = quizQuestions.map((q, i) => `<b>ข้อที่ ${i+1}:</b> ${q.explanation}`).join('<br><br>');
        
        actionBtn.textContent = "ลองทำข้อสอบอีกครั้ง";
        actionBtn.onclick = retryQuiz;
    }
}

window.retryQuiz = function() {
    document.getElementById('quiz-result-page').style.display = 'none';
    document.getElementById('quiz-result-page').classList.add('hidden');
    showQuizQuestions();
};

async function startOnboarding() {
    let profileName = "คุณสมศรี ใจดี";
    let profilePic = "";
    
    try {
        const profile = await liff.getProfile();
        profileName = profile.displayName;
        profilePic = profile.pictureUrl;
    } catch(e) {
        console.log("Not in LIFF environment, using default mock details");
    }

    const payload = {
        full_name: profileName,
        phone_number: "0812345678",
        profile_picture_url: profilePic,
        skills: [
            { skill: "GENERAL_CLEANING", level: 5 },
            { skill: "IRONING", level: 4 }
        ],
        test_score: 100,
        base_rate: 550,
        demographics: {}
    };

    if (useLocalMock) {
        localStorage.setItem('momo_maid_token', 'mock_token');
        showToast("ยินดีต้อนรับเข้าสู่ระบบ MaidBooking!", "success");
        enableLocalMockMode();
        return;
    }

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
            showToast("ยินดีต้อนรับเข้าสู่ระบบ MaidBooking!", "success");
            await checkMaidProfile();
        } else {
            enableLocalMockMode();
        }
    } catch (e) {
        console.error("Onboarding API error, logging into local mock mode:", e);
        enableLocalMockMode();
    }
}

// ── Auto Accept matching simulation ──
window.toggleAutoAccept = function(checkbox) {
    if (checkbox.checked) {
        showToast("เปิดโหมดรับงานด่วนอัตโนมัติแล้ว กำลังค้นหางาน...", "success");
        
        // Start simulation loop
        autoAcceptInterval = setTimeout(() => {
            // Find a mock job and accept it immediately
            if (mockJobs.length > 0) {
                const targetJob = mockJobs[0];
                showToast(`[Auto-Match] จับคู่งานสำเร็จ! รับงานกับ ${targetJob.customer_name} โดยอัตโนมัติ`, "success");
                acceptJobFromSheet(targetJob.id);
            } else {
                showToast("ไม่พบงานใหม่ในรัศมีของคุณขณะนี้", "info");
                checkbox.checked = false;
            }
        }, 6000);
    } else {
        if (autoAcceptInterval) {
            clearTimeout(autoAcceptInterval);
            autoAcceptInterval = null;
        }
        showToast("ปิดโหมดรับงานด่วนอัตโนมัติ", "info");
    }
};

// ── Mock Chat Modal ──
let chatMessages = [];
window.openChatModal = function() {
    // Inject chat modal markup if not exists
    if (!document.getElementById('chat-modal')) {
        const modal = document.createElement('div');
        modal.id = 'chat-modal';
        modal.className = "fixed inset-0 z-50 flex items-center justify-center px-4 hidden";
        modal.innerHTML = `
            <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onclick="closeChatModal()"></div>
            <div class="bg-white rounded-3xl w-full max-w-[360px] h-[450px] shadow-2xl relative z-10 flex flex-col pop-in">
                <!-- Chat header -->
                <div class="bg-partner p-4 rounded-t-3xl text-white flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold text-white" id="chat-header-avatar">ค</div>
                        <div>
                            <h3 class="font-bold text-[13px]" id="chat-header-name">ลูกค้า</h3>
                            <p class="text-[9px] text-emerald-400">ออนไลน์อยู่</p>
                        </div>
                    </div>
                    <button onclick="closeChatModal()" class="text-white/60 hover:text-white font-bold text-xs p-1">ปิด</button>
                </div>
                <!-- Chat body messages -->
                <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50" id="chat-messages-body">
                    <!-- Messages here -->
                </div>
                <!-- Chat footer input -->
                <div class="p-3 border-t bg-white rounded-b-3xl flex gap-2">
                    <input type="text" id="chat-input-field" class="flex-1 bg-slate-100 focus:bg-slate-50 focus:outline-none px-4 py-2.5 rounded-full text-xs" placeholder="พิมพ์ข้อความที่นี่..." onkeypress="handleChatEnter(event)">
                    <button onclick="sendChatMessage()" class="bg-partner text-white font-bold text-xs px-4 py-2.5 rounded-full btn-press shadow-glow-blue shrink-0">ส่ง</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Load customer name
    const savedActive = localStorage.getItem('momo_active_job');
    if (savedActive) {
        const job = JSON.parse(savedActive);
        document.getElementById('chat-header-name').textContent = job.customer_name;
        document.getElementById('chat-header-avatar').textContent = job.customer_name.charAt(3);
    }
    
    // Seed initial message if empty
    const body = document.getElementById('chat-messages-body');
    body.innerHTML = '';
    
    chatMessages = [
        { sender: 'customer', text: 'สวัสดีค่ะพี่แม่บ้าน เดินทางมาถึงหรือยังคะ?', time: 'เมื่อสักครู่' }
    ];
    renderChatMessages();

    document.getElementById('chat-modal').classList.remove('hidden');
};

window.closeChatModal = function() {
    document.getElementById('chat-modal').classList.add('hidden');
};

window.handleChatEnter = function(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
};

window.sendChatMessage = function() {
    const input = document.getElementById('chat-input-field');
    const text = input.value.trim();
    if (!text) return;
    
    chatMessages.push({ sender: 'me', text: text, time: 'เมื่อสักครู่' });
    input.value = '';
    renderChatMessages();
    
    // Simulated auto-reply
    setTimeout(() => {
        let reply = "โอเคค่ะ รับทราบค่ะ เดี๋ยวเจอกันค่ะ";
        if (text.includes("ถึง") || text.includes("กม")) {
            reply = "ยินดีค่ะ เดินทางระมัดระวังนะคะ ห้องเปิดแอร์รอไว้ให้แล้วค่ะ";
        } else if (text.includes("ล้าง") || text.includes("ฝุ่น")) {
            reply = "รบกวนเน้นบริเวณหลังตู้เก็บของและห้องรับแขกให้หน่อยนะคะ ขอบคุณค่ะ";
        }
        
        chatMessages.push({ sender: 'customer', text: reply, time: 'เมื่อสักครู่' });
        renderChatMessages();
        
        // play simple tick sound or scroll
        const body = document.getElementById('chat-messages-body');
        body.scrollTop = body.scrollHeight;
    }, 1500);
};

function renderChatMessages() {
    const body = document.getElementById('chat-messages-body');
    body.innerHTML = '';
    
    chatMessages.forEach(msg => {
        const isMe = msg.sender === 'me';
        const outerClass = isMe ? 'justify-end' : 'justify-start';
        const bubbleClass = isMe ? 'bg-partner text-white rounded-br-none rounded-2xl' : 'bg-white border text-slate-800 rounded-bl-none rounded-2xl';
        
        const row = document.createElement('div');
        row.className = `flex ${outerClass} w-full`;
        row.innerHTML = `
            <div class="max-w-[75%] p-3 text-xs leading-normal shadow-sm ${bubbleClass}">
                <p>${msg.text}</p>
                <span class="text-[8px] text-right block mt-1 ${isMe ? 'text-white/60' : 'text-slate-400'}">${msg.time}</span>
            </div>
        `;
        body.appendChild(row);
    });
    
    body.scrollTop = body.scrollHeight;
}

window.showToast = function(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = '';
    if (type === 'success') icon = `<svg class="w-5 h-5 text-emerald-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"></path></svg>`;
    else if (type === 'error') icon = `<svg class="w-5 h-5 text-red-500 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>`;
    else icon = `<svg class="w-5 h-5 text-partner shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;

    toast.innerHTML = `${icon}<span class="text-[12px] font-bold tracking-wide text-white">${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3200);
};
