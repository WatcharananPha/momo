async function initWallet() {
    console.log("Initializing Wallet...");
    try {
        await initCoreLiff(true);
        await updateWalletData();
    } catch (e) {
        console.error("Wallet Init Error:", e);
    } finally {
        // Ensure loading is hidden even if data fetch fails
        if (typeof hideLoading === 'function') hideLoading();
    }
}

async function updateWalletData() {
    const balanceEl = document.getElementById('wallet-balance');
    if (!balanceEl) return;

    try {
        const data = await fetchWalletAndPoints();
        if (data && data.wallet !== undefined) {
            balanceEl.textContent = data.wallet.toLocaleString();
        } else {
            balanceEl.textContent = "0";
        }
        
        // Load Transactions
        const transactions = await fetchCreditHistory();
        renderTransactions(transactions);
    } catch (e) {
        console.error("Update Wallet Data Error:", e);
        balanceEl.textContent = "Error";
    }
}

function renderTransactions(txs) {
    const container = document.getElementById('transactions-container');
    if (!container) return;
    
    if (!txs || txs.length === 0) {
        container.innerHTML = '<p class="text-center text-ink-muted text-[13px] py-8">No recent transactions found.</p>';
        return;
    }
    
    container.innerHTML = '';
    txs.forEach((tx, idx) => {
        const isDebit = tx.amount < 0;
        const amountClass = isDebit ? 'text-red-500' : 'text-brand';
        const sign = isDebit ? '' : '+';
        let dateStr = "Recent";
        try {
            dateStr = new Date(tx.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
        } catch(e) {}
        
        const html = `
            <div class="flex items-center justify-between py-1 animate-reveal" style="animation-delay: ${idx * 0.05}s">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 ${isDebit ? 'bg-brand-surface text-brand' : 'bg-blue-50 text-blue-500'} rounded-xl flex items-center justify-center">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            ${isDebit ? '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>' : '<polyline points="20 6 9 17 4 12"></polyline>'}
                        </svg>
                    </div>
                    <div>
                        <p class="font-bold text-[14px] text-ink leading-tight">${tx.type || 'Transaction'}</p>
                        <p class="text-[11px] text-ink-muted mt-0.5">${dateStr}</p>
                    </div>
                </div>
                <span class="font-black text-[14px] ${amountClass}">${sign}${Math.abs(tx.amount)} บาท</span>
            </div>
            ${idx < txs.length - 1 ? '<div class="w-full h-[1px] bg-gray-50/50"></div>' : ''}
        `;
        container.innerHTML += html;
    });
}

// Start
document.addEventListener("DOMContentLoaded", () => {
    initWallet();
});
