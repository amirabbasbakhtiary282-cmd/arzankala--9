let currentProduct = null;
let currentProductId = null;
let currentPage = 1;
let currentSort = 'newest';
let galleryImages = [];
let currentGalleryIndex = 0;

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        console.warn('No product ID in URL, redirecting to category');
        window.location.href = 'category.html';
        return;
    }

    currentProductId = parseInt(productId);
    console.log('[Product] Loading product ID:', currentProductId);
    
    const skeleton = document.getElementById('productLoadingSkeleton');
    if (skeleton) skeleton.style.display = 'none';
    
    try {
        await loadProduct(currentProductId);
        await loadComments(currentProductId, 1, currentSort);
        setupCommentForm(currentProductId);
    } catch (e) {
        console.error('Product load error:', e);
        if (skeleton) skeleton.style.display = 'none';
        const container = document.getElementById('productContainer');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fa fa-frown fa-4x text-muted mb-3"></i>
                    <h4 class="text-danger">خطا در بارگذاری محصول</h4>
                    <p class="text-muted small">${e.message || 'خطای ناشناخته'}</p>
                    <button onclick="location.reload()" class="btn btn-success mt-3"><i class="fa fa-refresh ms-2"></i>تلاش مجدد</button>
                    <a href="category.html" class="btn btn-outline-success mt-3 ms-2">بازگشت به محصولات</a>
                </div>
            `;
        }
    }
});

async function loadProduct(productId, retries) {
    if (retries === undefined) retries = 2;
    
    console.log('[Product] Calling API.getProductById for:', productId);
    const result = await API.getProductById(productId);
    const product = result.product;
    const error = result.error;
    
    console.log('[Product] API Result:', { product: !!product, error, status: result.status, networkError: result.networkError });
    
    const skeleton = document.getElementById('productLoadingSkeleton');
    if (skeleton) skeleton.style.display = 'none';
    
    if (!product) {
        // Try local database as last resort before giving up
        if (typeof productsDatabase !== 'undefined') {
            const localProduct = productsDatabase.find(p => p.id == productId);
            if (localProduct) {
                console.log('[Product] Using local database fallback for product:', productId);
                return renderProduct(localProduct);
            }
        }
        
        // Retry only on network errors (server might be starting up)
        if (retries > 0 && result.networkError) {
            console.log('[Product] Network error, retrying...', retries);
            await new Promise(r => setTimeout(r, 1000));
            return loadProduct(productId, retries - 1);
        }
        const isNotFound = error && error.includes('یافت نشد');
        const container = document.getElementById('productContainer');
        if (!container) {
            console.error('[Product] productContainer not found!');
            return;
        }
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fa ${isNotFound ? 'fa-search' : 'fa-frown'} fa-4x text-muted mb-3"></i>
                <h4 class="text-danger">${isNotFound ? 'محصول یافت نشد' : 'خطا در بارگذاری محصول'}</h4>
                <p class="text-muted">${isNotFound ? 'محصولی با این شناسه در سیستم وجود ندارد' : (error || 'مشکلی در دریافت اطلاعات محصول وجود دارد')}</p>
                <button onclick="location.reload()" class="btn btn-success mt-3"><i class="fa fa-refresh ms-2"></i>تلاش مجدد</button>
                <a href="category.html" class="btn btn-outline-success mt-3 ms-2">بازگشت به محصولات</a>
            </div>
        `;
        return;
    }
    
    renderProduct(product);
}

    renderProduct(product);
}

function renderProduct(product) {
    currentProduct = product;
    document.title = product.name + ' | ارزان کالا';

    const hero = document.getElementById('productHero');
    const breadcrumb = document.getElementById('productBreadcrumb');
    const specs = document.getElementById('specsSection');
    const aiPanel = document.getElementById('aiReviewPanel');
    const descSection = document.getElementById('productDescriptionSection');
    const commentsSection = document.getElementById('commentsSection');
    const relatedSection = document.getElementById('relatedSection');
    const featuresSection = document.getElementById('featuresSection');
    const priceHistorySection = document.getElementById('priceHistorySection');
    const qaSection = document.getElementById('qaSection');
    const recentlyViewedSection = document.getElementById('recentlyViewedSection');
    const smartRecSection = document.getElementById('smartRecSection');
    const compareWidgetSection = document.getElementById('compareWidgetSection');
    
    if (hero) hero.style.display = 'block';
    if (breadcrumb) breadcrumb.style.display = 'block';
    if (specs) specs.style.display = 'block';
    if (aiPanel) aiPanel.style.display = 'block';
    if (descSection && product.description) descSection.style.display = 'block';
    if (commentsSection) commentsSection.style.display = 'block';
    if (relatedSection) relatedSection.style.display = 'block';
    if (featuresSection) featuresSection.style.display = 'block';
    if (priceHistorySection) priceHistorySection.style.display = 'block';
    if (qaSection) qaSection.style.display = 'block';
    if (recentlyViewedSection) recentlyViewedSection.style.display = 'block';
    if (smartRecSection) smartRecSection.style.display = 'block';
    if (compareWidgetSection) compareWidgetSection.style.display = 'block';

    displayBreadcrumb(product);
    displayGallery(product);
    displayProductInfo(product);
    displaySpecs(product);

    let viewerEl = document.getElementById('viewerCount');
    if (viewerEl) viewerEl.textContent = Math.floor(Math.random() * 15) + 3;

    async function updateLiveViewers() {
        try {
            let result = await apiRequest('/products/track-view', {
                method: 'POST',
                body: JSON.stringify({ productId: currentProductId })
            });
            if (result && result.success && result.data) {
                document.getElementById('viewerCount').textContent = result.data.liveViewers;
            }
        } catch(e) {}
    }
    updateLiveViewers();
    setInterval(updateLiveViewers, 15000);

    trackProductView(productId);
    if (product.price && window.API && window.API.trackProductPrice) {
        window.API.trackProductPrice(productId, product.price);
    }
    await loadPricePrediction(productId);
    await loadRelatedProducts(product);
    await loadAIReviewAnalysis(productId);

    if (product.description) {
        document.getElementById('productDescriptionBody').textContent = product.description;
    }

    checkWishlistStatus(productId);

    displayFeatureCards(product);
    loadPriceHistoryChart(productId);
    loadQandA(productId);
    loadRecentlyViewed();
    loadSmartRecommendations(product);
    displayCompareWidget(product);
    displaySellerInfo(product);
    displayDeliveryInfo();
}

function displayBreadcrumb(product) {
    const catEl = document.getElementById('breadcrumbCategory');
    if (catEl) catEl.textContent = product.category || 'دسته‌بندی';
    const prodEl = document.getElementById('breadcrumbProduct');
    if (prodEl) prodEl.textContent = product.name || '';
}

function displayGallery(product) {
    const mainImg = document.getElementById('galleryMainImage');

    galleryImages = ['img/' + product.image];
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
        product.images.forEach(img => {
            if (!galleryImages.includes('img/' + img)) galleryImages.push('img/' + img);
        });
    }

    currentGalleryIndex = 0;
    setMainImage(galleryImages[0]);

    const thumbsContainer = document.getElementById('galleryThumbs');
    thumbsContainer.innerHTML = galleryImages.map((src, idx) => {
        const active = idx === 0 ? ' active' : '';
        const errorSrc = 'https://placehold.co/200x200?text=No+Image';
        return `<div class="gallery-thumb${active}" data-index="${idx}">
            <img src="${src}" onerror="this.src='${errorSrc}'" onload="this.style.opacity='1'" style="opacity:0;transition:opacity 0.3s;">
        </div>`;
    }).join('');

    thumbsContainer.addEventListener('click', function(e) {
        const thumb = e.target.closest('.gallery-thumb');
        if (!thumb) return;
        const idx = parseInt(thumb.dataset.index);
        setActiveGalleryImage(idx);
    });

    mainImg.addEventListener('click', function() {
        openLightbox(currentGalleryIndex);
    });

    document.getElementById('galleryZoomBtn').addEventListener('click', function() {
        openLightbox(currentGalleryIndex);
    });

    document.getElementById('galleryFavBtn').addEventListener('click', function() {
        toggleWishlist();
    });

    const discountBadge = document.getElementById('galleryDiscountBadge');
    if (product.oldPrice && product.oldPrice > product.price) {
        const discount = Math.round((1 - product.price / product.oldPrice) * 100);
        discountBadge.textContent = discount + '% تخفیف';
        discountBadge.style.display = 'block';
    }
}

function setMainImage(src) {
    const mainImg = document.getElementById('galleryMainImage');
    mainImg.style.opacity = '0';
    mainImg.src = src;
    mainImg.onload = function() { mainImg.style.opacity = '1'; };
    mainImg.onerror = function() { this.src = 'https://placehold.co/600x600?text=No+Image'; this.style.opacity = '1'; };
}

function setActiveGalleryImage(idx) {
    if (idx < 0 || idx >= galleryImages.length) return;
    currentGalleryIndex = idx;
    setMainImage(galleryImages[idx]);

    document.querySelectorAll('.gallery-thumb').forEach((t, i) => {
        t.classList.toggle('active', i === idx);
    });
}

function openLightbox(idx) {
    const lightbox = document.getElementById('galleryLightbox');
    document.getElementById('lightboxImg').src = galleryImages[idx];
    lightbox.style.display = 'flex';
    lightbox.style.opacity = '0';
    setTimeout(() => { lightbox.style.opacity = '1'; }, 10);
    updateLightboxCounter(idx);
    document.body.style.overflow = 'hidden';
    lightbox.dataset.index = idx;
}

function closeLightbox() {
    const lightbox = document.getElementById('galleryLightbox');
    lightbox.style.opacity = '0';
    setTimeout(() => {
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
    }, 200);
}

function updateLightboxCounter(idx) {
    document.getElementById('lightboxCounter').textContent = (idx + 1) + ' / ' + galleryImages.length;
}

function navigateLightbox(direction) {
    const lightbox = document.getElementById('galleryLightbox');
    let idx = parseInt(lightbox.dataset.index || 0);
    idx = (idx + direction + galleryImages.length) % galleryImages.length;
    lightbox.dataset.index = idx;
    document.getElementById('lightboxImg').src = galleryImages[idx];
    updateLightboxCounter(idx);
}

document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.querySelector('.lightbox-close');
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    if (prevBtn) prevBtn.addEventListener('click', function() { navigateLightbox(-1); });
    if (nextBtn) nextBtn.addEventListener('click', function() { navigateLightbox(1); });

    const lightbox = document.getElementById('galleryLightbox');
    lightbox.addEventListener('click', function(e) {
        if (e.target === lightbox || e.target.closest('.lightbox-close')) {
            closeLightbox();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (document.getElementById('galleryLightbox').style.display !== 'flex') return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') navigateLightbox(-1);
        if (e.key === 'ArrowLeft') navigateLightbox(1);
    });
});

function displayProductInfo(product) {
    const catBadge = document.getElementById('productCategoryBadge');
    if (catBadge) catBadge.textContent = product.category || 'عمومی';

    const nameEl = document.getElementById('productName');
    if (nameEl) nameEl.textContent = product.name;

    const ratingEl = document.getElementById('productRating');
    const ratingText = document.getElementById('productRatingText');
    if (ratingEl) {
        let rating = product.rating || 0;
        let count = product.ratingCount || 0;
        ratingEl.innerHTML = renderStars(rating);
        if (ratingText) ratingText.textContent = rating.toFixed(1) + ' ⭐ (' + count + ' نظر)';
    }

    const salesEl = document.getElementById('salesCount');
    if (salesEl) salesEl.textContent = product.salesCount || Math.floor(Math.random() * 200 + 20);

    const priceEl = document.getElementById('productPrice');
    if (priceEl) {
        priceEl.innerHTML = '<span class="price-live fw-bold text-success" data-live-price="' + (product.priceUSD || (product.price / 750000)) + '">' + product.price.toLocaleString() + '</span> <span class="text-muted fs-6">تومان</span>' +
            '<span class="badge bg-success bg-opacity-10 text-success me-2 price-live-badge"><i class="fa fa-bolt ms-1"></i>قیمت لحظه‌ای</span>';
    }

    const oldPriceEl = document.getElementById('productOldPrice');
    const discountBadge = document.getElementById('discountBadge');
    if (product.oldPrice && product.oldPrice > product.price) {
        if (oldPriceEl) {
            oldPriceEl.innerHTML = '<span class="text-decoration-line-through text-muted small">' + product.oldPrice.toLocaleString() + ' تومان</span>';
            oldPriceEl.style.display = 'inline';
        }
        if (discountBadge) {
            const discount = Math.round((1 - product.price / product.oldPrice) * 100);
            discountBadge.textContent = discount + '% تخفیف';
            discountBadge.style.display = 'inline-block';
        }
    }

    const userDiscount = API.getUserDiscount();
    const dynamicDiscountEl = document.getElementById('dynamicDiscount');
    if (dynamicDiscountEl && userDiscount > 0) {
        dynamicDiscountEl.innerHTML = '<span class="badge bg-info"><i class="fa fa-gift ms-1"></i> تخفیف ویژه شما: ' + userDiscount + '%</span>';
        dynamicDiscountEl.style.display = 'inline-block';
    }

    const installmentEl = document.getElementById('installmentText');
    if (installmentEl && product.price) {
        const monthly = Math.round(product.price / 12 * 1.15);
        installmentEl.textContent = monthly.toLocaleString();
    }

    const stockInfo = document.getElementById('stockInfo');
    const addBtn = document.getElementById('addToCartBtn');
    const buyBtn = document.getElementById('buyNowBtn');
    if (product.stock > 0) {
        if (stockInfo) {
            if (product.stock < 5) {
                stockInfo.className = 'product-stock product-stock-low';
                stockInfo.innerHTML = '<i class="fa fa-exclamation-triangle ms-1"></i> فقط ' + product.stock + ' عدد موجود در انبار';
            } else {
                stockInfo.className = 'product-stock product-stock-available';
                stockInfo.innerHTML = '<i class="fa fa-check-circle ms-1"></i> ' + product.stock + ' عدد موجود در انبار';
            }
        }
        if (addBtn) addBtn.disabled = false;
        if (buyBtn) buyBtn.disabled = false;
    } else {
        if (stockInfo) {
            stockInfo.className = 'product-stock product-stock-unavailable';
            stockInfo.innerHTML = '<i class="fa fa-times-circle ms-1"></i> ناموجود';
        }
        if (addBtn) addBtn.disabled = true;
        if (buyBtn) buyBtn.disabled = true;
    }

    const descEl = document.getElementById('productDesc');
    if (descEl) descEl.textContent = product.description || '';

    if (addBtn) {
        addBtn.onclick = function() {
            addToCart({ id: product.id, name: product.name, price: product.price, image: product.image });
            API.showNotification('محصول به سبد خرید اضافه شد', 'success');
        };
    }

    if (buyBtn) {
        buyBtn.onclick = function() {
            addToCart({ id: product.id, name: product.name, price: product.price, image: product.image });
            window.location.href = 'cart.html';
        };
    }

    const wishlistBtn = document.getElementById('wishlistBtn');
    if (wishlistBtn) {
        wishlistBtn.onclick = function() { toggleWishlist(); };
    }
}

function displaySpecs(product) {
    const specsGrid = document.getElementById('specsGrid');
    const specsHighlights = document.getElementById('specsHighlights');
    const section = document.getElementById('specsSection');

    if (!product.specs || Object.keys(product.specs).length === 0) {
        if (section) section.style.display = 'none';
        return;
    }
    if (section) section.style.display = 'block';

    const entries = Object.entries(product.specs);
    specsGrid.innerHTML = entries.map(([key, val], idx) => {
        const delay = idx * 0.05;
        return `<div class="spec-item" style="animation: fadeInUp 0.4s ease forwards;animation-delay:${delay}s;opacity:0;">
            <span class="spec-key">${key}</span>
            <span class="spec-val">${val}</span>
        </div>`;
    }).join('');

    const keyEntries = entries.slice(0, 6);
    specsHighlights.innerHTML = keyEntries.map(([key, val]) => {
        return `<div class="spec-highlight-card">
            <div class="spec-highlight-icon"><i class="fa fa-microchip text-success"></i></div>
            <div class="spec-highlight-key small text-muted">${key}</div>
            <div class="spec-highlight-val fw-bold">${val}</div>
        </div>`;
    }).join('');
}

async function loadPricePrediction(productId) {
    const container = document.getElementById('pricePredictionBadge');
    if (!container) return;
    try {
        let prediction = await API.getPricePrediction(productId);
        if (!prediction || !prediction.advice) { container.style.display = 'none'; return; }
        container.style.display = 'block';
        let isBuy = prediction.advice.indexOf('همین الان بخرید') !== -1;
        let isWait = prediction.advice.indexOf('منتظر کاهش') !== -1;
        let icon = isBuy ? 'fa-rocket' : isWait ? 'fa-clock' : 'fa-chart-line';
        let color = isBuy ? '#00c853' : isWait ? '#ffc107' : '#00c853';
        let bg = isBuy ? 'rgba(0,200,83,0.15)' : isWait ? 'rgba(255,193,7,0.15)' : 'rgba(0,200,83,0.1)';
        container.innerHTML = '<div class="p-2 mb-2" style="background:' + bg + ';border:1px solid ' + color + ';border-radius:12px;text-align:center;">' +
            '<span style="color:' + color + ';"><i class="fa ' + icon + ' ms-1"></i> ' + prediction.advice + '</span>' +
            '</div>';
    } catch (e) { container.style.display = 'none'; }
}

async function loadAIReviewAnalysis(productId) {
    const panel = document.getElementById('aiReviewPanel');
    const loading = document.getElementById('aiReviewLoading');
    const content = document.getElementById('aiReviewContent');

    try {
        const analysis = await API.getAIReviewAnalysis(productId);
        if (!analysis || !analysis.total || analysis.total === 0) {
            panel.style.display = 'none';
            return;
        }

        loading.style.display = 'none';
        content.style.display = 'block';
        document.getElementById('aiReviewSubtitle').querySelector('span').textContent = analysis.total;
        document.getElementById('aiTotalComments').textContent = analysis.total;

        const s = analysis.sentiment;
        document.getElementById('gaugePositive').style.width = s.positivePercent + '%';
        document.getElementById('gaugeNeutral').style.width = s.neutralPercent + '%';
        document.getElementById('gaugeNegative').style.width = s.negativePercent + '%';
        document.getElementById('sentPositivePct').textContent = s.positivePercent;
        document.getElementById('sentNeutralPct').textContent = s.neutralPercent;
        document.getElementById('sentNegativePct').textContent = s.negativePercent;
        document.getElementById('sentimentAvgRating').textContent = analysis.averageRating.toFixed(1);

        document.getElementById('analysisTextContent').textContent = analysis.overallAnalysis || '';

        const score = analysis.recommendationScore || 0;
        const circumference = 326;
        const offset = circumference - (score / 100) * circumference;
        const arc = document.getElementById('recScoreArc');
        if (arc) arc.style.strokeDashoffset = offset;
        document.getElementById('recScoreNum').textContent = score;
        document.getElementById('recScoreLabel').textContent = analysis.recommendationLabel || '--';

        const scoreColor = score >= 80 ? '#00c853' : score >= 60 ? '#ffc107' : score >= 40 ? '#ff9800' : '#ff5252';
        if (arc) arc.style.stroke = scoreColor;
        document.getElementById('recScoreNum').style.color = scoreColor;

        document.getElementById('recPositiveCount').textContent = s.positive;
        document.getElementById('recNegativeCount').textContent = s.negative;
        document.getElementById('recVerifiedCount').textContent = analysis.verifiedPurchaseCount || 0;

        const prosContainer = document.getElementById('aiProsList');
        const consContainer = document.getElementById('aiConsList');

        if (analysis.pros && analysis.pros.length > 0) {
            prosContainer.innerHTML = '<div class="pros-cons-title text-success small fw-bold mb-1"><i class="fa fa-plus-circle ms-1"></i> نقاط قوت</div>' +
                analysis.pros.map(p => `<span class="pros-cons-tag pros-tag"><i class="fa fa-check ms-1"></i>${p.text} <small class="text-muted">(${p.count})</small></span>`).join('');
        } else {
            prosContainer.innerHTML = '<div class="pros-cons-title text-success small fw-bold mb-1"><i class="fa fa-plus-circle ms-1"></i> نقاط قوت</div><span class="text-muted small">موردی یافت نشد</span>';
        }

        if (analysis.cons && analysis.cons.length > 0) {
            consContainer.innerHTML = '<div class="pros-cons-title text-danger small fw-bold mb-1"><i class="fa fa-minus-circle ms-1"></i> نقاط ضعف</div>' +
                analysis.cons.map(c => `<span class="pros-cons-tag cons-tag"><i class="fa fa-times ms-1"></i>${c.text} <small class="text-muted">(${c.count})</small></span>`).join('');
        } else {
            consContainer.innerHTML = '<div class="pros-cons-title text-danger small fw-bold mb-1"><i class="fa fa-minus-circle ms-1"></i> نقاط ضعف</div><span class="text-muted small">موردی یافت نشد</span>';
        }

        const ratioEl = document.getElementById('aiProsConsRatio');
        if (ratioEl) {
            const pLen = analysis.pros ? analysis.pros.length : 0;
            const cLen = analysis.cons ? analysis.cons.length : 0;
            ratioEl.textContent = pLen + ':' + cLen;
        }

        const topicContainer = document.getElementById('topicBars');
        if (analysis.topics && analysis.topics.length > 0) {
            topicContainer.innerHTML = analysis.topics.slice(0, 6).map((t, idx) => {
                const color = t.avgRating >= 4 ? '#00c853' : t.avgRating >= 3 ? '#ffc107' : '#ff5252';
                const delay = idx * 0.08;
                return `<div class="topic-bar-item" style="animation: fadeInUp 0.4s ease forwards;animation-delay:${delay}s;opacity:0;">
                    <div class="d-flex justify-content-between small mb-1">
                        <span>${t.name}</span>
                        <span class="text-muted">${t.percentage}%</span>
                    </div>
                    <div class="topic-bar-track">
                        <div class="topic-bar-fill" style="width:${t.percentage}%;background:${color};"></div>
                    </div>
                    <div class="text-end"><small class="text-muted">⭐ ${t.avgRating}</small></div>
                </div>`;
            }).join('');
        } else {
            topicContainer.innerHTML = '<div class="text-muted small text-center py-3">داده کافی برای تحلیل موضوعی وجود ندارد</div>';
        }

        const cloudContainer = document.getElementById('keywordCloud');
        if (analysis.topKeywords && analysis.topKeywords.length > 0) {
            const persianStopWords = ['این', 'که', 'با', 'از', 'برای', 'و', 'در', 'به', 'یک', 'را', 'شده', 'است', 'تا', 'های', 'خود', 'یا', 'اما', 'باید', 'می', 'شود', 'خیلی', 'بسیار', 'هر', 'هم', 'نه', 'اگر', 'بعد', ' قبل', 'شما', 'ما', 'چون', 'زیرا', 'لطفاً', 'باشه', 'کردم', 'کردن', 'واقعاً', 'هست', 'نیست', 'بود', 'شد', 'داره', 'نداره', 'میشه', 'الان', 'من'];
            const filtered = analysis.topKeywords.filter(k => {
                const word = k.word.trim();
                return word.length > 1 && persianStopWords.indexOf(word) === -1;
            });
            const maxFreq = Math.max(...filtered.map(k => k.frequency));
            const top12 = filtered.slice(0, 12);
            cloudContainer.innerHTML = top12.map(k => {
                const size = 0.6 + (k.frequency / maxFreq) * 0.6;
                const opacity = 0.5 + (k.frequency / maxFreq) * 0.5;
                return `<span class="keyword-tag" style="font-size:${size}rem;opacity:${opacity};display:inline-block;margin:3px 6px;">${k.word}</span>`;
            }).join('');
            cloudContainer.style.maxWidth = '100%';
        } else {
            cloudContainer.innerHTML = '<div class="text-muted small text-center py-3">کلمات کلیدی یافت نشد</div>';
        }
    } catch (e) {
        loading.style.display = 'none';
        panel.style.display = 'none';
        console.error('AI Review Analysis error:', e);
    }
}

function displayFeatureCards(product) {
    const container = document.getElementById('featuresSection');
    if (!container || !product.specs || Object.keys(product.specs).length === 0) {
        if (container) container.style.display = 'none';
        return;
    }

    const iconMap = [
        { keys: ['باتری', 'battery', 'ظرفیت باتری'], icon: 'fa-battery-full', color: '#00e676', bg: 'rgba(0,200,83,0.1)' },
        { keys: ['دوربین', 'camera', 'رزولوشن دوربین'], icon: 'fa-camera', color: '#40c4ff', bg: 'rgba(64,196,255,0.1)' },
        { keys: ['پردازنده', 'processor', 'cpu', 'تراشه'], icon: 'fa-microchip', color: '#ffd740', bg: 'rgba(255,215,64,0.1)' },
        { keys: ['صفحه نمایش', 'display', 'نمایشگر', 'سایز نمایشگر'], icon: 'fa-tv', color: '#ff5252', bg: 'rgba(255,82,82,0.1)' },
        { keys: ['حافظه', 'memory', 'رم', 'ram', 'storage', 'فضای ذخیره'], icon: 'fa-hdd', color: '#00e676', bg: 'rgba(0,200,83,0.1)' }
    ];
    const defaultIcon = { icon: 'fa-shield-alt', color: '#00c853', bg: 'rgba(0,200,83,0.1)' };

    const entries = Object.entries(product.specs).slice(0, 6);
    const gridContainer = container.querySelector('.row');
    if (!gridContainer) return;

    gridContainer.innerHTML = entries.map(([key, val], idx) => {
        let matched = defaultIcon;
        const lowerKey = key.toLowerCase();
        for (const m of iconMap) {
            if (m.keys.some(k => lowerKey.indexOf(k) !== -1)) {
                matched = m;
                break;
            }
        }
        const delay = 0.35 + idx * 0.05;
        return `<div class="col-6 col-md-4 col-lg-2">
            <div class="glass-card text-center p-3 h-100" style="animation: fadeInUp 0.5s ease forwards; opacity:0; animation-delay: ${delay}s;">
                <div style="width:56px;height:56px;border-radius:16px;background:${matched.bg};display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <i class="fa ${matched.icon}" style="font-size:24px;color:${matched.color};"></i>
                </div>
                <div class="fw-bold small" style="color:var(--text-primary);">${escapeHtml(key)}</div>
                <div class="text-muted" style="font-size:11px;">${escapeHtml(val)}</div>
            </div>
        </div>`;
    }).join('');
}

let priceHistoryChartInstance = null;
let priceHistoryRange = '3m';

window.loadPriceHistoryChart = function(productId) {
    if (priceHistoryRange) {
        // priceHistoryRange is already a module-level variable
    }
    loadPriceHistoryChartInternal(productId);
};

window.priceHistoryRange = '3m';

function loadPriceHistoryChartInternal(productId) {
    const canvas = document.getElementById('priceHistoryChart');
    if (!canvas) return;

    const loadAndRender = function() {
        // Use Chart.js built-in registry to find and destroy existing chart
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            existingChart.destroy();
        }
        priceHistoryChartInstance = null;

        let dataPoints, labels;
        const basePrice = currentProduct ? currentProduct.price : 17000000;

        if (priceHistoryRange === '1y') {
            labels = ['فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
            dataPoints = [];
            for (let i = 0; i < 12; i++) {
                const variation = (Math.sin(i * 0.7) * 0.08 + Math.random() * 0.04 - 0.02);
                dataPoints.push(Math.round(basePrice * (1 + variation)));
            }
            dataPoints[11] = basePrice;
        } else if (priceHistoryRange === '6m') {
            labels = ['ماه ۱','ماه ۲','ماه ۳','ماه ۴','ماه ۵','ماه ۶'];
            dataPoints = [];
            for (let i = 0; i < 6; i++) {
                const variation = (Math.sin(i * 1.2) * 0.06 + Math.random() * 0.03 - 0.015);
                dataPoints.push(Math.round(basePrice * (1 + variation)));
            }
            dataPoints[5] = basePrice;
        } else {
            labels = ['هفته ۱','هفته ۲','هفته ۳','هفته ۴','هفته ۵','هفته ۶','هفته ۷','هفته ۸','هفته ۹','هفته ۱۰','هفته ۱۱','هفته ۱۲'];
            dataPoints = [];
            for (let i = 0; i < 12; i++) {
                const variation = (Math.sin(i * 0.5) * 0.04 + Math.random() * 0.02 - 0.01);
                dataPoints.push(Math.round(basePrice * (1 + variation)));
            }
            dataPoints[11] = basePrice;
        }

        const avgPrice = dataPoints.reduce(function(a, b) { return a + b; }, 0) / dataPoints.length;
        const avgData = Array(dataPoints.length).fill(avgPrice);

        priceHistoryChartInstance = new Chart(canvas.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'قیمت (تومان)',
                        data: dataPoints,
                        borderColor: '#00e676',
                        backgroundColor: 'rgba(0,230,118,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#00e676',
                        borderWidth: 2
                    },
                    {
                        label: 'میانگین',
                        data: avgData,
                        borderColor: '#40c4ff',
                        borderDash: [5, 5],
                        pointRadius: 0,
                        borderWidth: 1.5,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(18,26,22,0.95)',
                        titleColor: '#fff',
                        bodyColor: '#e0e0e0',
                        borderColor: '#00e676',
                        borderWidth: 1,
                        cornerRadius: 10,
                        callbacks: {
                            label: function(c) {
                                return c.dataset.label + ': ' + c.parsed.y.toLocaleString('fa-IR') + ' تومان';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(0,230,118,0.05)' },
                        ticks: { color: '#9e9e9e', font: { size: 11 } }
                    },
                    y: {
                        grid: { color: 'rgba(0,230,118,0.05)' },
                        ticks: {
                            color: '#9e9e9e',
                            font: { size: 11 },
                            callback: function(v) { return (v / 1000000).toFixed(1) + 'M'; }
                        }
                    }
                }
            }
        });
    };

    if (typeof Chart !== 'undefined') {
        loadAndRender();
    } else {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js';
        script.onload = loadAndRender;
        document.head.appendChild(script);
    }
}

window.setPriceRange = function(range) {
    priceHistoryRange = range;
    window.priceHistoryRange = range;
    document.querySelectorAll('#priceHistorySection .btn-outline-success').forEach(function(b) { b.classList.remove('active'); });
    var target = event && event.target;
    if (!target) {
        target = document.querySelector('#priceHistorySection .btn-outline-success[onclick*="' + range + '"]');
    }
    if (target) target.classList.add('active');
    loadPriceHistoryChartInternal(currentProductId);
};

function loadQandA(productId) {
    const container = document.getElementById('qaList');
    if (!container) return;

    const defaultQA = [
        {
            question: 'آیا این محصول گارانتی اصالت دارد؟',
            answer: 'بله، تمام محصولات ارزان‌کالا دارای گارانتی اصالت و سلامت فیزیکی کالا هستند.',
            time: '۲ روز پیش'
        },
        {
            question: 'هزینه ارسال چقدر است؟',
            answer: 'ارسال برای سفارش‌های بالای ۵۰۰,۰۰۰ تومان رایگان است. برای سفارش‌های کمتر، هزینه ارسال بر عهده مشتری است.',
            time: '۵ روز پیش'
        },
        {
            question: 'آیا امکان بازگشت کالا وجود دارد؟',
            answer: 'بله، تا ۷ روز پس از تحویل کالا امکان بازگشت بدون دلیل وجود دارد.',
            time: '۱ هفته پیش'
        }
    ];

    let stored = [];
    try {
        stored = JSON.parse(localStorage.getItem('qa_' + productId) || '[]');
    } catch (e) {}

    const allQA = defaultQA.concat(stored);

    container.innerHTML = allQA.map(function(qa) {
        return `<div class="qa-item mb-3 p-3" style="background:rgba(0,230,118,0.03);border-radius:14px;border:1px solid var(--border-color);animation: fadeInUp 0.4s ease forwards;opacity:0;">
            <div class="d-flex align-items-start gap-2 mb-2">
                <div style="min-width:32px;height:32px;border-radius:10px;background:var(--green-gradient);display:flex;align-items:center;justify-content:center;">
                    <i class="fa fa-question text-white" style="font-size:13px;"></i>
                </div>
                <div>
                    <div class="fw-bold small" style="color:var(--text-primary);">${escapeHtml(qa.question)}</div>
                    <div class="text-muted" style="font-size:11px;">پاسخ داده شده توسط ارزان‌کالا | ${qa.time}</div>
                </div>
            </div>
            <div class="d-flex align-items-start gap-2 me-5">
                <div style="min-width:28px;height:28px;border-radius:8px;background:rgba(0,200,83,0.1);display:flex;align-items:center;justify-content:center;">
                    <i class="fa fa-check text-success" style="font-size:11px;"></i>
                </div>
                <div class="small" style="color:var(--text-secondary);">${escapeHtml(qa.answer)}</div>
            </div>
        </div>`;
    }).join('');
}

window.openAskQuestionModal = function() {
    var existing = document.getElementById('askQuestionModal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'askQuestionModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s ease;';

    var questionText = '';

    modal.innerHTML = '<div style="background:var(--bg-card);border:1px solid var(--border-color);border-radius:20px;padding:28px;max-width:480px;width:100%;box-shadow:var(--shadow-xl);">' +
        '<div class="d-flex justify-content-between align-items-center mb-3">' +
        '<h6 class="fw-bold mb-0" style="color:var(--text-primary);"><i class="fa fa-question-circle text-success ms-1"></i> ثبت سوال جدید</h6>' +
        '<button class="btn btn-sm" id="closeAskModal" style="color:var(--text-muted);"><i class="fa fa-times"></i></button>' +
        '</div>' +
        '<textarea class="form-control mb-3" id="askQuestionInput" rows="4" placeholder="سوال خود را بنویسید..." style="background:var(--bg-secondary);border:1px solid var(--border-color);color:var(--text-primary);border-radius:12px;"></textarea>' +
        '<div id="askQuestionError" class="text-danger small mb-2" style="display:none;"></div>' +
        '<div class="d-flex gap-2">' +
        '<button class="btn btn-success flex-grow-1" id="submitAskQuestion"><i class="fa fa-paper-plane ms-1"></i> ارسال سوال</button>' +
        '<button class="btn btn-outline-secondary" id="cancelAskQuestion">انصراف</button>' +
        '</div></div>';

    document.body.appendChild(modal);
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.remove(); });

    document.getElementById('closeAskQuestion').addEventListener('click', function() { modal.remove(); });
    document.getElementById('cancelAskQuestion').addEventListener('click', function() { modal.remove(); });

    document.getElementById('submitAskQuestion').addEventListener('click', function() {
        var input = document.getElementById('askQuestionInput');
        var errorEl = document.getElementById('askQuestionError');
        var text = input.value.trim();

        if (!text) {
            errorEl.textContent = 'لطفاً سوال خود را بنویسید.';
            errorEl.style.display = 'block';
            return;
        }

        var stored = [];
        try { stored = JSON.parse(localStorage.getItem('qa_' + currentProductId) || '[]'); } catch (e) {}
        stored.push({
            question: text,
            answer: 'پاسخ شما ثبت شد و پس از بررسی توسط تیم پشتیبانی نمایش داده خواهد شد.',
            time: 'همین الان'
        });
        localStorage.setItem('qa_' + currentProductId, JSON.stringify(stored));

        modal.remove();
        API.showNotification('سوال شما با موفقیت ثبت شد', 'success');
        loadQandA(currentProductId);
    });
};

function loadRecentlyViewed() {
    var section = document.getElementById('recentlyViewedSection');
    var container = document.getElementById('recentlyViewedList');
    if (!container) return;

    try {
        var list = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        if (!list || list.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }

        var productIds = list.filter(function(item) { return item && item.id; }).map(function(item) { return item.id; });
        if (productIds.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        if (section) section.style.display = 'block';

        var cardsHtml = '';
        list.slice(0, 10).forEach(function(item, i) {
            if (!item || !item.id) return;
            var imgSrc = item.image || 'https://placehold.co/200x150?text=No+Image';
            if (imgSrc.indexOf('img/') === -1 && imgSrc.indexOf('http') === -1) {
                imgSrc = 'img/' + imgSrc;
            }
            var delay = 0.8 + i * 0.05;
            cardsHtml += `<div class="flex-shrink-0" style="width:180px;animation: fadeInUp 0.5s ease forwards; opacity:0; animation-delay: ${delay}s;">
                <div class="glass-card h-100" style="cursor:pointer;" onclick="window.location='product.html?id=${item.id}'">
                    <div style="background:rgba(0,200,83,0.05);padding:16px;text-align:center;border-radius:14px 14px 0 0;">
                        <img src="${imgSrc}" alt="${escapeHtml(item.name || '')}" style="max-height:100px;object-fit:contain;" onerror="this.src='https://placehold.co/200x150?text=No+Image'">
                    </div>
                    <div class="p-2">
                        <div class="small fw-bold" style="color:var(--text-primary);line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(item.name || '')}</div>
                        <div class="fw-bold text-success small mt-1">${item.price ? item.price.toLocaleString() + ' تومان' : ''}</div>
                    </div>
                </div>
            </div>`;
        });

        if (cardsHtml) {
            container.innerHTML = cardsHtml;
        } else {
            if (section) section.style.display = 'none';
        }
    } catch (e) {
        if (section) section.style.display = 'none';
    }
}

async function loadSmartRecommendations(product) {
    var container = document.getElementById('smartRecommendations');
    var section = document.getElementById('smartRecSection');
    if (!container) return;

    try {
        var related = await API.getRelatedProducts(product.id, 4);
        if (!related || related.length === 0) {
            if (product.category) {
                var allProducts = (typeof productsDatabase !== 'undefined') ? productsDatabase : [];
                related = allProducts.filter(function(p) {
                    return p.id !== product.id && p.category === product.category;
                }).slice(0, 4);
            }
        }

        if (!related || related.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        if (section) section.style.display = 'block';

        container.innerHTML = related.map(function(p, idx) {
            var discount = p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
            var discountBadge = discount > 0 ? '<div style="position:absolute;top:8px;right:8px;background:var(--danger);color:white;font-size:11px;padding:3px 8px;border-radius:8px;font-weight:bold;">' + discount + '%</div>' : '';
            var delay = 1.0 + idx * 0.1;
            return `<div class="col-6 col-md-4 col-lg-3">
                <div class="glass-card product-card h-100" style="animation: fadeInUp 0.5s ease forwards; opacity:0; animation-delay: ${delay}s; cursor:pointer;" onclick="window.location='product.html?id=${p.id}'">
                    <div style="position:relative;overflow:hidden;border-radius:14px 14px 0 0;background:rgba(0,200,83,0.05);padding:20px;text-align:center;">
                        <img src="img/${p.image}" alt="${escapeHtml(p.name)}" style="max-height:140px;object-fit:contain;" onerror="this.src='https://placehold.co/200x200?text=No+Image'">
                        ${discountBadge}
                    </div>
                    <div class="p-3">
                        <div class="fw-bold small mb-1" style="color:var(--text-primary);line-height:1.6;">${escapeHtml(p.name)}</div>
                        <div class="d-flex align-items-center gap-1 mb-2">
                            ${renderStars(p.rating || 0)}
                            <small class="text-muted">(${(p.rating || 0).toFixed(1)})</small>
                        </div>
                        <div class="d-flex align-items-baseline gap-2">
                            <span class="fw-bold text-success">${p.price.toLocaleString()}</span>
                            <span class="text-muted small">تومان</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        if (section) section.style.display = 'none';
    }
}

function displayCompareWidget(product) {
    var section = document.getElementById('compareWidgetSection');
    if (!section) return;
    if (!product || !product.specs || Object.keys(product.specs).length === 0) {
        section.style.display = 'none';
        return;
    }

    var table = section.querySelector('table');
    if (!table) return;

    var tbody = table.querySelector('tbody');
    if (!tbody) return;

    var specs = product.specs || {};
    var specKeys = Object.keys(specs);
    var mainSpecs = ['قیمت', 'دوربین', 'باتری', 'حافظه', 'صفحه‌نمایش', 'گارانتی'];
    var specIconMap = {
        'قیمت': 'fa-tag',
        'دوربین': 'fa-camera',
        'باتری': 'fa-battery-full',
        'حافظه': 'fa-hdd',
        'صفحه‌نمایش': 'fa-tv',
        'گارانتی': 'fa-shield-alt'
    };

    var rows = '';
    mainSpecs.forEach(function(key) {
        var icon = specIconMap[key] || 'fa-info-circle';
        var value = specs[key] || '--';
        if (key === 'قیمت') {
            value = product.price ? product.price.toLocaleString() + ' تومان' : '--';
        }

        var specKeyMatch = specKeys.find(function(sk) { return sk.indexOf(key) !== -1 || key.indexOf(sk) !== -1; });
        if (specKeyMatch && key !== 'قیمت') {
            value = specs[specKeyMatch];
        }

        rows += `<tr>
            <td style="padding:12px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid var(--border-color);">
                <i class="fa ${icon} text-success ms-1"></i> ${key}
            </td>
            <td style="padding:12px;text-align:center;font-size:13px;border-bottom:1px solid var(--border-color);">
                <span class="text-success fw-bold">${escapeHtml(value)}</span>
            </td>
            <td style="padding:12px;text-align:center;font-size:13px;border-bottom:1px solid var(--border-color);color:var(--text-muted);">--</td>
            <td style="padding:12px;text-align:center;font-size:13px;border-bottom:1px solid var(--border-color);color:var(--text-muted);">--</td>
        </tr>`;
    });

    if (specKeys.length > 6) {
        specKeys.slice(6, 10).forEach(function(key) {
            rows += `<tr>
                <td style="padding:12px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid var(--border-color);">
                    <i class="fa fa-info-circle text-success ms-1"></i> ${escapeHtml(key)}
                </td>
                <td style="padding:12px;text-align:center;font-size:13px;border-bottom:1px solid var(--border-color);">
                    <span class="text-success fw-bold">${escapeHtml(specs[key])}</span>
                </td>
                <td style="padding:12px;text-align:center;font-size:13px;border-bottom:1px solid var(--border-color);color:var(--text-muted);">--</td>
                <td style="padding:12px;text-align:center;font-size:13px;border-bottom:1px solid var(--border-color);color:var(--text-muted);">--</td>
            </tr>`;
        });
    }

    tbody.innerHTML = rows;
    section.style.display = 'block';

    var thead = table.querySelector('thead tr');
    if (thead) {
        var ths = thead.querySelectorAll('th');
        if (ths[0]) ths[0].textContent = 'ویژگی';
        if (ths[1]) ths[1].textContent = 'محصول فعلی';
        if (ths[2]) ths[2].textContent = 'رقیب ۱';
        if (ths[3]) ths[3].textContent = 'رقیب ۲';
    }
}

function displaySellerInfo(product) {
    var container = document.querySelector('#productHero .glass-card');
    if (!container) return;

    var sellerName = product.seller || 'ارزان‌کالا';
    var sellerRating = product.sellerRating || 4.5;
    var sellerPerformance = sellerRating >= 4.5 ? 'عالی' : sellerRating >= 3.5 ? 'خوب' : 'متوسط';
    var shippingFrom = product.shippingCity || 'تهران';
    var shippingDays = product.shippingDays || '۲ روز کاری';
    var hasWarranty = product.warranty !== false;

    var starsHtml = '';
    var fullStars = Math.floor(sellerRating);
    var hasHalf = sellerRating % 1 >= 0.3;
    for (var i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            starsHtml += '<i class="fa fa-star" style="color:#ffc107;font-size:11px;"></i>';
        } else if (i === fullStars + 1 && hasHalf) {
            starsHtml += '<i class="fa fa-star-half-alt" style="color:#ffc107;font-size:11px;"></i>';
        } else {
            starsHtml += '<i class="fa fa-star" style="color:#555;font-size:11px;"></i>';
        }
    }

    // Update seller name
    var sellerEl = container.querySelector('.text-success:first-child');
    if (sellerEl) sellerEl.textContent = sellerName;

    // Update rating stars
    var starContainer = container.querySelector('.d-flex.align-items-center.gap-1.mt-1');
    if (starContainer) starContainer.innerHTML = starsHtml + ' <span class="small text-muted">(' + sellerRating.toFixed(1) + ' از ۵)</span>';

    // Update seller performance
    var perfEl = container.querySelector('.fw-bold.text-success.small');
    if (perfEl) perfEl.textContent = sellerPerformance;

    // Update shipping from
    var strongEls = container.querySelectorAll('strong');
    if (strongEls[0]) strongEls[0].textContent = shippingFrom;
    if (strongEls[1]) strongEls[1].textContent = shippingDays;

    // Update warranty visibility
    var warrantyEl = container.querySelector('.fa-shield-alt');
    if (warrantyEl) {
        warrantyEl.parentElement.style.display = hasWarranty ? '' : 'none';
    }
}

function displayDeliveryInfo() {
    var container = document.querySelector('#productHero .glass-card:last-of-type');
    if (!container) return;

    var now = new Date();
    var deliveryMax = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    var toPersianDate = function(date) {
        try {
            var options = { year: 'numeric', month: 'long', day: 'numeric' };
            return date.toLocaleDateString('fa-IR', options);
        } catch (e) {
            return date.getDate() + ' ' + ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][date.getMonth()];
        }
    };

    var toPersianWeekday = function(date) {
        try {
            return date.toLocaleDateString('fa-IR', { weekday: 'long' });
        } catch (e) {
            return ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'][date.getDay()];
        }
    };

    var deliveryDateStr = toPersianWeekday(deliveryMax) + '، ' + toPersianDate(deliveryMax);

    var deliveryEl = container.querySelector('.text-success.fw-bold.mt-1');
    if (deliveryEl) {
        deliveryEl.innerHTML = '<i class="fa fa-clock ms-1"></i> تحویل تا ' + deliveryDateStr;
    }
}

async function checkWishlistStatus(productId) {
    try {
        const wishlist = await API.getWishlist();
        if (wishlist && wishlist.some(p => p.id === productId)) {
            const btn = document.getElementById('wishlistBtn');
            if (btn) { btn.classList.add('active'); btn.innerHTML = '<i class="fa fa-heart ms-1"></i> در علاقه‌مندی‌ها'; }
            const favBtn = document.getElementById('galleryFavBtn');
            if (favBtn) favBtn.classList.add('active');
        }
    } catch(e) {}
}

async function toggleWishlist() {
    const btn = document.getElementById('wishlistBtn');
    const favBtn = document.getElementById('galleryFavBtn');
    try {
        const wishlist = await API.getWishlist();
        const exists = wishlist && wishlist.some(p => p.id === currentProductId);
        if (exists) {
            await API.removeFromWishlist(currentProductId);
            if (btn) { btn.classList.remove('active'); btn.innerHTML = '<i class="fa fa-heart ms-1"></i> افزودن به علاقه‌مندی‌ها'; }
            if (favBtn) favBtn.classList.remove('active');
            API.showNotification('از علاقه‌مندی‌ها حذف شد', 'success');
        } else {
            await API.addToWishlist(currentProductId);
            if (btn) { btn.classList.add('active'); btn.innerHTML = '<i class="fa fa-heart ms-1"></i> در علاقه‌مندی‌ها'; }
            if (favBtn) favBtn.classList.add('active');
            API.showNotification('به علاقه‌مندی‌ها اضافه شد', 'success');
        }
    } catch(e) {
        const exists = localStorage.getItem('wishlist_' + currentProductId);
        if (exists) {
            localStorage.removeItem('wishlist_' + currentProductId);
            if (btn) { btn.classList.remove('active'); btn.innerHTML = '<i class="fa fa-heart ms-1"></i> افزودن به علاقه‌مندی‌ها'; }
            if (favBtn) favBtn.classList.remove('active');
        } else {
            localStorage.setItem('wishlist_' + currentProductId, '1');
            if (btn) { btn.classList.add('active'); btn.innerHTML = '<i class="fa fa-heart ms-1"></i> در علاقه‌مندی‌ها'; }
            if (favBtn) favBtn.classList.add('active');
        }
    }
}

async function loadComments(productId, page, sort) {
    currentSort = sort || 'newest';
    let limit = 10;
    let result = await API.getProductComments(productId, page, limit, currentSort);
    let comments = result.data || [];
    let summary = result.summary || {};

    displayCommentsSummary(summary);
    displayCommentsList(comments, page);
    setupPagination(summary.total || 0, page, limit);
    setupSortButtons(productId);
    document.getElementById('commentsTotalCount').textContent = summary.total || 0;
}

function displayCommentsSummary(summary) {
    let container = document.getElementById('commentsSummaryContainer');
    if (!container) return;

    let total = summary.total || 0;
    let average = summary.averageRating || 0;
    let distribution = summary.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    let barsHtml = '';
    [5, 4, 3, 2, 1].forEach(star => {
        let count = distribution[star] || 0;
        let percent = total > 0 ? (count / total * 100) : 0;
        barsHtml += `<div class="rating-bar-item d-flex align-items-center gap-2 mb-1">
            <span class="rating-bar-label small" style="min-width:50px;">${star} ستاره</span>
            <div class="rating-bar-bg flex-grow-1">
                <div class="rating-bar-fill" style="width:${percent}%;"></div>
            </div>
            <span class="rating-count small text-muted" style="min-width:25px;">${count}</span>
        </div>`;
    });

    container.innerHTML = `<div class="rating-summary d-flex align-items-center gap-4 flex-wrap p-3 glass-card">
        <div class="average-rating text-center" style="min-width:120px;">
            <div class="big-number">${average.toFixed(1)}</div>
            <div class="stars my-1">${renderStars(average)}</div>
            <div class="small text-muted">${total} نظر</div>
        </div>
        <div class="rating-bars flex-grow-1">${barsHtml}</div>
    </div>`;
}

function displayCommentsList(comments, page) {
    let container = document.getElementById('commentsList');
    if (!container) return;

    if (!comments || comments.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-5"><i class="fa fa-comment fa-3x mb-3"></i><p>هنوز نظری برای این محصول ثبت نشده است</p></div>';
        return;
    }

    container.innerHTML = comments.map(function (comment) {
        let prosHtml = '';
        if (comment.pros && comment.pros.length > 0) {
            prosHtml = '<div class="comment-pros text-success small mt-2"><i class="fa fa-check-circle ms-1"></i> نقاط قوت: ' + comment.pros.join('، ') + '</div>';
        }
        let consHtml = '';
        if (comment.cons && comment.cons.length > 0) {
            consHtml = '<div class="comment-cons text-danger small"><i class="fa fa-times-circle ms-1"></i> نقاط ضعف: ' + comment.cons.join('، ') + '</div>';
        }
        let aiHtml = '';
        if (comment.aiAnalysis) {
            let sentimentClass = comment.aiAnalysis.sentiment === 'positive' ? 'text-success' : comment.aiAnalysis.sentiment === 'negative' ? 'text-danger' : 'text-warning';
            let sentimentText = comment.aiAnalysis.sentiment === 'positive' ? 'مثبت' : comment.aiAnalysis.sentiment === 'negative' ? 'منفی' : 'خنثی';
            aiHtml = '<div class="comment-ai-analysis mt-2 p-2"><span class="' + sentimentClass + ' fw-bold small ms-2"><i class="fa fa-robot"></i> ' + sentimentText + '</span><span class="small text-muted">' + escapeHtml(comment.aiAnalysis.summary || '') + '</span></div>';
        }
        let replyHtml = '';
        if (comment.reply && comment.reply.content) {
            replyHtml = '<div class="comment-reply mt-2 pt-2"><div class="reply-text small text-muted"><i class="fa fa-reply text-success ms-1"></i> پاسخ مدیریت: ' + escapeHtml(comment.reply.content) + '</div></div>';
        }
        let verifiedBadge = comment.isVerifiedPurchase ? '<span class="badge bg-success bg-opacity-10 text-success ms-2" style="font-size:0.6rem;"><i class="fa fa-check-circle ms-1"></i>خریدار</span>' : '';
        let helpfulDisabled = localStorage.getItem('token') ? '' : 'disabled';

        return `<div class="comment-card mb-3 p-3 glass-card" style="animation: fadeInUp 0.4s ease forwards;opacity:0;">
            <div class="comment-header d-flex justify-content-between flex-wrap">
                <div class="comment-author fw-bold"><i class="fa fa-user-circle ms-1 text-success"></i>${escapeHtml(comment.username || 'کاربر')}${verifiedBadge}</div>
                <div class="comment-date small text-muted">${formatDate(comment.createdAt)}</div>
            </div>
            <div class="comment-rating my-1">${renderStars(comment.rating)}</div>
            ${comment.title ? '<div class="comment-title fw-bold mb-1">' + escapeHtml(comment.title) + '</div>' : ''}
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            ${prosHtml}${consHtml}${aiHtml}
            <div class="comment-helpful mt-2 d-flex align-items-center gap-3">
                <button class="helpful-btn btn btn-sm" ${helpfulDisabled} onclick="markHelpful(${comment.id})">
                    <i class="fa fa-thumbs-up ms-1 text-success"></i> مفید <span class="badge bg-success ms-1">${comment.helpfulCount || 0}</span>
                </button>
            </div>
            ${replyHtml}
        </div>`;
    }).join('');
}

function setupPagination(total, currentPageNum, limit) {
    let container = document.getElementById('commentsPagination');
    if (!container) return;

    let totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '<nav><ul class="pagination pagination-sm justify-content-center">';
    if (currentPageNum > 1) {
        html += '<li class="page-item"><button class="page-link bg-dark text-success border-secondary" onclick="loadComments(' + currentProductId + ',' + (currentPageNum - 1) + ',\'' + currentSort + '\')">قبلی</button></li>';
    }
    for (let i = 1; i <= totalPages; i++) {
        html += '<li class="page-item' + (i === currentPageNum ? ' active' : '') + '">' +
            '<button class="page-link' + (i === currentPageNum ? ' bg-success border-success text-white' : ' bg-dark text-success border-secondary') + '" onclick="loadComments(' + currentProductId + ',' + i + ',\'' + currentSort + '\')">' + i + '</button></li>';
    }
    if (currentPageNum < totalPages) {
        html += '<li class="page-item"><button class="page-link bg-dark text-success border-secondary" onclick="loadComments(' + currentProductId + ',' + (currentPageNum + 1) + ',\'' + currentSort + '\')">بعدی</button></li>';
    }
    html += '</ul></nav>';
    container.innerHTML = html;
}

function setupSortButtons(productId) {
    let container = document.getElementById('commentsSort');
    if (!container) return;
    let sorts = [
        { key: 'newest', label: 'جدیدترین' },
        { key: 'helpful', label: 'مفیدترین' },
        { key: 'highest_rating', label: 'بیشترین امتیاز' },
        { key: 'lowest_rating', label: 'کمترین امتیاز' }
    ];

    container.innerHTML = sorts.map(function (s) {
        let active = s.key === currentSort ? ' btn-success text-white' : ' btn-outline-success';
        return '<button class="btn btn-sm' + active + ' ms-1" onclick="changeSort(\'' + s.key + '\')">' + s.label + '</button>';
    }).join('');
}

window.changeSort = function (sort) {
    currentSort = sort;
    currentPage = 1;
    loadComments(currentProductId, 1, currentSort);
};

function setupCommentForm(productId) {
    let form = document.getElementById('commentForm');
    if (!form) return;

    let user = JSON.parse(localStorage.getItem('user') || 'null');
    if (!user) {
        form.innerHTML = '<div class="alert alert-info text-center mt-3 glass-card">' +
            '<i class="fa fa-user ms-2"></i> برای ثبت نظر <a href="register.html" class="text-success fw-bold">وارد شوید</a></div>';
        return;
    }

    let html = '<h5 class="fw-bold mt-4 mb-3"><i class="fa fa-edit text-success ms-2"></i> ثبت نظر شما</h5>' +
        '<div class="mb-3">' +
        '<label class="form-label text-white-50 small">امتیاز شما</label>' +
        '<div class="rating-input d-flex gap-1">';
    for (let i = 1; i <= 5; i++) {
        html += '<label class="rating-star-label" style="cursor:pointer;">' +
            '<input type="radio" name="rating" value="' + i + '" style="display:none;">' +
            '<i class="fa fa-star fa-lg rating-star" data-star="' + i + '"></i></label>';
    }
    html += '</div></div>' +
        '<div class="mb-3">' +
        '<label for="commentTitle" class="form-label text-white-50 small">عنوان نظر (اختیاری)</label>' +
        '<input type="text" id="commentTitle" class="form-control form-control-custom" maxlength="100">' +
        '</div>' +
        '<div class="mb-3">' +
        '<label for="commentContent" class="form-label text-white-50 small">متن نظر <span class="text-danger">*</span></label>' +
        '<textarea id="commentContent" class="form-control form-control-custom" rows="4" required></textarea>' +
        '</div>' +
        '<div class="row g-2 mb-3">' +
        '<div class="col-md-6">' +
        '<label for="commentPros" class="form-label text-white-50 small">نقاط قوت (هر خط یک مورد)</label>' +
        '<textarea id="commentPros" class="form-control form-control-custom" rows="2" placeholder="کیفیت خوب"></textarea>' +
        '</div>' +
        '<div class="col-md-6">' +
        '<label for="commentCons" class="form-label text-white-50 small">نقاط ضعف (هر خط یک مورد)</label>' +
        '<textarea id="commentCons" class="form-control form-control-custom" rows="2" placeholder="قیمت بالا"></textarea>' +
        '</div>' +
        '</div>' +
        '<button type="submit" class="btn btn-success px-4"><i class="fa fa-paper-plane ms-2"></i> ثبت نظر</button>' +
        '<button type="button" class="btn btn-outline-info w-100 mt-2" onclick="submitCommentWithAI()">' +
        '<i class="fa fa-robot ms-1"></i> ثبت نظر با تحلیل هوش مصنوعی</button>';

    form.innerHTML = html;
    form.onsubmit = function (e) {
        e.preventDefault();
        submitComment(productId);
    };

    let stars = form.querySelectorAll('.rating-star');
    stars.forEach(star => {
        star.addEventListener('mouseenter', function () { highlightStars(parseInt(this.dataset.star)); });
        star.addEventListener('click', function () {
            let val = parseInt(this.dataset.star);
            highlightStars(val);
            let radio = form.querySelector('input[name="rating"][value="' + val + '"]');
            if (radio) radio.checked = true;
        });
    });
    form.addEventListener('mouseleave', function () {
        let checked = form.querySelector('input[name="rating"]:checked');
        if (checked) highlightStars(parseInt(checked.value));
        else document.querySelectorAll('.rating-star').forEach(s => s.style.color = '#2a2f2e');
    });
}

function highlightStars(val) {
    document.querySelectorAll('.rating-star').forEach(s => {
        s.style.color = parseInt(s.dataset.star) <= val ? '#ffc107' : '#2a2f2e';
    });
}

async function submitComment(productId) {
    let form = document.getElementById('commentForm');
    let rating = form.querySelector('input[name="rating"]:checked');
    let title = document.getElementById('commentTitle');
    let content = document.getElementById('commentContent');
    let prosEl = document.getElementById('commentPros');
    let consEl = document.getElementById('commentCons');

    if (!rating || !content || !content.value.trim()) {
        API.showNotification('لطفاً امتیاز و متن نظر را وارد کنید', 'error');
        return;
    }

    let pros = prosEl && prosEl.value ? prosEl.value.split('\n').filter(s => s.trim()) : [];
    let cons = consEl && consEl.value ? consEl.value.split('\n').filter(s => s.trim()) : [];

    let result = await API.addComment(productId, parseInt(rating.value), title ? title.value : '', content.value.trim(), pros, cons);

    if (result && result.success) {
        API.showNotification('نظر شما با موفقیت ثبت شد. پس از تأیید مدیر نمایش داده می‌شود.', 'success');
        form.reset();
        document.querySelectorAll('.rating-star').forEach(s => s.style.color = '#2a2f2e');
        await loadComments(productId, 1, currentSort);
    } else {
        API.showNotification(result && result.error ? result.error : 'خطا در ثبت نظر', 'error');
    }
}

async function submitCommentWithAI() {
    let form = document.getElementById('commentForm');
    let rating = form.querySelector('input[name="rating"]:checked');
    let title = document.getElementById('commentTitle');
    let content = document.getElementById('commentContent');
    let prosEl = document.getElementById('commentPros');
    let consEl = document.getElementById('commentCons');

    if (!rating || !content || !content.value.trim()) {
        API.showNotification('لطفاً امتیاز و متن نظر را وارد کنید', 'error');
        return;
    }

    let pros = prosEl && prosEl.value ? prosEl.value.split('\n').filter(s => s.trim()) : [];
    let cons = consEl && consEl.value ? consEl.value.split('\n').filter(s => s.trim()) : [];

    let result = await API.submitProductCommentWithAI(currentProductId, parseInt(rating.value), title ? title.value : '', content.value.trim(), pros, cons);

    if (result && result.success) {
        API.showNotification('نظر شما با موفقیت ثبت شد و توسط هوش مصنوعی تحلیل گردید.', 'success');
        form.reset();
        document.querySelectorAll('.rating-star').forEach(s => s.style.color = '#2a2f2e');
        await loadComments(currentProductId, 1, currentSort);
    } else {
        API.showNotification(result && result.error ? result.error : 'خطا در ثبت نظر', 'error');
    }
}

window.markHelpful = async function (commentId) {
    let token = localStorage.getItem('token');
    if (!token) { API.showNotification('لطفاً ابتدا وارد شوید', 'error'); return; }
    let result = await API.markCommentHelpful(commentId);
    if (result && result.success) {
        await loadComments(currentProductId, currentPage, currentSort);
    } else {
        API.showNotification('شما قبلاً به این نظر رأی داده‌اید', 'error');
    }
};

async function loadRelatedProducts(product) {
    const section = document.getElementById('relatedSection');
    const container = document.getElementById('relatedProducts');
    if (!container) return;
    const related = await API.getRelatedProducts(product.id, 4);
    if (!related || related.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }
    if (section) section.style.display = 'block';

    container.innerHTML = related.map(function (p) {
        let discount = p.oldPrice && p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
        return '<div class="col-6 col-md-3 mb-3">' +
            '<div class="card h-100 bg-card border-0">' +
            '<div class="position-relative">' +
            '<img src="./img/' + p.image + '" class="card-img-top" alt="' + escapeHtml(p.name) + '" style="height:120px;object-fit:contain;padding:10px;" onerror="this.src=\'https://placehold.co/200x150?text=No+Image\'">' +
            (discount > 0 ? '<span class="position-absolute top-0 start-0 badge bg-danger">' + discount + '%</span>' : '') +
            '</div>' +
            '<div class="card-body p-2">' +
            '<h6 class="card-title small fw-bold text-truncate">' + escapeHtml(p.name) + '</h6>' +
            '<div class="text-success small fw-bold price-live" data-live-price="' + (p.priceUSD || (p.price / 750000)) + '">' + p.price.toLocaleString() + ' <span class="text-muted small fw-normal">تومان</span></div>' +
            (p.oldPrice && p.oldPrice > p.price ? '<div class="text-muted text-decoration-line-through small">' + p.oldPrice.toLocaleString() + ' تومان</div>' : '') +
            '<div class="small text-muted mt-1">' + renderStars(p.rating || 0) + ' ' + (p.rating || 0).toFixed(1) + '</div>' +
            '<a href="./product.html?id=' + p.id + '" class="btn btn-outline-success btn-sm w-100 mt-2"><i class="fa fa-eye ms-1"></i> مشاهده</a>' +
            '</div></div></div>';
    }).join('');
}

window.addToCompare = function() {
    if (!currentProduct) {
        API.showNotification('اطلاعات محصول بارگذاری نشده', 'error');
        return;
    }
    // Call the compare.js version which handles localStorage
    if (typeof window.addToCompareFn === 'function') {
        window.addToCompareFn(currentProduct);
    } else {
        let compare = JSON.parse(localStorage.getItem('compareList') || '[]');
        if (compare.some(p => p.id === currentProduct.id)) {
            compare = compare.filter(p => p.id !== currentProduct.id);
            API.showNotification('از لیست مقایسه حذف شد', 'success');
        } else {
            if (compare.length >= 4) { API.showNotification('حداکثر ۴ محصول برای مقایسه', 'error'); return; }
            compare.push({ id: currentProduct.id, name: currentProduct.name, price: currentProduct.price, image: currentProduct.image, category: currentProduct.category });
            API.showNotification('به لیست مقایسه اضافه شد', 'success');
        }
        localStorage.setItem('compareList', JSON.stringify(compare));
    }
    updateCompareUI();
};

function renderStars(rating) {
    let fullStars = Math.floor(rating);
    let hasHalf = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) stars += '<i class="fa fa-star" style="color:#ffc107;"></i>';
        else if (i === fullStars + 1 && hasHalf) stars += '<i class="fa fa-star-half-alt" style="color:#ffc107;"></i>';
        else stars += '<i class="fa fa-star" style="color:#2a2f2e;"></i>';
    }
    return stars;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try { return new Date(dateStr).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return dateStr; }
}

function escapeHtml(text) {
    if (!text) return '';
    let div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function trackProductView(productId) {
    let viewed = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
    if (viewed.indexOf(productId) === -1) {
        viewed.push(productId);
        if (viewed.length > 50) viewed = viewed.slice(-50);
        localStorage.setItem('viewedProducts', JSON.stringify(viewed));
    }

    let recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
    recentlyViewed = recentlyViewed.filter(function(item) { return item && item.id !== productId; });

    if (currentProduct) {
        recentlyViewed.unshift({
            id: currentProduct.id,
            name: currentProduct.name,
            image: 'img/' + currentProduct.image,
            price: currentProduct.price ? currentProduct.price.toLocaleString() + ' تومان' : '',
            timestamp: Date.now()
        });
    }

    if (recentlyViewed.length > 20) recentlyViewed = recentlyViewed.slice(0, 20);
    localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
}
