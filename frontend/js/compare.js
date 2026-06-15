function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/[&<>"']/g, function (c) {
        return '&#' + c.charCodeAt(0) + ';';
    });
}

function getCompareList() {
    return JSON.parse(localStorage.getItem('compareList')) || [];
}

function saveCompareList(list) {
    localStorage.setItem('compareList', JSON.stringify(list));
}

function addToCompare(product) {
    let list = getCompareList();
    if (list.length >= 4) {
        alert('حداکثر می‌توانید ۴ محصول را مقایسه کنید');
        return;
    }
    for (let i = 0; i < list.length; i++) {
        if (list[i].id === product.id) {
            alert('این محصول قبلاً به لیست مقایسه اضافه شده');
            return;
        }
    }
    list.push({ id: product.id, name: product.name, price: product.price, image: product.image, category: product.category });
    saveCompareList(list);
    updateCompareUI();
    showCompareToast('محصول به لیست مقایسه اضافه شد');
}

function removeFromCompare(id) {
    let list = getCompareList();
    list = list.filter(function (item) { return item.id !== id; });
    saveCompareList(list);
    updateCompareUI();
    renderCompare();
}

function clearCompare() {
    saveCompareList([]);
    updateCompareUI();
    renderCompare();
    const filterBar = document.getElementById('compareFilterBar');
    if (filterBar) filterBar.style.display = 'none';
    API.showNotification('لیست مقایسه پاک شد', 'success');
}

function getCompareCount() {
    return getCompareList().length;
}

function updateCompareUI() {
    let els = document.querySelectorAll('.compare-counter');
    for (let i = 0; i < els.length; i++) {
        if (els[i]) els[i].innerHTML = '<i class="fa fa-balance-scale me-1"></i> <span id="compareCount">' + getCompareCount() + '</span> محصول';
    }
    let countEl = document.getElementById('compareCount');
    if (countEl) countEl.textContent = getCompareCount();
}

async function loadProductsForCompare() {
    let list = getCompareList();
    if (list.length === 0) return [];
    let products = [];
    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        let p = null;
        if (typeof API !== 'undefined' && typeof API.getProductById === 'function') {
            try { 
                const result = await API.getProductById(item.id);
                p = result.product;
            } catch(e) {}
        }
        if (!p && typeof productsDatabase !== 'undefined') {
            p = productsDatabase.find(function (pd) { return pd.id === item.id; });
        }
        if (!p && item.name) {
            p = { id: item.id, name: item.name, price: item.price, image: item.image, category: item.category, specs: {}, rating: 0, stock: 0, oldPrice: null };
        }
        if (p) products.push(p);
    }
    return products;
}

function renderCompare() {
    let container = document.getElementById('compareContent');
    if (!container) return;
    let list = getCompareList();
    if (list.length === 0) {
        document.getElementById('compareFilterBar').style.display = 'none';
        container.innerHTML =
            '<div class="empty-compare text-center py-5">' +
            '<i class="fa fa-balance-scale fa-4x mb-3" style="color:#2a2f2e;"></i>' +
            '<h4 class="text-white">لیست مقایسه خالی است</h4>' +
            '<p class="text-muted">برای مقایسه محصولات، از صفحه محصولات به لیست مقایسه اضافه کنید</p>' +
            '<a href="./category.html" class="btn btn-success mt-3"><i class="fa fa-store ms-1"></i> مشاهده محصولات</a>' +
            '</div>';
        return;
    }
    document.getElementById('compareFilterBar').style.display = 'flex';
    renderCompareAsync(container, list);
}

async function renderCompareAsync(container, list) {
    container.innerHTML =
        '<div class="text-center py-5"><i class="fa fa-spinner fa-spin fa-3x" style="color:#00c853;"></i><p class="text-muted mt-2">در حال بارگذاری اطلاعات محصولات...</p></div>';

    let products = await loadProductsForCompare();

    if (!products || products.length === 0) {
        container.innerHTML =
            '<div class="empty-compare text-center py-5">' +
            '<i class="fa fa-exclamation-triangle fa-4x mb-3 text-warning"></i>' +
            '<h4 class="text-danger">خطا در بارگذاری محصولات</h4>' +
            '<p class="text-muted">مشکلی در دریافت اطلاعات محصولات وجود دارد. لطفاً دوباره تلاش کنید.</p>' +
            '<button class="btn btn-success mt-2" onclick="location.reload()"><i class="fa fa-refresh ms-1"></i> تلاش مجدد</button>' +
            '</div>';
        return;
    }

    buildFilterOptions(products);
    filterAndRender(container, products);
}

window._compareAllProducts = [];
window._compareFilteredProducts = [];

function buildFilterOptions(products) {
    window._compareAllProducts = products;
    let cats = {};
    let brands = {};
    products.forEach(function(p) {
        if (p.category) cats[p.category] = true;
        let brand = '';
        if (p.name) {
            let parts = p.name.split(' ');
            brand = parts[0] || '';
        }
        if (brand) brands[brand] = true;
    });
    let catEl = document.getElementById('compareFilterCategory');
    if (catEl) {
        catEl.innerHTML = '<option value="">همه دسته‌ها</option>' +
            Object.keys(cats).sort().map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
    }
    let brandEl = document.getElementById('compareFilterBrand');
    if (brandEl) {
        brandEl.innerHTML = '<option value="">همه برندها</option>' +
            Object.keys(brands).sort().map(function(b) { return '<option value="' + b + '">' + b + '</option>'; }).join('');
    }
    let searchEl = document.getElementById('compareFilterSearch');
    if (catEl) catEl.onchange = function() { filterAndRender(containerRef, window._compareAllProducts); };
    if (brandEl) brandEl.onchange = function() { filterAndRender(containerRef, window._compareAllProducts); };
    if (searchEl) searchEl.oninput = function() { filterAndRender(containerRef, window._compareAllProducts); };
}

let containerRef = null;

function filterAndRender(container, products) {
    containerRef = container || containerRef;
    container = containerRef;
    if (!container) return;

    let cat = document.getElementById('compareFilterCategory')?.value || '';
    let brand = document.getElementById('compareFilterBrand')?.value || '';
    let search = document.getElementById('compareFilterSearch')?.value?.trim().toLowerCase() || '';

    let filtered = products.filter(function(p) {
        if (cat && p.category !== cat) return false;
        if (brand && (!p.name || p.name.indexOf(brand) !== 0)) return false;
        if (search && (!p.name || p.name.toLowerCase().indexOf(search) === -1)) return false;
        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-5"><i class="fa fa-filter fa-3x mb-3"></i><p>هیچ محصولی با فیلترهای انتخابی یافت نشد</p></div>';
        return;
    }

    buildCompareTable(container, filtered);
}

function buildCompareTable(container, products) {
    let html = '<div class="compare-table" style="overflow-x:auto;"><table class="table table-bordered" style="background:#111413;border-color:#2a2f2e;">';

    html += '<thead><tr><th style="background:#0a0c0b;color:#00c853;min-width:120px;">مشخصات</th>';
    for (let i = 0; i < products.length; i++) {
        html += '<th style="background:#0a0c0b;color:white;min-width:160px;text-align:center;">' + escapeHtml(products[i].name || '') + '</th>';
    }
    html += '</tr></thead><tbody>';

    html += '<tr><td class="fw-bold" style="background:#0a0c0b;">تصویر</td>';
    for (let j = 0; j < products.length; j++) {
        let p = products[j];
        let imgSrc = './img/' + (p.image || '');
        html += '<td class="text-center">' +
            '<div class="product-compare-card">' +
            '<img src="' + imgSrc + '" alt="' + escapeHtml(p.name || '') + '" style="height:100px;width:100%;object-fit:contain;" onerror="this.src=\'https://placehold.co/100?text=No+Image\'">' +
            '<div class="name small fw-bold mt-2">' + escapeHtml(p.name || '') + '</div>' +
            '<div class="price text-success fw-bold">' + (p.price ? p.price.toLocaleString() : '---') + ' تومان</div>' +
            '<button onclick="removeFromCompare(' + p.id + ')" class="btn btn-sm mt-2" style="background:#2a2f2e;color:#ff6b6b;border-radius:20px;width:100%;">' +
            '<i class="fa fa-times ms-1"></i> حذف</button>' +
            '<button onclick="addToCart({id:' + p.id + ',name:\'' + escapeHtml(p.name || '') + '\',price:' + (p.price || 0) + ',image:\'' + (p.image || '') + '\'})" class="btn btn-success btn-sm mt-1" style="border-radius:20px;width:100%;"' +
            (p.stock === 0 ? ' disabled' : '') + '>' +
            '<i class="fa fa-cart-plus ms-1"></i> ' + (p.stock === 0 ? 'ناموجود' : 'افزودن به سبد') +
            '</button>' +
            '</div></td>';
    }
    html += '</tr>';

    let allSpecKeys = [];
    for (let k = 0; k < products.length; k++) {
        if (products[k].specs) {
            let keys = Object.keys(products[k].specs);
            for (let m = 0; m < keys.length; m++) {
                if (allSpecKeys.indexOf(keys[m]) === -1) allSpecKeys.push(keys[m]);
            }
        }
    }

    for (let n = 0; n < allSpecKeys.length; n++) {
        let key = allSpecKeys[n];
        let values = [];
        let allSame = true;
        for (let t = 0; t < products.length; t++) {
            let val = (products[t].specs && products[t].specs[key]) ? products[t].specs[key] : '---';
            values.push(val);
            if (t > 0 && val !== values[0]) allSame = false;
        }
        html += '<tr><td class="fw-bold" style="background:#0a0c0b;">' + key + '</td>';
        for (let u = 0; u < values.length; u++) {
            let cls = allSame ? 'feature-match' : 'feature-no-match';
            html += '<td class="' + cls + ' text-center' + (allSame ? ' text-success' : '') + '">' + values[u] + '</td>';
        }
        html += '</tr>';
    }

    let allPrices = products.map(function (pp) { return pp.price || 0; });
    let allPricesSame = allPrices.every(function (v) { return v === allPrices[0]; });
    html += '<tr><td class="fw-bold" style="background:#0a0c0b;">قیمت</td>';
    for (let v = 0; v < products.length; v++) {
        let priceCls = allPricesSame ? 'text-success' : 'text-danger';
        html += '<td class="fw-bold ' + priceCls + ' text-center">' + (products[v].price ? products[v].price.toLocaleString() : '---') + ' تومان</td>';
    }
    html += '</tr>';

    let allRatings = products.map(function (pp) { return pp.rating || 0; });
    let allRatingsSame = allRatings.every(function (v) { return v === allRatings[0]; });
    html += '<tr><td class="fw-bold" style="background:#0a0c0b;">رتبه</td>';
    for (let w = 0; w < products.length; w++) {
        let r = products[w].rating || '---';
        let rCls = allRatingsSame ? 'text-success' : 'text-danger';
        html += '<td class="text-center ' + rCls + '">' + r + ' <i class="fa fa-star" style="color:#ffc107;"></i></td>';
    }
    html += '</tr>';

    let allStock = products.map(function (pp) { return pp.stock || 0; });
    let allStockSame = allStock.every(function (v) { return v === allStock[0]; });
    html += '<tr><td class="fw-bold" style="background:#0a0c0b;">موجودی</td>';
    for (let x = 0; x < products.length; x++) {
        let stockCls = allStockSame ? 'feature-match text-success' : 'feature-no-match';
        let stockText = products[x].stock > 0 ? products[x].stock + ' عدد' : 'ناموجود';
        html += '<td class="text-center ' + stockCls + '">' + stockText + '</td>';
    }
    html += '</tr>';

    html += '</tbody></table></div>';

    html += '<div class="compare-mobile-cards d-block d-xl-none">';
    for (let ci = 0; ci < products.length; ci++) {
        let cp = products[ci];
        let cardSpecs = '';
        if (cp.specs) {
            let skeys = Object.keys(cp.specs);
            for (let si = 0; si < skeys.length; si++) {
                cardSpecs += '<div class="d-flex justify-content-between py-1 border-bottom" style="border-color:#2a2f2e !important;"><span class="text-muted small">' + skeys[si] + '</span><span class="fw-bold small">' + (cp.specs[skeys[si]] || '---') + '</span></div>';
            }
        }
        let imgSrc = './img/' + (cp.image || '');
        html += '<div class="card mb-3" style="background:#111413;border:1px solid #2a2f2e;border-radius:16px;overflow:hidden;">' +
            '<div class="card-body text-center">' +
            '<img src="' + imgSrc + '" alt="' + escapeHtml(cp.name || '') + '" style="height:120px;width:100%;object-fit:contain;" onerror="this.src=\'https://placehold.co/120?text=No+Image\'">' +
            '<h6 class="fw-bold mt-2 text-white">' + escapeHtml(cp.name || '') + '</h6>' +
            '<div class="price text-success fw-bold fs-5">' + (cp.price ? cp.price.toLocaleString() : '---') + ' تومان</div>' +
            (cp.oldPrice ? '<div class="text-muted text-decoration-line-through small">' + cp.oldPrice.toLocaleString() + ' تومان</div>' : '') +
            '<div class="my-2"><i class="fa fa-star" style="color:#ffc107;"></i> ' + (cp.rating || '0') + ' از 5</div>' +
            '<div class="mb-2"><i class="fa fa-box text-info ms-1"></i> موجودی: ' + (cp.stock > 0 ? cp.stock + ' عدد' : 'ناموجود') + '</div>' +
            cardSpecs +
            '<div class="mt-3 d-flex gap-2">' +
            '<button onclick="removeFromCompare(' + cp.id + ')" class="btn btn-sm flex-grow-1" style="background:#2a2f2e;color:#ff6b6b;border-radius:20px;"><i class="fa fa-times ms-1"></i> حذف</button>' +
            '<button onclick="addToCart({id:' + cp.id + ',name:\'' + escapeHtml(cp.name || '') + '\',price:' + (cp.price || 0) + ',image:\'' + (cp.image || '') + '\'})" class="btn btn-success btn-sm flex-grow-1" style="border-radius:20px;"' +
            (cp.stock === 0 ? ' disabled' : '') + '><i class="fa fa-cart-plus ms-1"></i> ' + (cp.stock === 0 ? 'ناموجود' : 'افزودن') +
            '</button></div></div></div>';
    }
    html += '</div>';

    container.innerHTML = html;
}

function showCompareToast(msg) {
    let c = document.getElementById('hmNotifContainer') || document.body;
    let n = document.createElement('div');
    n.className = 'hm-toast';
    n.innerHTML = '<i class="fa fa-check-circle" style="color:var(--green-primary)"></i> ' + msg;
    n.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:var(--bg-card);border:1px solid var(--border-color);border-radius:14px;padding:12px 24px;color:var(--text-primary);z-index:99999;box-shadow:var(--shadow-lg);animation:fadeInUp 0.3s ease;';
    document.body.appendChild(n);
    setTimeout(function() { n.style.opacity = '0'; n.style.transition = 'opacity .3s'; setTimeout(function() { if (n.parentNode) n.parentNode.removeChild(n); }, 300); }, 2500);
}

window.resetCompareFilters = function() {
    let catEl = document.getElementById('compareFilterCategory');
    let brandEl = document.getElementById('compareFilterBrand');
    let searchEl = document.getElementById('compareFilterSearch');
    if (catEl) catEl.value = '';
    if (brandEl) brandEl.value = '';
    if (searchEl) searchEl.value = '';
    if (containerRef && window._compareAllProducts) filterAndRender(containerRef, window._compareAllProducts);
};

document.addEventListener('DOMContentLoaded', function () {
    updateCompareUI();
    renderCompare();
});

function resetCompareFilters() {
    document.getElementById('compareFilterCategory').value = '';
    document.getElementById('compareFilterBrand').value = '';
    document.getElementById('compareFilterSearch').value = '';
    filterAndRender(containerRef, window._compareAllProducts);
}

window.addToCompareFn = addToCompare;
window.addToCompare = addToCompare;
window.removeFromCompare = removeFromCompare;
window.clearCompare = clearCompare;
window.getCompareCount = getCompareCount;
window.displayCompareProducts = renderCompare;
