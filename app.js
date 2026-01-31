// ============================================================
// app.js — Product Dashboard
// API: https://api.escuelajs.co/api/v1/products
// ============================================================

const API_URL = 'https://api.escuelajs.co/api/v1/products';

// ── State ────────────────────────────────────────────────────
let allProducts   = [];       // toàn bộ dữ liệu từ API
let filtered      = [];       // sau khi tìm kiếm
let displayed     = [];       // sau khi sắp xếp + pagination
let currentPage   = 1;
let itemsPerPage  = 5;
let sortField     = null;     // 'title' | 'price' | null
let sortDir       = null;     // 'asc' | 'desc' | null
let searchTerm    = '';

// ── DOM refs ─────────────────────────────────────────────────
const productBody   = document.getElementById('productBody');
const searchInput   = document.getElementById('searchInput');
const clearSearch   = document.getElementById('clearSearch');
const pagination    = document.getElementById('pagination');
const descPopup     = document.getElementById('descPopup');
const descPopupText = document.getElementById('descPopupText');

// ============================================================
// FETCH ALL PRODUCTS (getAll)
// ============================================================
async function getAll() {
    showLoader();
    try {
        // API có giới hạn limit, fetch nhiều page để có toàn bộ dữ liệu
        let page    = 1;
        let limit   = 100;
        let results = [];
        let hasMore = true;

        while (hasMore) {
            const res  = await fetch(`${API_URL}?limit=${limit}&offset=${(page - 1) * limit}`);
            const data = await res.json();

            if (data.length === 0) {
                hasMore = false;
            } else {
                results = results.concat(data);
                page++;
                // nếu ít hơn limit → không còn dữ liệu
                if (data.length < limit) hasMore = false;
            }
        }

        allProducts = results;
        filtered    = [...allProducts];
        updateStats();
        renderTable();
    } catch (err) {
        console.error('Lỗi fetch API:', err);
        productBody.innerHTML = `
            <tr><td colspan="6" class="loading-cell">
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                    </svg>
                    <strong>Không thể tải dữ liệu</strong><br>
                    <span style="font-size:13px;">Vui lòng kiểm tra kết nối internet và thử lại.</span>
                </div>
            </td></tr>`;
    }
}

// ============================================================
// RENDER TABLE (trang hiện tại)
// ============================================================
function renderTable() {
    // 1. Sort
    let sorted = [...filtered];
    if (sortField && sortDir) {
        sorted.sort((a, b) => {
            let valA = sortField === 'price' ? a.price : (a.title || '').toLowerCase();
            let valB = sortField === 'price' ? b.price : (b.title || '').toLowerCase();
            if (valA < valB) return sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return sortDir === 'asc' ?  1 : -1;
            return 0;
        });
    }

    // 2. Pagination
    const totalPages  = Math.ceil(sorted.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start  = (currentPage - 1) * itemsPerPage;
    const end    = start + itemsPerPage;
    displayed    = sorted.slice(start, end);

    // 3. Render rows
    if (displayed.length === 0) {
        productBody.innerHTML = `
            <tr><td colspan="6" class="loading-cell">
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                    </svg>
                    Không tìm thấy sản phẩm nào phù hợp.
                </div>
            </td></tr>`;
    } else {
        productBody.innerHTML = displayed.map((p, idx) => {
            const rowNum  = start + idx + 1;
            const imgSrc  = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/64';
            const catName = p.category ? p.category.name : 'N/A';
            const desc    = p.description || 'Không có mô tả.';
            const price   = Number(p.price).toLocaleString('vi-VN') + ' VND';

            return `
            <tr>
                <td><span class="row-no">${rowNum}</span></td>
                <td><div class="product-img-wrap"><img src="${imgSrc}" alt="${p.title}" loading="lazy"></div></td>
                <td>
                    <span class="product-title">${p.title}</span>
                    <span class="desc-hint" data-desc="${escapeHtml(desc)}" title="Xem mô tả">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/>
                        </svg>
                    </span>
                </td>
                <td class="desc-cell"></td>
                <td><span class="price-badge">${price}</span></td>
                <td><span class="category-tag" title="${catName}">${catName}</span></td>
            </tr>`;
        }).join('');
    }

    // 4. Pagination buttons
    renderPagination(totalPages);

    // 5. Stats
    updateStats();
}

// ============================================================
// PAGINATION RENDERING
// ============================================================
function renderPagination(totalPages) {
    // Info text
    const start = filtered.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const end   = Math.min(currentPage * itemsPerPage, filtered.length);
    document.getElementById('paginationFrom').textContent  = start;
    document.getElementById('paginationTo').textContent    = end;
    document.getElementById('paginationTotal').textContent = filtered.length;

    // Buttons
    let html = '';

    // Prev
    html += `<button class="page-btn nav-btn" id="prevBtn" ${currentPage === 1 ? 'disabled' : ''}>&#8249;</button>`;

    // Page numbers with ellipsis logic
    const pages = getPageNumbers(currentPage, totalPages);
    pages.forEach(p => {
        if (p === '...') {
            html += `<span class="page-ellipsis">…</span>`;
        } else {
            html += `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
        }
    });

    // Next
    html += `<button class="page-btn nav-btn" id="nextBtn" ${currentPage === totalPages ? 'disabled' : ''}>&#8250;</button>`;

    pagination.innerHTML = html;
}

// Tạo mảng số trang + ellipsis
function getPageNumbers(current, total) {
    if (total <= 7) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages = [];
    pages.push(1);

    if (current > 3) pages.push('...');

    const start = Math.max(2, current - 1);
    const end   = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push('...');
    pages.push(total);

    return pages;
}

// ============================================================
// SORT LOGIC
// ============================================================
function handleSort(field) {
    if (sortField === field) {
        // Toggle: asc → desc → null
        if (sortDir === 'asc')      sortDir = 'desc';
        else if (sortDir === 'desc') { sortDir = null; sortField = null; }
    } else {
        sortField = field;
        sortDir   = 'asc';
    }
    currentPage = 1;
    updateSortUI();
    renderTable();
}

function updateSortUI() {
    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === sortField) {
            th.classList.add('sort-' + sortDir);
        }
    });
}

// ============================================================
// SEARCH (onChange — thay đổi khi gõ)
// ============================================================
function handleSearch() {
    searchTerm = searchInput.value.trim().toLowerCase();
    currentPage = 1;

    // Show / hide clear button
    clearSearch.classList.toggle('visible', searchTerm.length > 0);

    if (searchTerm === '') {
        filtered = [...allProducts];
    } else {
        filtered = allProducts.filter(p =>
            (p.title || '').toLowerCase().includes(searchTerm)
        );
    }
    renderTable();
}

// ============================================================
// ITEMS PER PAGE
// ============================================================
function handlePerPage(limit) {
    itemsPerPage = limit;
    currentPage  = 1;
    document.querySelectorAll('.per-page-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.limit) === limit);
    });
    renderTable();
}

// ============================================================
// DESCRIPTION POPUP (hover)
// ============================================================
let popupTimeout = null;

function showDescPopup(hint, event) {
    const desc = hint.dataset.desc;
    if (!desc) return;

    descPopupText.textContent = desc;

    // Position: below the hint icon
    const rect   = hint.getBoundingClientRect();
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    let left = rect.left + scrollX;
    let top  = rect.bottom + scrollY + 8;

    // Prevent overflow right
    if (left + 310 > window.innerWidth + scrollX) {
        left = window.innerWidth + scrollX - 320;
    }

    descPopup.style.left = left + 'px';
    descPopup.style.top  = top  + 'px';
    descPopup.classList.add('visible');
}

function hideDescPopup() {
    descPopup.classList.remove('visible');
}

// ============================================================
// UTILITY
// ============================================================
function showLoader() {
    productBody.innerHTML = `
        <tr><td colspan="6" class="loading-cell">
            <div class="loader">
                <div class="loader-ring"></div>
                <span>Đang tải dữ liệu...</span>
            </div>
        </td></tr>`;
}

function updateStats() {
    document.getElementById('totalProducts').textContent = allProducts.length;
    document.getElementById('showingCount').textContent  = displayed.length;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/"/g, '&quot;');
}

// ============================================================
// EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {

    // Search — onChange (input event: thay đổi ngay khi gõ)
    searchInput.addEventListener('input', handleSearch);

    // Clear search
    clearSearch.addEventListener('click', () => {
        searchInput.value = '';
        handleSearch();
    });

    // Sort headers
    document.querySelectorAll('th.sortable').forEach(th => {
        th.addEventListener('click', () => handleSort(th.dataset.sort));
    });

    // Per-page buttons
    document.querySelectorAll('.per-page-btn').forEach(btn => {
        btn.addEventListener('click', () => handlePerPage(Number(btn.dataset.limit)));
    });

    // Pagination (event delegation)
    pagination.addEventListener('click', (e) => {
        const btn = e.target.closest('.page-btn');
        if (!btn || btn.disabled) return;

        if (btn.id === 'prevBtn') {
            currentPage--;
        } else if (btn.id === 'nextBtn') {
            currentPage++;
        } else {
            currentPage = Number(btn.dataset.page);
        }
        renderTable();
    });

    // Description popup — hover on .desc-hint
    productBody.addEventListener('mouseover', (e) => {
        const hint = e.target.closest('.desc-hint');
        if (hint) {
            clearTimeout(popupTimeout);
            showDescPopup(hint, e);
        }
    });

    productBody.addEventListener('mouseout', (e) => {
        const hint = e.target.closest('.desc-hint');
        if (hint) {
            popupTimeout = setTimeout(hideDescPopup, 150);
        }
    });

    // Hide popup when mouse enters popup itself (keep open)
    descPopup.addEventListener('mouseover', () => clearTimeout(popupTimeout));
    descPopup.addEventListener('mouseout', ()  => { popupTimeout = setTimeout(hideDescPopup, 150); });

    // ── FETCH DATA ───────────────────────────────────────────
    getAll();
});