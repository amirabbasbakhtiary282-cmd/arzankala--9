(function () {
    let searchBox = document.querySelector('input[name="search"], #hmNavSearch, #hmMobileSearch');
    if (!searchBox) return;
    // Skip if home.js is loaded (it has its own autocomplete)
    if (document.getElementById('hmNavAutocomplete')) return;

    let wrapper = document.createElement('div');
    wrapper.id = 'searchDropdown';

    let container = searchBox.closest('.nav-search-box') || searchBox.closest('form') || searchBox.parentElement;
    if (container) {
        container.style.position = 'relative';
        container.appendChild(wrapper);
    }

    let debounceTimer = null;
    let lastQuery = '';

    searchBox.addEventListener('input', function () {
        let q = this.value.trim();
        if (q.length < 2) {
            wrapper.classList.remove('active');
            wrapper.innerHTML = '';
            lastQuery = '';
            return;
        }
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () { performSearch(q); }, 300);
    });

    searchBox.addEventListener('focus', function () {
        if (lastQuery.length >= 2 && wrapper.children.length > 0) {
            wrapper.classList.add('active');
        }
    });

    document.addEventListener('click', function (e) {
        if (!searchBox.contains(e.target) && !wrapper.contains(e.target)) {
            wrapper.classList.remove('active');
        }
    });

    async function performSearch(q) {
        if (q === lastQuery) return;
        lastQuery = q;

        wrapper.innerHTML = '<div class="text-center py-3"><i class="fa fa-spinner fa-spin" style="color:#00c853;"></i><div class="text-muted small mt-1">در حال جستجو...</div></div>';
        wrapper.classList.add('active');

        try {
            let result = await API.searchProducts(q);
            let products = result && result.success ? result.data : [];

            if (!products || products.length === 0) {
                wrapper.innerHTML =
                    '<div class="text-center py-4"><i class="fa fa-search text-muted fa-2x mb-2"></i><div class="text-muted small">نتیجه‌ای یافت نشد</div>' +
                    '<a href="category.html?search=' + encodeURIComponent(q) + '" class="btn btn-sm btn-outline-success mt-2" style="border-radius:20px;">مشاهده همه نتایج</a></div>';
                return;
            }

            let html = '';
            let count = 0;
            for (let i = 0; i < products.length; i++) {
                if (count >= 6) break;
                let p = products[i];
                let discount = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
                html +=
                    '<a href="product.html?id=' + p.id + '" class="search-item">' +
                    '<img src="./img/' + p.image + '" alt="" onerror="this.src=\'https://placehold.co/40\'">' +
                    '<span class="item-name">' + p.name + '</span>' +
                    '<span class="item-price">' + p.price.toLocaleString() + ' تومان</span>' +
                    (discount > 0 ? '<span class="item-discount">-' + discount + '%</span>' : '') +
                    '</a>';
                count++;
            }

            html += '<a href="category.html?search=' + encodeURIComponent(q) + '" class="search-footer"><i class="fa fa-search ms-1"></i> مشاهده همه نتایج</a>';
            wrapper.innerHTML = html;
        } catch (e) {
            wrapper.innerHTML = '<div class="text-center py-3 text-danger small">خطا در جستجو</div>';
        }
    }

    searchBox.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            wrapper.classList.remove('active');
            searchBox.blur();
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            let items = wrapper.querySelectorAll('a');
            for (let i = 0; i < items.length; i++) {
                if (items[i] === document.activeElement) {
                    if (items[i + 1]) items[i + 1].focus();
                    return;
                }
            }
            if (items.length > 0) items[0].focus();
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            let items = wrapper.querySelectorAll('a');
            for (let i = 0; i < items.length; i++) {
                if (items[i] === document.activeElement) {
                    if (i > 0) items[i - 1].focus();
                    return;
                }
            }
        }
    });
})();
