document.addEventListener('DOMContentLoaded', function() {
    console.log('category.js loaded');
    
    if (typeof productsDatabase === 'undefined' || !productsDatabase.length) {
        document.getElementById('productsGrid').innerHTML = '<div class="col-12"><div class="alert alert-danger" style="background: #1a1e1d; color: #ff5252; border: 1px solid #ff5252;">خطا: محصولات یافت نشد</div></div>';
        return;
    }
    
    const grid = document.getElementById('productsGrid');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortFilter = document.getElementById('sortFilter');
    const minPrice = document.getElementById('minPrice');
    const maxPrice = document.getElementById('maxPrice');
    const applyBtn = document.getElementById('applyFilters');
    const countSpan = document.getElementById('productCount');
    const categoryTitle = document.getElementById('categoryTitle');
    
    if (!grid) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const urlCategory = urlParams.get('category') || urlParams.get('cat') || '';
    const searchQuery = urlParams.get('search') || '';
    
    if (searchQuery) {
        const searchInput = document.querySelector('input[name="search"]');
        if (searchInput) searchInput.value = searchQuery;
        if (categoryTitle) categoryTitle.textContent = `نتایج جستجو: "${searchQuery}"`;
    }
    
    if (categoryFilter && urlCategory) {
        categoryFilter.value = urlCategory;
    }
    
    const categoryNames = {
        'mobile': 'موبایل و تبلت',
        'tablet': 'تبلت',
        'laptop': 'لپ تاپ و کامپیوتر',
        'accessory': 'لوازم جانبی',
        'camera': 'دوربین',
        'monitor': 'مانیتور',
        'home': 'لوازم خانگی'
    };
    
    function filterProducts() {
        let filtered = [...productsDatabase];
        
        if (searchQuery) {
            filtered = filtered.filter(p => 
                p.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        if (categoryFilter && categoryFilter.value) {
            filtered = filtered.filter(p => p.category === categoryFilter.value);
            if (categoryTitle && !searchQuery) {
                categoryTitle.textContent = categoryNames[categoryFilter.value] || 'همه محصولات';
            }
        } else {
            if (categoryTitle && !searchQuery) categoryTitle.textContent = 'همه محصولات';
        }
        
        if (minPrice && minPrice.value) {
            const min = parseInt(minPrice.value);
            if (!isNaN(min)) filtered = filtered.filter(p => p.price >= min);
        }
        if (maxPrice && maxPrice.value) {
            const max = parseInt(maxPrice.value);
            if (!isNaN(max)) filtered = filtered.filter(p => p.price <= max);
        }
        
        if (sortFilter && sortFilter.value) {
            switch(sortFilter.value) {
                case 'price-asc': filtered.sort((a,b) => a.price - b.price); break;
                case 'price-desc': filtered.sort((a,b) => b.price - a.price); break;
                case 'popular': filtered.sort((a,b) => (b.rating||0) - (a.rating||0)); break;
            }
        }
        
        return filtered;
    }
    
    function highlightText(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<span style="background-color: #00c85333; color: #00c853; font-weight: 600;">$1</span>');
    }
    
    function renderProducts(products) {
        if (products.length === 0) {
            let message = '<div class="col-12"><div class="alert alert-warning text-center p-5" style="background: #1a1e1d; border: 1px solid #ffc107;">🛑 محصولی یافت نشد';
            if (searchQuery) message += ` برای "${searchQuery}"`;
            message += '<br><a href="./category.html" class="btn btn-success mt-3">مشاهده همه محصولات</a></div></div>';
            grid.innerHTML = message;
            if (countSpan) countSpan.textContent = '0 محصول';
            return;
        }
        
        let html = '';
        products.forEach(p => {
            const discount = p.oldPrice ? Math.round((1 - p.price/p.oldPrice)*100) : 0;
            const displayName = searchQuery ? highlightText(p.name, searchQuery) : p.name;
            
            html += `
                <div class="col-6 col-md-4 col-lg-3 mb-3">
                    <div class="card h-100">
                        <img src="./img/${p.image}" class="card-img-top" alt="${p.name}" 
                             onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                        <div class="card-body">
                            <h6 class="card-title">${displayName}</h6>
                            <div class="text-success fw-bold">${p.price.toLocaleString()} تومان</div>
                            ${discount > 0 ? `<span class="badge bg-danger mt-1">${discount}%</span>` : ''}
                            <div class="mt-2 d-flex gap-2">
                                <button onclick='addToCart(${JSON.stringify({
                                    id: p.id,
                                    name: p.name,
                                    price: p.price,
                                    image: p.image
                                })})' class="btn btn-success btn-sm flex-grow-1" title="افزودن به سبد خرید">
                                    <i class="fa fa-cart-plus"></i>
                                </button>
                                <a href="./product.html?id=${p.id}" class="btn btn-outline-success btn-sm" title="مشاهده جزئیات">
                                    <i class="fa fa-eye"></i>
                                </a>
                                <button onclick='addToCompare(${JSON.stringify({
                                    id: p.id,
                                    name: p.name,
                                    price: p.price,
                                    image: p.image,
                                    category: p.category
                                })})' class="btn btn-outline-info btn-sm" title="مقایسه">
                                    <i class="fa fa-balance-scale"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
        if (countSpan) countSpan.textContent = products.length + ' محصول';
    }
    
    renderProducts(filterProducts());
    
    if (applyBtn) {
        applyBtn.addEventListener('click', function() {
            renderProducts(filterProducts());
        });
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', function() {
            renderProducts(filterProducts());
        });
    }
    
    if (sortFilter) {
        sortFilter.addEventListener('change', function() {
            renderProducts(filterProducts());
        });
    }
    
    const searchForm = document.querySelector('form[role="search"], form.d-flex');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const input = this.querySelector('input[name="search"]');
            if (input && input.value.trim()) {
                window.location.href = 'category.html?search=' + encodeURIComponent(input.value.trim());
            } else {
                window.location.href = 'category.html';
            }
        });
    }
});