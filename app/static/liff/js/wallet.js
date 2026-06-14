async function initWallet() {
    // Payment system is not live yet.
    // Show a static page explaining that credit top‑up will be available in the next phase.
    const balanceEl = document.getElementById('wallet-balance');
    if (balanceEl) {
        balanceEl.textContent = 'N/A';
    }
    const container = document.getElementById('transactions-container');
    if (container) {
        container.innerHTML = '<p class="text-center text-ink-muted text-[13px] py-8">The payment system is under development. Credit top‑up will be available soon.</p>';
    }
    if (typeof hideLoading === 'function') hideLoading();
}

document.addEventListener("DOMContentLoaded", () => {
    initWallet();
});
