/* ==============================================
   home.js - ArzanKala Homepage Engine v2
   ============================================== */
(function(){
'use strict';

let ALL_PRODUCTS = [];
let AUTOCOMPLETE_TIMER = null;
let HERO_SLIDE_INDEX = 0;
let HERO_SLIDE_TIMER = null;
let HERO_SLIDES_COUNT = 3;
let FLASH_USED_IDS = {};

/* ========== SEARCH & AUTOCOMPLETE ========== */
function doSearch(inputId) {
    let val = document.getElementById(inputId).value.trim();
    if (val) window.location = './category.html?search=' + encodeURIComponent(val);
}
window.hmDoSearch = doSearch;

function setupAutocomplete(inputId, dropdownId) {
    let input = document.getElementById(inputId);
    let dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;
    input.addEventListener('input', function() {
        let q = this.value.trim();
        clearTimeout(AUTOCOMPLETE_TIMER);
        if (q.length < 2) { dropdown.classList.remove('active'); return; }
        AUTOCOMPLETE_TIMER = setTimeout(function() {
            let results = ALL_PRODUCTS.filter(function(p) {
                return p.name.toLowerCase().includes(q.toLowerCase()) || (p.category || '').includes(q.toLowerCase());
            }).slice(0, 6);
            if (results.length === 0) { dropdown.classList.remove('active'); return; }
            let h = '';
            results.forEach(function(p) {
                h += '<div class="hm-autocomplete-item" onclick="window.location=\'./product.html?id=' + p.id + '\'">' +
                    '<img src="./img/' + p.image + '" alt="" loading="lazy" onerror="this.src=\'https://placehold.co/42x42?text=?\'">' +
                    '<span class="hm-ac-name">' + (p.name||'').replace(/</g,'&lt;') + '</span>' +
                    '<span class="hm-ac-price">' + (p.price||0).toLocaleString() + ' تومان</span></div>';
            });
            h += '<div class="hm-autocomplete-footer" onclick="doSearch(\'' + inputId + '\')"><i class="fa fa-search ms-1"></i> مشاهده همه نتایج</div>';
            dropdown.innerHTML = h;
            dropdown.classList.add('active');
        }, 250);
    });
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') { doSearch(inputId); dropdown.classList.remove('active'); }
    });
    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('active');
    });
}

/* ========== PARTICLES ========== */
function initParticles() {
    let c = document.getElementById('hmParticles');
    if (!c) return;
    for (let i = 0; i < 25; i++) {
        let p = document.createElement('div');
        p.className = 'hm-hero-particle';
        let dur = 8 + Math.random() * 12;
        let delay = Math.random() * 10;
        let size = 2 + Math.random() * 3;
        p.style.left = Math.random() * 100 + '%';
        p.style.width = p.style.height = size + 'px';
        p.style.animation = 'hmParticleFloat ' + dur + 's linear ' + delay + 's infinite';
        c.appendChild(p);
    }
}

/* ========== HERO SLIDER ========== */
function initHeroSlider() {
    let slides = document.querySelectorAll('.hm-slide');
    let dots = document.querySelectorAll('.hm-slide-dot');
    let progress = document.getElementById('hmSlideProgress');
    if (slides.length === 0) return;
    HERO_SLIDES_COUNT = slides.length;

    function goToSlide(idx) {
        slides.forEach(function(s, i) {
            s.classList.toggle('active', i === idx);
        });
        dots.forEach(function(d, i) {
            d.classList.toggle('active', i === idx);
        });
        HERO_SLIDE_INDEX = idx;
        if (progress) { progress.style.width = '0%'; setTimeout(function(){ progress.style.width = '100%'; }, 50); }
    }
    function nextSlide() { goToSlide((HERO_SLIDE_INDEX + 1) % HERO_SLIDES_COUNT); }

    goToSlide(0);
    HERO_SLIDE_TIMER = setInterval(nextSlide, 5000);

    dots.forEach(function(dot, i) {
        dot.addEventListener('click', function() {
            clearInterval(HERO_SLIDE_TIMER);
            goToSlide(i);
            HERO_SLIDE_TIMER = setInterval(nextSlide, 5000);
        });
    });

    let slider = document.getElementById('hmHeroSlider');
    if (slider) {
        let touchStartX = 0;
        slider.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; }, { passive: true });
        slider.addEventListener('touchend', function(e) {
            let diff = touchStartX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                clearInterval(HERO_SLIDE_TIMER);
                if (diff > 0) goToSlide((HERO_SLIDE_INDEX + 1) % HERO_SLIDES_COUNT);
                else goToSlide((HERO_SLIDE_INDEX - 1 + HERO_SLIDES_COUNT) % HERO_SLIDES_COUNT);
                HERO_SLIDE_TIMER = setInterval(nextSlide, 5000);
            }
        }, { passive: true });
    }
}

/* ========== SCROLL REVEAL ========== */
function initScrollReveal() {
    let els = document.querySelectorAll('.hm-reveal');
    if (!('IntersectionObserver' in window)) {
        els.forEach(function(el) { el.classList.add('visible'); });
        return;
    }
    let obs = new IntersectionObserver(function(entries) {
        entries.forEach(function(e) {
            if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
        });
    }, { threshold: 0.1 });
    els.forEach(function(el) { obs.observe(el); });
}

/* ========== BACK TO TOP ========== */
function initBackToTop() {
    let btt = document.getElementById('hmBackToTop');
    if (!btt) return;
    window.addEventListener('scroll', function() {
        if (window.scrollY > 400) btt.classList.add('show');
        else btt.classList.remove('show');
    }, { passive: true });
}

/* ========== NAVBAR SCROLL ========== */
function initNavbarScroll() {
    let r1 = document.getElementById('navbarRow1');
    if (!r1) return;
    window.addEventListener('scroll', function() {
        if (window.scrollY > 20) r1.classList.add('scrolled');
        else r1.classList.remove('scrolled');
    }, { passive: true });
}

/* ========== LOAD PRODUCTS ========== */
async function loadProducts() {
    try {
        let res = await API.getProducts({ limit: 100 });
        if (res && res.success && res.data && res.data.length > 0) {
            // Deduplicate by product id
            let seen = {};
            ALL_PRODUCTS = [];
            res.data.forEach(function(p) {
                if (!seen[p.id]) { seen[p.id] = true; ALL_PRODUCTS.push(p); }
            });
            return;
        }
    } catch(e) {}
    if (typeof productsDatabase !== 'undefined') ALL_PRODUCTS = productsDatabase;
}

/* ========== PRODUCT CARD RENDERER ========== */
function renderCard(p) {
    if (!p) return '';
    let disc = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
    let stars = '';
    let r = p.rating || 0;
    for (let i = 1; i <= 5; i++) stars += '<i class="fa ' + (i <= Math.round(r) ? 'fa-star' : 'fa-star-o') + ' star' + (i > Math.round(r) ? ' empty' : '') + '"></i>';
    let escName = (p.name || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
    let inWl = isInWishlist(p.id);
    let productObj = {id:p.id,name:p.name,price:p.price,image:p.image};
    let productDataAttr = escNameAttr(productObj);

    return '<div class="hm-product-card">' +
        '<div class="hm-pc-imgwrap">' +
        (disc > 0 ? '<span class="hm-pc-discount">-' + disc + '%</span>' : '') +
        '<button class="hm-pc-wish' + (inWl ? ' active' : '') + '" onclick="event.stopPropagation();hmToggleWishlist(' + p.id + ',this)" aria-label="افزودن به علاقه‌مندی‌ها"><i class="fa ' + (inWl ? 'fa-heart' : 'fa-heart-o') + '"></i></button>' +
        '<img src="./img/' + p.image + '" alt="' + escName + '" loading="lazy" onerror="this.src=\'https://placehold.co/200x130?text=No+Image\'">' +
        '</div>' +
        '<div class="hm-pc-body">' +
        '<div class="hm-pc-category">' + (p.category || '') + '</div>' +
        '<div class="hm-pc-title">' + escName + '</div>' +
        '<div class="hm-pc-stars"><span class="star">' + stars + '</span><span class="rating-val">' + (r || '') + '</span></div>' +
        '<div class="hm-pc-prices">' +
        '<span class="hm-pc-price">' + (p.price ? p.price.toLocaleString() : '0') + '</span>' +
        '<span class="hm-pc-toman">تومان</span>' +
        (disc > 0 ? '<span class="hm-pc-oldprice">' + p.oldPrice.toLocaleString() + '</span>' : '') +
        '</div>' +
        '<div class="hm-pc-actions">' +
        '<button class="hm-pc-addcart" onclick="event.stopPropagation();hmAddToCart(this)" data-product="' + productDataAttr + '" ' + (p.stock === 0 ? 'disabled' : '') + '><i class="fa fa-cart-plus"></i> ' + (p.stock === 0 ? 'ناموجود' : 'افزودن') + '</button>' +
        '<a href="./product.html?id=' + p.id + '" class="hm-pc-view" aria-label="مشاهده محصول"><i class="fa fa-eye"></i></a>' +
        '</div>' +
        (p.stock > 0 && p.stock < 5 ? '<div class="hm-pc-stock"><i class="fa fa-clock" style="color:#ffc107"></i> فقط ' + p.stock + ' عدد باقی‌مانده</div>' : '') +
        '</div></div>';
}
window.hmRenderCard = renderCard;

function escNameAttr(obj) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function decodeProductAttr(encoded) {
    try {
        return JSON.parse(decodeURIComponent(escape(atob(encoded))));
    } catch(e) {
        return null;
    }
}

window.hmAddToCart = function(btn) {
    let encoded = btn.getAttribute('data-product');
    let product = decodeProductAttr(encoded);
    if (!product) return;
    if (typeof window.addToCart === 'function') {
        window.addToCart(product);
    }
};

/* ========== WISHLIST ========== */
function isInWishlist(id) {
    let wl = JSON.parse(localStorage.getItem('wishlist') || '[]');
    return wl.some(function(item) { return (item.id || item) == id; });
}
function hmToggleWishlist(id, btn) {
    let wl = JSON.parse(localStorage.getItem('wishlist') || '[]');
    let idx = wl.findIndex(function(item) { return (item.id || item) == id; });
    if (idx > -1) { wl.splice(idx, 1); if (btn) { btn.innerHTML = '<i class="fa fa-heart-o"></i>'; btn.classList.remove('active'); } }
    else { wl.push(id); if (btn) { btn.innerHTML = '<i class="fa fa-heart"></i>'; btn.classList.add('active'); } }
    localStorage.setItem('wishlist', JSON.stringify(wl));
}
window.hmToggleWishlist = hmToggleWishlist;

/* ========== FLASH SALE COUNTDOWN ========== */
function startCountdown() {
    let end = new Date();
    end.setHours(23, 59, 59, 0);
    function tick() {
        let d = end - new Date();
        if (d <= 0) { end.setDate(end.getDate() + 1); d = end - new Date(); }
        let h = Math.floor(d / 3600000);
        let m = Math.floor((d % 3600000) / 60000);
        let s = Math.floor((d % 60000) / 1000);
        let eh = document.getElementById('hmCdH');
        let em = document.getElementById('hmCdM');
        let es = document.getElementById('hmCdS');
        if (eh) eh.textContent = String(h).padStart(2, '0');
        if (em) em.textContent = String(m).padStart(2, '0');
        if (es) es.textContent = String(s).padStart(2, '0');
    }
    tick();
    setInterval(tick, 1000);

    let bar = document.getElementById('hmFlashProgressBar');
    if (bar) {
        let totalDay = 24 * 60 * 60 * 1000;
        function updateProgress() {
            let now = new Date();
            let endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            let remaining = endOfDay - now;
            let pct = ((totalDay - remaining) / totalDay) * 100;
            bar.style.width = pct + '%';
        }
        updateProgress();
        setInterval(updateProgress, 60000);
    }
}

/* ========== SECTION RENDERER ========== */
function renderSection(id, items, limit) {
    let el = document.getElementById(id);
    if (!el) return;
    if (!items || items.length === 0) {
        let sec = el.closest('section') || el.closest('.hm-reveal');
        if (sec) sec.style.display = 'none';
        return;
    }
    let max = limit || 10;
    let h = '';
    let shown = 0;
    items.forEach(function(p) {
        if (shown >= max) return;
        h += renderCard(p);
        shown++;
    });
    el.innerHTML = h;
}

/* ========== CATEGORIES ========== */
let categories = [
    { name: 'موبایل و تبلت', cat: 'mobile', icon: 'fa-mobile-alt' },
    { name: 'لپ‌تاپ و کامپیوتر', cat: 'laptop', icon: 'fa-laptop' },
    { name: 'لوازم جانبی', cat: 'accessory', icon: 'fa-headphones' },
    { name: 'گیمینگ', cat: 'gaming', icon: 'fa-gamepad' },
    { name: 'دوربین و عکاسی', cat: 'camera', icon: 'fa-camera' },
    { name: 'مانیتور', cat: 'monitor', icon: 'fa-desktop' },
    { name: 'لوازم خانگی', cat: 'home', icon: 'fa-blender' },
    { name: 'تلویزیون', cat: 'tv', icon: 'fa-tv' }
];

function renderCategories() {
    let g = document.getElementById('hmCatGrid');
    if (!g) return;
    let h = '';
    categories.forEach(function(c) {
        let count = ALL_PRODUCTS.filter(function(p) { return p.category === c.cat; }).length;
        h += '<a href="./category.html?category=' + c.cat + '" class="col-6 col-md-4 col-lg-3 hm-category-card" aria-label="' + c.name + '">' +
            '<div class="hm-category-icon"><i class="fa ' + c.icon + '"></i></div>' +
            '<div class="hm-category-name">' + c.name + '</div>' +
            '<div class="hm-category-count">' + count + ' محصول</div></a>';
    });
    g.innerHTML = h;
}

/* ========== BRANDS ========== */
let brandLogos = {
    'Samsung': 'fa-mobile-screen', 'Apple': 'fa-apple-whole', 'Xiaomi': 'fa-mobile-alt',
    'Sony': 'fa-headphones', 'LG': 'fa-tv', 'ASUS': 'fa-laptop',
    'Lenovo': 'fa-laptop', 'Dell': 'fa-desktop', 'Canon': 'fa-camera-retro',
    'Nintendo': 'fa-gamepad', 'Logitech': 'fa-mouse', 'JBL': 'fa-volume-high'
};

function renderBrands() {
    let g = document.getElementById('hmBrandsGrid');
    if (!g) return;
    let h = '';
    let brandNames = ['Samsung','Apple','Xiaomi','Sony','LG','ASUS','Lenovo','Dell','Canon','Nintendo','Logitech','JBL'];
    brandNames.forEach(function(b) {
        let icon = brandLogos[b] || 'fa-tag';
        h += '<div class="col-4 col-md-2"><a href="./category.html?brand=' + encodeURIComponent(b) + '" class="hm-brand-item hm-brand-link"><div class="hm-brand-icon"><i class="fa ' + icon + '"></i></div><span>' + b + '</span></a></div>';
    });
    g.innerHTML = h;
}

/* ========== SHOW MORE (MOBILE) ========== */
function initShowMore() {
    document.querySelectorAll('.hm-show-more-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            let target = this.getAttribute('data-target');
            let container = document.getElementById(target);
            if (!container) return;
            container.classList.toggle('expanded');
            this.textContent = container.classList.contains('expanded') ? 'بستن' : 'مشاهده بیشتر';
            this.classList.toggle('active', container.classList.contains('expanded'));
        });
    });
}

/* ========== TESTIMONIALS ========== */
let testimonials = [
    { name: 'مهدی رضایی', product: 'Galaxy A54', text: 'بعد از یک هفته استفاده، واقعاً کیفیتش عالیه. صفحه نمایش عالی و باتری خوبی داره. ارسال هم خیلی سریع بود.', rating: 5 },
    { name: 'سارا احمدی', product: 'iPhone 13', text: 'قیمتش نسبت به امکاناتش مناسبه. از خریدم راضیم و قبلاً هم از ارزان‌کالا خرید داشتم.', rating: 4 },
    { name: 'امیر حسینی', product: 'MacBook Air M2', text: 'مک‌بوک ایر فوق‌العاده‌ست. طراحی بی‌نظیر و عمر باطری عالی. وزن سبکش هم عالیه.', rating: 5 },
    { name: 'زهرا محمدی', product: 'AirPods Pro 2', text: 'کیفیت صدا عالیه و نویز کنسلینگ فوق‌العاده‌ست. فقط یک کم گرونه ولی ارزشش رو داره.', rating: 4 }
];

function renderTestimonials() {
    let g = document.getElementById('hmTestimonialsGrid');
    if (!g) return;
    let h = '';
    testimonials.forEach(function(t) {
        let stars = '';
        for (let i = 0; i < 5; i++) stars += '<i class="fa ' + (i < t.rating ? 'fa-star' : 'fa-star-o') + '"></i>';
        h += '<div class="col-md-6 col-lg-3"><div class="hm-testimonial-card">' +
            '<div class="d-flex align-items-center gap-3 mb-2"><div class="hm-testimonial-avatar">' + t.name.charAt(0) + '</div><div><div class="hm-testimonial-name">' + t.name + '</div><div class="hm-testimonial-stars">' + stars + '</div></div></div>' +
            '<div class="hm-testimonial-text">' + t.text + '</div>' +
            '<div class="hm-testimonial-product"><i class="fa fa-tag"></i> ' + t.product + '</div></div></div>';
    });
    g.innerHTML = h;
}

/* ========== NEWSLETTER CONFETTI ========== */
function hmSubscribeNews() {
    let email = document.getElementById('hmNewsEmail');
    if (!email) return;
    let val = email.value.trim();
    if (!val || !val.includes('@')) { hmShowNotif('لطفاً یک ایمیل معتبر وارد کنید', 'error'); return; }
    localStorage.setItem('subscribed', val);
    hmShowNotif('با موفقیت عضو شدید! کد تخفیف ۱۰٪ برای شما ارسال شد.');
    email.value = '';
    launchConfetti();
}
window.hmSubscribeNews = hmSubscribeNews;

function launchConfetti() {
    let colors = ['#00e676', '#ff5252', '#ffd740', '#40c4ff', '#e040fb', '#ff6e40'];
    for (let i = 0; i < 40; i++) {
        (function(idx) {
            setTimeout(function() {
                let piece = document.createElement('div');
                piece.className = 'hm-confetti-piece';
                piece.style.left = Math.random() * 100 + 'vw';
                piece.style.top = '-10px';
                piece.style.background = colors[Math.floor(Math.random() * colors.length)];
                piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
                piece.style.width = (6 + Math.random() * 8) + 'px';
                piece.style.height = (6 + Math.random() * 8) + 'px';
                piece.style.animation = 'hmConfettiFall ' + (2 + Math.random() * 2) + 's ease-out forwards';
                document.body.appendChild(piece);
                setTimeout(function() { if (piece.parentNode) piece.parentNode.removeChild(piece); }, 4000);
            }, idx * 30);
        })(i);
    }
}

/* ========== TOAST NOTIFICATION ========== */
function hmShowNotif(msg, type) {
    let c = document.getElementById('hmNotifContainer');
    if (!c) return;
    let n = document.createElement('div');
    n.className = 'hm-toast' + (type === 'error' ? ' error' : '');
    n.innerHTML = '<i class="fa ' + (type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle') + '" style="color:' + (type === 'error' ? '#ff5252' : 'var(--green-primary)') + '"></i> ' + msg;
    c.appendChild(n);
    setTimeout(function() { n.style.opacity = '0'; n.style.transition = 'opacity .3s'; setTimeout(function() { if (n.parentNode) n.parentNode.removeChild(n); }, 300); }, 3000);
}
window.hmShowNotif = hmShowNotif;

/* ========== BADGES ========== */
function updateBadges() {
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');
    let cartBadge = document.getElementById('hmCartBadge');
    let count = cart.reduce(function(s, i) { return s + (i.quantity || 1); }, 0);
    if (cartBadge) { cartBadge.textContent = count; cartBadge.style.display = count > 0 ? '' : 'none'; }
    let cmp = JSON.parse(localStorage.getItem('compareList') || '[]');
    let cmpBadge = document.getElementById('hmCmpBadge');
    if (cmpBadge) { cmpBadge.textContent = cmp.length; cmpBadge.style.display = cmp.length > 0 ? '' : 'none'; }
}

/* ========== ADMIN CHECK ========== */
function checkAdmin() {
    let userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            let user = JSON.parse(userStr);
            if (user.role === 'admin') {
                let an = document.getElementById('hmAdminNav');
                let ap = document.getElementById('hmAdminPill');
                if (an) an.classList.remove('d-none');
                if (ap) ap.style.display = '';
                let fa = document.getElementById('hmFooterAdmin');
                if (fa) fa.style.display = '';
            }
        } catch(e) {}
    }
}

/* ========== KEYBOARD NAVIGATION ========== */
function initAccessibility() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            let chatbot = document.getElementById('hmChatbotPanel');
            if (chatbot) chatbot.classList.remove('active');
            let cartMenu = document.getElementById('hmCartMenu');
            if (cartMenu) cartMenu.classList.remove('active');
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Tab') document.body.classList.add('keyboard-nav');
    });
    document.addEventListener('mousedown', function() {
        document.body.classList.remove('keyboard-nav');
    });
}

/* ========== HERO TYPING EFFECT ========== */
function initTypingEffect() {
    let el = document.getElementById('hmHeroTyping');
    if (!el) return;
    let words = ['موبايل', 'لپ‌تاپ', 'هدفون', 'مانیتور', 'دوربین'];
    let wordIdx = 0;
    let charIdx = 0;
    let isDeleting = false;
    function tick() {
        let current = words[wordIdx];
        if (isDeleting) {
            charIdx--;
            el.textContent = current.substring(0, charIdx);
        } else {
            charIdx++;
            el.textContent = current.substring(0, charIdx);
        }
        let speed = isDeleting ? 50 : 100;
        if (!isDeleting && charIdx === current.length) {
            speed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIdx === 0) {
            isDeleting = false;
            wordIdx = (wordIdx + 1) % words.length;
            speed = 500;
        }
        setTimeout(tick, speed);
    }
    setTimeout(tick, 1500);
}

/* ========== MAIN INIT ========== */
document.addEventListener('DOMContentLoaded', async function() {
    let style = document.createElement('style');
    style.textContent = '.keyboard-nav *:focus{outline:2px solid var(--green-primary) !important;outline-offset:2px}';
    document.head.appendChild(style);

    initParticles();
    initHeroSlider();
    initScrollReveal();
    initBackToTop();
    initNavbarScroll();
    initAccessibility();
    initTypingEffect();
    setupAutocomplete('hmNavSearch', 'hmNavAutocomplete');
    setupAutocomplete('hmHeroSearch', 'hmHeroAutocomplete');
    let mobileSearch = document.getElementById('hmMobileSearch');
    if (mobileSearch) setupAutocomplete('hmMobileSearch', 'hmMobileAutocomplete');

    renderTestimonials();
    updateBadges();
    checkAdmin();

    await loadProducts();
    renderCategories();
    renderBrands();
    initShowMore();

    // Flash Sale - only discounted & in stock
    let discounted = ALL_PRODUCTS.filter(function(p) { return p.oldPrice && p.oldPrice > p.price && p.stock > 0; });
    if (discounted.length > 0) {
        document.getElementById('hmFlashSec').style.display = '';
        renderSection('hmFlashProds', discounted);
        startCountdown();
        // Mark flash sale IDs so other sections don't repeat them
        discounted.forEach(function(p) { FLASH_USED_IDS[p.id] = true; });
    }

    // Bestsellers - exclude flash sale items
    let bestsellers = ALL_PRODUCTS.filter(function(p) { return !FLASH_USED_IDS[p.id]; })
        .sort(function(a,b) { return (b.purchaseCount||0) - (a.purchaseCount||0); });
    renderSection('hmBestSellers', bestsellers);

    // New products - exclude flash sale items
    let newProds = ALL_PRODUCTS.filter(function(p) { return !FLASH_USED_IDS[p.id]; })
        .sort(function(a,b) { return b.id - a.id; });
    renderSection('hmNewProds', newProds);

    // Discounted - exclude flash sale items, sort by highest discount %
    let discountedOnly = ALL_PRODUCTS.filter(function(p) {
        return p.oldPrice && p.oldPrice > p.price && !FLASH_USED_IDS[p.id];
    }).sort(function(a,b) {
        let da = ((a.oldPrice - a.price) / a.oldPrice) * 100;
        let db = ((b.oldPrice - b.price) / b.oldPrice) * 100;
        return db - da;
    });
    renderSection('hmDiscountedProds', discountedOnly);

    // Recommended - exclude flash sale items
    let recommended = ALL_PRODUCTS.filter(function(p) { return !FLASH_USED_IDS[p.id]; })
        .sort(function() { return 0.5 - Math.random(); });
    renderSection('hmRecommended', recommended);

    // Update stat
    let statEl = document.getElementById('hmStatProds');
    if (statEl) statEl.textContent = ALL_PRODUCTS.length + '+';

    // Intercept addToCart to update badge
    if (window.addToCart) {
        let origAddToCart = window.addToCart;
        window.addToCart = function(p) {
            origAddToCart(p);
            setTimeout(updateBadges, 100);
        };
    }
});

/* ========== STORAGE LISTENER ========== */
window.addEventListener('storage', function(e) {
    if (e.key === 'cart' || e.key === 'compareList') updateBadges();
});

/* ========== SERVICE WORKER ========== */
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(function() {});
}

})();
