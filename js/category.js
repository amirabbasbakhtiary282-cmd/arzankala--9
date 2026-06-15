// category.js - Premium product listing with filtering, sorting, search, pagination, animations
(function () {
    let currentPage = 1;
    let currentParams = {};
    let currentView = 'grid';
    let currentPerPage = 12;
    let allProducts = [];

    const BRANDS = [
        'Samsung', 'Apple', 'Xiaomi', 'Sony', 'LG', 'ASUS',
        'Lenovo', 'Dell', 'Canon', 'Nintendo', 'Logitech', 'JBL'
    ];

    const CATEGORY_NAMES = {
        mobile: 'موبایل و تبلت', laptop: 'لپ تاپ و کامپیوتر',
        accessory: 'لوازم جانبی', tablet: 'تبلت', camera: 'دوربین',
        monitor: 'مانیتور', home: 'لوازم خانگی', tv: 'تلویزیون', gaming: 'گیمینگ'
    };

    const SORT_NAMES = {
        '': 'پیش‌فرض', price_asc: 'ارزان‌ترین', price_desc: 'گران‌ترین',
        rating: 'محبوب‌ترین', newest: 'جدیدترین'
    };

    const PER_PAGE_MAP = { 12: '۱۲', 24: '۲۴', 48: '۴۸' };

    // ── Helpers ──
    function toFaNum(n) {
        const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return String(n).replace(/\d/g, d => fa[d]);
    }

    function renderStars(rating) {
        rating = rating || 0;
        const full = Math.floor(rating);
        const half = rating % 1 >= 0.5;
        let s = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= full) s += '<i class="fa fa-star" style="color:#ffc107"></i>';
            else if (i === full + 1 && half) s += '<i class="fa fa-star-half-alt" style="color:#ffc107"></i>';
            else s += '<i class="fa fa-star" style="color:var(--border-color)"></i>';
        }
        return s;
    }

    function escapeAttr(str) {
        return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }

    // ── Skeleton ──
    function showSkeleton(container, count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="cat-skeleton-card">
                    <div class="cat-skeleton cat-skeleton-img"></div>
                    <div class="cat-skeleton cat-skeleton-text"></div>
                    <div class="cat-skeleton cat-skeleton-text short"></div>
                    <div class="cat-skeleton cat-skeleton-text xshort"></div>
                </div>`;
        }
        container.innerHTML = html;
    }

    // ── Brand list ──
    function buildBrandList(selectedBrand) {
        const wrap = document.getElementById('brandList');
        if (!wrap) return;
        wrap.innerHTML = BRANDS.map(b => {
            const sel = selectedBrand === b ? ' selected' : '';
            return `
                <label class="cat-brand-item${sel}" data-brand="${b}">
                    <input type="checkbox" value="${b}"${sel ? ' checked' : ''}>
                    <span class="cat-brand-check"><i class="fa fa-check"></i></span>
                    <span class="cat-brand-name">${b}</span>
                </label>`;
        }).join('');

        wrap.querySelectorAll('.cat-brand-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const brand = item.dataset.brand;
                const isSelected = item.classList.contains('selected');
                if (isSelected) {
                    item.classList.remove('selected');
                    item.querySelector('input').checked = false;
                    delete currentParams.brand;
                } else {
                    wrap.querySelectorAll('.cat-brand-item').forEach(o => {
                        o.classList.remove('selected');
                        o.querySelector('input').checked = false;
                    });
                    item.classList.add('selected');
                    item.querySelector('input').checked = true;
                    currentParams.brand = brand;
                }
                loadProducts();
            });
        });
    }

    // ── Active filter chips ──
    function updateActiveFilters() {
        const wrap = document.getElementById('activeFilters');
        if (!wrap) return;
        const chips = [];
        if (currentParams.category) chips.push({ label: CATEGORY_NAMES[currentParams.category] || currentParams.category, key: 'category' });
        if (currentParams.brand) chips.push({ label: currentParams.brand, key: 'brand' });
        if (currentParams.minPrice) chips.push({ label: 'حداقل ' + Number(currentParams.minPrice).toLocaleString() + ' تومان', key: 'minPrice' });
        if (currentParams.maxPrice) chips.push({ label: 'حداکثر ' + Number(currentParams.maxPrice).toLocaleString() + ' تومان', key: 'maxPrice' });
        if (currentParams.sort) chips.push({ label: 'مرتب‌سازی: ' + SORT_NAMES[currentParams.sort], key: 'sort' });
        if (currentParams.search) chips.push({ label: 'جستجو: ' + currentParams.search, key: 'search' });

        wrap.innerHTML = chips.map(c => `
            <span class="cat-active-chip">
                ${c.label}
                <button class="cat-active-chip-remove" data-key="${c.key}"><i class="fa fa-times"></i></button>
            </span>`).join('');

        wrap.querySelectorAll('.cat-active-chip-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                delete currentParams[key];
                syncUIFromParams();
                loadProducts();
            });
        });
    }

    function syncUIFromParams() {
        const catEl = document.getElementById('categoryFilter');
        const brandEl = document.getElementById('brandList');
        const minEl = document.getElementById('minPrice');
        const maxEl = document.getElementById('maxPrice');
        const sortEl = document.getElementById('sortFilter');
        const heroSearch = document.getElementById('heroSearch');

        if (catEl) catEl.value = currentParams.category || '';
        if (minEl) minEl.value = currentParams.minPrice || '';
        if (maxEl) maxEl.value = currentParams.maxPrice || '';
        if (sortEl) sortEl.value = currentParams.sort || '';
        if (heroSearch) heroSearch.value = currentParams.search || '';

        if (brandEl) {
            brandEl.querySelectorAll('.cat-brand-item').forEach(item => {
                const match = currentParams.brand && item.dataset.brand === currentParams.brand;
                item.classList.toggle('selected', !!match);
                item.querySelector('input').checked = !!match;
            });
        }

        // sync quick filter chips
        document.querySelectorAll('.cat-chip[data-sort]').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.sort === (currentParams.sort || ''));
        });

        updateBreadcrumb();
        updateActiveFilters();
    }

    function updateBreadcrumb() {
        const el = document.getElementById('breadcrumbCurrent');
        if (!el) return;
        if (currentParams.search) el.textContent = 'جستجو: ' + currentParams.search;
        else if (currentParams.brand) el.textContent = 'برند: ' + currentParams.brand;
        else if (currentParams.category) el.textContent = CATEGORY_NAMES[currentParams.category] || 'محصولات';
        else el.textContent = 'همه محصولات';
    }

    function updateTitle() {
        const el = document.getElementById('categoryTitle');
        if (!el) return;
        if (currentParams.search) el.textContent = 'نتایج جستجو: "' + currentParams.search + '"';
        else if (currentParams.brand) el.textContent = 'برند: ' + currentParams.brand;
        else if (currentParams.category) el.textContent = CATEGORY_NAMES[currentParams.category] || 'همه محصولات';
        else el.textContent = 'همه محصولات';
    }

    // ── Load products ──
    async function loadProducts() {
        const grid = document.getElementById('productsGrid');
        showSkeleton(grid, currentPerPage);

        updateTitle();
        updateActiveFilters();
        updateBreadcrumb();

        const params = { ...currentParams, page: currentPage, limit: currentPerPage };
        const result = await window.API.getProducts(params);

        let products = [];
        let total = 0;
        let pagination = null;

        if (result.success && result.data) {
            products = result.data;
            total = result.pagination ? result.pagination.totalItems : products.length;
            pagination = result.pagination;
        } else {
            console.warn('[Category] API failed, using local database fallback');
            // Fallback to local database
            if (typeof productsDatabase !== 'undefined') {
                let filtered = [...productsDatabase];
                if (currentParams.category) filtered = filtered.filter(p => p.category === currentParams.category);
                if (currentParams.search) filtered = filtered.filter(p => p.name.toLowerCase().includes(currentParams.search.toLowerCase()));
                if (currentParams.minPrice) filtered = filtered.filter(p => p.price >= currentParams.minPrice);
                if (currentParams.maxPrice) filtered = filtered.filter(p => p <= currentParams.maxPrice);
                
                total = filtered.length;
                // Simple pagination for local data
                const start = (currentPage - 1) * currentPerPage;
                products = filtered.slice(start, start + currentPerPage);
                pagination = {
                    currentPage: currentPage,
                    totalPages: Math.ceil(total / currentPerPage),
                    totalItems: total
                };
            } else {
                grid.innerHTML = `<div class="cat-empty">
                    <div class="cat-empty-icon"><i class="fa fa-exclamation-triangle"></i></div>
                    <div class="cat-empty-title">خطا در دریافت محصولات</div>
                    <div class="cat-empty-desc">لطفاً دوباره تلاش کنید</div>
                </div>`;
                return;
            }
        }

        allProducts = products;
        renderProducts(allProducts, currentParams.search || '');
        updatePagination(pagination);

        document.getElementById('productCount').innerHTML = '<i class="fa fa-box-open"></i> ' + toFaNum(total) + ' محصول';
        document.getElementById('resultsInfo').textContent =
            'نمایش ' + toFaNum(Math.min((currentPage - 1) * currentPerPage + 1, total)) +
            ' - ' + toFaNum(Math.min(currentPage * currentPerPage, total)) +
            ' از ' + toFaNum(total) + ' نتیجه';
    }

    // ── Render products ──
    function renderProducts(products, searchQuery) {
        const grid = document.getElementById('productsGrid');
        grid.className = 'cat-products-grid ' + currentView + '-view';

        if (!products || products.length === 0) {
            grid.innerHTML = `
                <div class="cat-empty" style="grid-column:1/-1">
                    <div class="cat-empty-icon"><i class="fa fa-box-open"></i></div>
                    <div class="cat-empty-title">محصولی یافت نشد</div>
                    <div class="cat-empty-desc">فیلترهای خود را تغییر دهید یا جستجوی دیگری امتحان کنید</div>
                    <button class="cat-empty-btn" onclick="document.getElementById('clearAllFilters').click()">
                        <i class="fa fa-times"></i> پاک کردن فیلترها
                    </button>
                </div>`;
            return;
        }

        function highlight(text) {
            if (!searchQuery) return text;
            const q = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return text.replace(new RegExp('(' + q + ')', 'gi'), '<mark style="background:rgba(0,230,118,.25);color:inherit;border-radius:2px;padding:0 2px">$1</mark>');
        }

        grid.innerHTML = products.map((p, i) => {
            const discount = p.oldPrice ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
            const isNew = p.isNew || (p.createdAt && (Date.now() - new Date(p.createdAt).getTime()) < 7 * 86400000);
            const delay = Math.min(i * 0.06, 0.6);

            return `
                <div class="cat-product-card" style="animation-delay:${delay}s">
                    <div class="cat-card-img-wrap">
                        ${discount > 0 ? '<span class="cat-badge-discount">-' + toFaNum(discount) + '%</span>' : ''}
                        ${isNew ? '<span class="cat-badge-new">جدید</span>' : ''}
                        <img data-src="./img/${p.image}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 1'%3E%3C/svg%3E"
                             alt="${p.name}" loading="lazy"
                             onerror="this.src='https://placehold.co/300x300?text=No+Image'">
                        <div class="cat-card-quick-add">
                            <button class="cat-quick-add-btn" onclick="window.addToCart({id:${p.id},name:'${escapeAttr(p.name)}',price:${p.price},image:'${p.image}'})">
                                <i class="fa fa-cart-plus"></i> افزودن
                            </button>
                            <a href="./product.html?id=${p.id}" class="cat-quick-view-btn"><i class="fa fa-eye"></i></a>
                        </div>
                    </div>
                    <div class="cat-card-body">
                        <div class="cat-card-name">${highlight(p.name)}</div>
                        <div class="cat-card-rating">
                            ${renderStars(p.rating)}
                            <span class="cat-card-rating-text">${(p.rating || 0).toFixed(1)} (${toFaNum(p.ratingCount || 0)})</span>
                        </div>
                        <div class="cat-card-price-wrap">
                            <div class="cat-card-price">
                                <span class="cat-card-price-unit">تومان</span>
                                <span class="price-live" data-live-price="${p.priceUSD || (p.price / 750000)}">${p.price.toLocaleString()}</span>
                            </div>
                            ${p.oldPrice ? '<div class="cat-card-old-price">' + p.oldPrice.toLocaleString() + ' تومان</div>' : ''}
                        </div>
                    </div>
                </div>`;
        }).join('');

        // Staggered fade-in
        requestAnimationFrame(() => {
            grid.querySelectorAll('.cat-product-card').forEach((card, i) => {
                setTimeout(() => card.classList.add('visible'), i * 60);
            });
        });

        setupLazyLoading();
    }

    // ── Lazy loading ──
    function setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const obs = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        const img = e.target;
                        img.src = img.dataset.src;
                        img.classList.add('loaded');
                        obs.unobserve(img);
                    }
                });
            }, { rootMargin: '100px' });
            document.querySelectorAll('#productsGrid img[data-src]').forEach(img => obs.observe(img));
        } else {
            document.querySelectorAll('#productsGrid img[data-src]').forEach(img => { img.src = img.dataset.src; });
        }
    }

    // ── Pagination ──
    function setupPagination() {
        const el = document.getElementById('pagination');
        if (!el) return;
        el.addEventListener('click', async e => {
            const btn = e.target.closest('.cat-page-btn');
            if (!btn || btn.disabled) return;
            const page = parseInt(btn.dataset.page);
            if (!page || page === currentPage) return;
            currentPage = page;
            await loadProducts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    function updatePagination(pagination) {
        const el = document.getElementById('pagination');
        if (!el) return;
        if (!pagination || pagination.totalPages <= 1) { el.innerHTML = ''; return; }

        const { currentPage: cur, totalPages } = pagination;
        let html = '';

        html += `<button class="cat-page-btn" data-page="${cur - 1}" ${cur <= 1 ? 'disabled' : ''}><i class="fa fa-chevron-right cat-page-ellipsis"></i></button>`;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - cur) <= 2) {
                html += `<button class="cat-page-btn${i === cur ? ' active' : ''}" data-page="${i}">${toFaNum(i)}</button>`;
            } else if (i === cur - 3 || i === cur + 3) {
                html += '<span class="cat-page-ellipsis">...</span>';
            }
        }

        html += `<button class="cat-page-btn" data-page="${cur + 1}" ${cur >= totalPages ? 'disabled' : ''}><i class="fa fa-chevron-left cat-page-ellipsis"></i></button>`;

        el.innerHTML = html;
    }

    // ── Filter logic ──
    function collectFilters() {
        const cat = document.getElementById('categoryFilter')?.value || '';
        const brandItem = document.querySelector('#brandList .cat-brand-item.selected');
        const brand = brandItem ? brandItem.dataset.brand : '';
        const minP = document.getElementById('minPrice')?.value || '';
        const maxP = document.getElementById('maxPrice')?.value || '';
        const sort = document.getElementById('sortFilter')?.value || '';

        const newParams = {};
        if (cat) newParams.category = cat;
        if (brand) newParams.brand = brand;
        if (minP) newParams.minPrice = minP;
        if (maxP) newParams.maxPrice = maxP;
        if (sort) newParams.sort = sort;

        // preserve search from URL or existing params
        const urlParams = new URLSearchParams(window.location.search);
        const searchFromUrl = urlParams.get('search');
        if (searchFromUrl) newParams.search = searchFromUrl;
        else if (currentParams.search) newParams.search = currentParams.search;

        // Preserve brand state properly
        currentParams = newParams;
        currentPage = 1;
    }

    function applyAllFilters() {
        collectFilters();
        loadProducts();
    }

    function setupFilters() {
        document.getElementById('applyFilters')?.addEventListener('click', applyAllFilters);

        document.getElementById('categoryFilter')?.addEventListener('change', applyAllFilters);

        document.getElementById('sortFilter')?.addEventListener('change', applyAllFilters);

        document.getElementById('clearAllFilters')?.addEventListener('click', () => {
            currentParams = {};
            currentPage = 1;
            const urlParams = new URLSearchParams(window.location.search);
            const sq = urlParams.get('search');
            if (sq) currentParams.search = sq;
            // Reset brand UI
            const brandEl = document.getElementById('brandList');
            if (brandEl) {
                brandEl.querySelectorAll('.cat-brand-item').forEach(item => {
                    item.classList.remove('selected');
                    item.querySelector('input').checked = false;
                });
            }
            syncUIFromParams();
            loadProducts();
        });

        // Price inputs with debounce
        const priceDebounce = {};
        ['minPrice', 'maxPrice'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                const min = parseInt(document.getElementById('minPrice')?.value) || 0;
                const max = parseInt(document.getElementById('maxPrice')?.value) || 0;
                const rangeMax = 100000000;
                const fill = document.getElementById('priceSliderFill');
                if (fill && max > min) {
                    const minPct = (min / rangeMax) * 100;
                    const maxPct = (max / rangeMax) * 100;
                    fill.style.left = Math.min(minPct, 100) + '%';
                    fill.style.width = Math.min(maxPct - minPct, 100) + '%';
                }
                clearTimeout(priceDebounce[id]);
                priceDebounce[id] = setTimeout(applyAllFilters, 500);
            });
        });

        // Hero search
        const heroSearch = document.getElementById('heroSearch');
        const heroBtn = document.getElementById('heroSearchBtn');
        if (heroSearch) {
            heroSearch.addEventListener('keydown', e => {
                if (e.key === 'Enter') {
                    currentParams.search = heroSearch.value.trim();
                    currentPage = 1;
                    loadProducts();
                }
            });
        }
        if (heroBtn) {
            heroBtn.addEventListener('click', () => {
                if (heroSearch) {
                    currentParams.search = heroSearch.value.trim();
                    currentPage = 1;
                    loadProducts();
                }
            });
        }

        // Quick filter chips
        document.querySelectorAll('.cat-chip[data-sort]').forEach(chip => {
            chip.addEventListener('click', () => {
                document.querySelectorAll('.cat-chip[data-sort]').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                const sortVal = chip.dataset.sort;
                if (sortVal) currentParams.sort = sortVal;
                else delete currentParams.sort;
                const sortEl = document.getElementById('sortFilter');
                if (sortEl) sortEl.value = sortVal;
                currentPage = 1;
                loadProducts();
            });
        });
    }

    // ── View toggle ──
    function setupViewToggle() {
        document.querySelectorAll('.cat-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.cat-view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentView = btn.dataset.view;
                const grid = document.getElementById('productsGrid');
                if (grid) {
                    grid.className = 'cat-products-grid ' + currentView + '-view';
                }
            });
        });
    }

    // ── Per page ──
    function setupPerPage() {
        document.getElementById('perPageSelect')?.addEventListener('change', e => {
            currentPerPage = parseInt(e.target.value) || 12;
            currentPage = 1;
            loadProducts();
        });
    }

    // ── Init ──
    document.addEventListener('DOMContentLoaded', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search') || '';
        const urlCategory = urlParams.get('category') || '';
        const urlBrand = urlParams.get('brand') || '';
        const urlSort = urlParams.get('sort') || '';
        const urlMinPrice = urlParams.get('minPrice') || '';
        const urlMaxPrice = urlParams.get('maxPrice') || '';

        currentParams = {};
        if (urlCategory) currentParams.category = urlCategory;
        if (searchQuery) currentParams.search = searchQuery;
        if (urlBrand) currentParams.brand = urlBrand;
        if (urlSort) currentParams.sort = urlSort;
        if (urlMinPrice) currentParams.minPrice = urlMinPrice;
        if (urlMaxPrice) currentParams.maxPrice = urlMaxPrice;

        buildBrandList(urlBrand);
        syncUIFromParams();
        setupFilters();
        setupViewToggle();
        setupPerPage();
        setupPagination();
        await loadProducts();
    });
})();
