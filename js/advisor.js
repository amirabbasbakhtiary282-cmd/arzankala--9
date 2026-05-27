(function() {
    let currentProducts = [];
    
    document.addEventListener('DOMContentLoaded', function() {
        const profile = JSON.parse(localStorage.getItem('profile'));
        
        if (!profile) {
            window.location.href = 'choose.html';
            return;
        }

        displayProfile(profile);
        recommendProducts(profile);
        setupAddAllButton();
    });

    function displayProfile(profile) {
        const container = document.getElementById('profileDisplay');
        if (!container) return;

        const profileMap = {
            gaming: { name: '🎮 گیمر حرفه‌ای', icon: 'fa-gamepad' },
            student: { name: '📚 دانشجو/دانش‌آموز', icon: 'fa-graduation-cap' },
            office: { name: '💼 کارمند/اداری', icon: 'fa-briefcase' },
            normal: { name: '📱 کاربر معمولی', icon: 'fa-user' }
        };

        const budgetMap = {
            low: { name: '💰 بودجه اقتصادی', color: '#ffc107' },
            medium: { name: '💸 بودجه متوسط', color: '#00c853' },
            high: { name: '💎 بودجه نامحدود', color: '#00c853' }
        };

        const urgencyMap = {
            urgent: '🔥 نیاز فوری',
            normal: '⏳ زمان کافی',
            patient: '🧘 خرید هوشمند'
        };

        const profileInfo = profileMap[profile.usage] || profileMap.normal;
        const budgetInfo = budgetMap[profile.budget] || budgetMap.medium;

        container.innerHTML = `
            <div class="d-flex align-items-center gap-3 flex-wrap">
                <span class="badge bg-success p-3">
                    <i class="fa ${profileInfo.icon} ms-1"></i>
                    ${profileInfo.name}
                </span>
                <span class="badge bg-dark p-3" style="border:1px solid ${budgetInfo.color}">
                    ${budgetInfo.name}
                </span>
                <span class="badge bg-warning text-dark p-3">
                    ${urgencyMap[profile.urgency]}
                </span>
            </div>
        `;
    }

    function recommendProducts(profile) {
        if (typeof productsDatabase === 'undefined' || !productsDatabase.length) {
            document.getElementById('recommendedProducts').innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">خطا در بارگذاری محصولات</div>
                </div>
            `;
            return;
        }

        let candidates = [...productsDatabase];
        
        switch (profile.usage) {
            case 'gaming':
                candidates = candidates.filter(p => 
                    p.category === 'laptop' || 
                    p.category === 'monitor' || 
                    (p.category === 'accessory' && (
                        p.name.includes('هدفون') || 
                        p.name.includes('موس') || 
                        p.name.includes('کیبورد') ||
                        p.name.includes('گیمینگ')
                    ))
                );
                break;
                
            case 'student':
                candidates = candidates.filter(p => 
                    p.category === 'laptop' || 
                    p.category === 'tablet' || 
                    p.category === 'mobile'
                );
                break;
                
            case 'office':
                candidates = candidates.filter(p => 
                    p.category === 'laptop' || 
                    p.category === 'monitor' || 
                    p.category === 'accessory'
                );
                break;
        }

        candidates = filterByBudgetSmart(candidates, profile.budget);
        
        candidates = scoreProducts(candidates, profile);
        
        currentProducts = candidates.slice(0, 8);
        displayProducts(currentProducts);
    }

    function filterByBudgetSmart(products, budget) {
        if (!products.length) return [];

        const prices = products.map(p => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

        switch (budget) {
            case 'low':
                return products.filter(p => p.price <= avgPrice * 0.6)
                    .concat(
                        products.filter(p => p.price > avgPrice * 0.6 && p.price <= avgPrice * 0.8)
                            .slice(0, 3)
                    );
                
            case 'medium':
                return products.filter(p => 
                    p.price >= avgPrice * 0.4 && p.price <= avgPrice * 1.5
                );
                
            case 'high':
                return products.filter(p => p.price >= avgPrice * 0.8)
                    .sort((a, b) => b.price - a.price);
                
            default:
                return products;
        }
    }

    function scoreProducts(products, profile) {
        return products.map(product => {
            let score = 0;
            
            score += product.stock > 10 ? 10 : product.stock > 5 ? 7 : product.stock > 0 ? 3 : -10;
            
            score += product.rating >= 4.5 ? 15 : product.rating >= 4 ? 10 : product.rating >= 3.5 ? 5 : 0;
            
            if (product.oldPrice) {
                const discount = ((product.oldPrice - product.price) / product.oldPrice) * 100;
                score += discount >= 20 ? 20 : discount >= 10 ? 10 : discount >= 5 ? 5 : 0;
            }
            
            if (profile.urgency === 'urgent' && product.stock > 3) {
                score += 15;
            }
            
            if (profile.usage === 'gaming' && (product.category === 'laptop' || product.category === 'monitor')) {
                score += 10;
            }
            
            product.score = score;
            return product;
        }).sort((a, b) => b.score - a.score);
    }

    function displayProducts(products) {
        const container = document.getElementById('recommendedProducts');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-info text-center p-5">
                        <i class="fa fa-search fa-3x mb-3"></i>
                        <h4>محصولی یافت نشد</h4>
                        <p>با مشخصات فعلی محصولی مطابق نیاز شما وجود ندارد</p>
                        <a href="./category.html" class="btn btn-success mt-3">مشاهده همه محصولات</a>
                    </div>
                </div>
            `;
            return;
        }

        let html = '';
        products.forEach((product, index) => {
            const discount = product.oldPrice ? 
                Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : 0;
            
            html += `
                <div class="col-6 col-md-3 mb-4">
                    <div class="product-card h-100">
                        <div class="position-relative">
                            <img src="./img/${product.image}" alt="${product.name}" 
                                 class="img-fluid" style="height: 150px; width: 100%; object-fit: contain;"
                                 onerror="this.src='https://via.placeholder.com/200x150?text=No+Image'">
                            ${discount > 0 ? 
                                `<span class="position-absolute top-0 start-0 badge bg-danger">${discount}%</span>` : ''}
                            ${product.stock < 5 ? 
                                `<span class="position-absolute top-0 end-0 badge bg-warning text-dark">موجودی محدود</span>` : ''}
                        </div>
                        
                        <div class="product-info mt-3">
                            <h6 class="product-title text-truncate">${product.name}</h6>
                            
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="product-price">${product.price.toLocaleString()} تومان</span>
                                ${product.rating ? 
                                    `<span class="badge bg-success"><i class="fa fa-star"></i> ${product.rating}</span>` : ''}
                            </div>
                            
                            <div class="d-flex gap-2 mt-2">
                                <button onclick='addToCartWithCheck(${JSON.stringify({
                                    id: product.id,
                                    name: product.name,
                                    price: product.price,
                                    image: product.image
                                })})' class="btn btn-success btn-sm flex-grow-1">
                                    <i class="fa fa-cart-plus"></i>
                                </button>
                                <a href="./product.html?id=${product.id}" class="btn btn-outline-success btn-sm">
                                    <i class="fa fa-eye"></i>
                                </a>
                            </div>
                            
                            <small class="text-muted d-block mt-2">
                                <i class="fa fa-check-circle text-success"></i> ${product.stock} عدد موجود
                            </small>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        
        const algorithmDesc = document.createElement('div');
        algorithmDesc.className = 'col-12 mt-4';
        algorithmDesc.innerHTML = `
            <div class="alert alert-secondary bg-dark text-light border-success">
                <i class="fa fa-robot text-success ms-2"></i>
                <strong>نحوه انتخاب این محصولات:</strong>
                این سبد بر اساس ${products.length} محصول برتر از بین ${productsDatabase.length} محصول با توجه به 
                نیازهای شما (نوع استفاده، بودجه و فوریت) انتخاب شده است.
            </div>
        `;
        container.appendChild(algorithmDesc);
    }

    function setupAddAllButton() {
        const btn = document.getElementById('addAllToCart');
        if (!btn) return;

        btn.onclick = function() {
            if (!currentProducts || currentProducts.length === 0) {
                alert('❌ محصولی برای افزودن وجود ندارد');
                return;
            }

            let added = 0;
            let skipped = 0;

            currentProducts.forEach(product => {
                const existing = cart.find(item => item.id === product.id);
                if (!existing) {
                    addToCart({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        image: product.image
                    });
                    added++;
                } else {
                    skipped++;
                }
            });

            if (added > 0) {
                alert(`✅ ${added} محصول جدید به سبد خرید اضافه شد${skipped > 0 ? ` (${skipped} محصول تکراری)` : ''}`);
                updateCartUI();
            } else if (skipped > 0) {
                alert('⚠️ همه این محصولات قبلاً در سبد خرید هستند');
            }
        };
    }

    window.addToCartWithCheck = function(product) {
        addToCart(product);
    };
})();