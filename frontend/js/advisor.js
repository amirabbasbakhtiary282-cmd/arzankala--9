var currentProducts = [];
var userHistoryProducts = [];
var allProducts = [];
let sentimentCache = {};

document.addEventListener('DOMContentLoaded', async function () {
    let profile = JSON.parse(localStorage.getItem('profile'));
    if (!profile) {
        window.location.href = 'choose.html';
        return;
    }
    displayProfile(profile);
    await recommendProducts(profile);
    setupAddAllButton();
    setupInstallmentCalculator();
});

function displayProfile(profile) {
    let container = document.getElementById('profileDisplay');
    if (!container) return;
    let profileMap = {
        gaming: { name: 'گیمر حرفه‌ای', icon: 'fa-gamepad' },
        student: { name: 'دانشجو/دانش‌آموز', icon: 'fa-graduation-cap' },
        office: { name: 'کارمند/اداری', icon: 'fa-briefcase' },
        normal: { name: 'کاربر معمولی', icon: 'fa-user' }
    };
    let budgetMap = {
        low: { name: 'بودجه اقتصادی', color: '#ffc107' },
        medium: { name: 'بودجه متوسط', color: '#00c853' },
        high: { name: 'بودجه نامحدود', color: '#00c853' }
    };
    let urgencyMap = { urgent: 'نیاز فوری', normal: 'زمان کافی', patient: 'خرید هوشمند' };
    let pi = profileMap[profile.usage] || profileMap.normal;
    let bi = budgetMap[profile.budget] || budgetMap.medium;
    let ui = urgencyMap[profile.urgency] || '';
    container.innerHTML =
        '<div class="d-flex align-items-center justify-content-center gap-3 flex-wrap">' +
        '<span class="badge p-3" style="background:linear-gradient(135deg,#00c853,#008040);border-radius:30px;font-size:0.9rem;">' +
        '<i class="fa ' + pi.icon + ' ms-1"></i> ' + pi.name + '</span>' +
        '<span class="badge p-3" style="background:#1a1e1d;border:2px solid ' + bi.color + ';border-radius:30px;font-size:0.9rem;color:' + bi.color + ';">' +
        '<i class="fa fa-tag ms-1"></i> ' + bi.name + '</span>' +
        '<span class="badge p-3" style="background:rgba(255,193,7,0.2);border:1px solid #ffc107;border-radius:30px;font-size:0.9rem;color:#ffc107;">' +
        '<i class="fa fa-clock ms-1"></i> ' + ui + '</span>' +
        '</div>';
}

async function recommendProducts(profile) {
    let container = document.getElementById('recommendedProducts');
    if (!container) return;
    container.innerHTML =
        '<div class="col-12 text-center py-5">' +
        '<i class="fa fa-spinner fa-spin fa-3x mb-3" style="color:#00c853;"></i>' +
        '<p class="text-muted">هوش مصنوعی در حال تحلیل محصولات برای شماست...</p></div>';
    try {
        let result = await API.getProducts({limit: 100});
        if (result && result.success && result.data) allProducts = result.data;
    } catch (e) {}
    if (!allProducts || allProducts.length === 0) {
        if (typeof productsDatabase !== 'undefined') allProducts = [...productsDatabase];
    }
    let cartHistory = JSON.parse(localStorage.getItem('cartHistory') || '[]');
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    let currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    let viewedStr = localStorage.getItem('viewedProducts');
    let viewedProducts = viewedStr ? JSON.parse(viewedStr) : [];
    let historyIds = [];
    cartHistory.forEach(function (item) { if (item.id && historyIds.indexOf(item.id) === -1) historyIds.push(item.id); });
    wishlist.forEach(function (item) { if (item.id && historyIds.indexOf(item.id) === -1) historyIds.push(item.id); });
    viewedProducts.forEach(function (id) { if (historyIds.indexOf(id) === -1) historyIds.push(id); });
    userHistoryProducts = allProducts.filter(function (p) { return historyIds.indexOf(p.id) !== -1; });
    let budgetNum = { low: 10000000, medium: 25000000, high: 50000000 }[profile.budget] || 20000000;
    let usage = profile.usage || 'normal';
    let urgency = profile.urgency || 'normal';
    let scored = [];
    for (let i = 0; i < allProducts.length; i++) {
        let p = allProducts[i];
        let detail = await calculateDetailedScore(p, usage, budgetNum, urgency, historyIds, currentCart);
        scored.push(detail);
    }
    scored.sort(function (a, b) { return b.totalScore - a.totalScore; });
    currentProducts = scored.slice(0, 8);
    displayProducts(currentProducts, profile);
}

async function calculateDetailedScore(product, usage, budgetNum, urgency, historyIds, currentCart) {
    let reasons = [];
    let totalScore = 0;
    let stock = product.stock || 0;
    if (stock > 20) { totalScore += 12; reasons.push('موجودی بالا'); }
    else if (stock > 10) { totalScore += 8; reasons.push('موجودی کافی'); }
    else if (stock > 5) { totalScore += 5; reasons.push('موجودی متوسط'); }
    else if (stock > 0) { totalScore += 2; }
    else { totalScore -= 20; reasons.push('ناموجود'); }
    let rating = product.rating || 0;
    if (rating >= 4.5) { totalScore += 20; reasons.push('امتیاز عالی'); }
    else if (rating >= 4) { totalScore += 14; reasons.push('امتیاز خوب'); }
    else if (rating >= 3.5) { totalScore += 7; reasons.push('امتیاز متوسط'); }
    else if (rating >= 3) { totalScore += 3; }
    if (product.oldPrice && product.oldPrice > product.price) {
        let discount = ((product.oldPrice - product.price) / product.oldPrice) * 100;
        if (discount >= 30) { totalScore += 30; reasons.push('تخفیف ویژه'); }
        else if (discount >= 20) { totalScore += 20; reasons.push('تخفیف عالی'); }
        else if (discount >= 10) { totalScore += 10; reasons.push('تخفیف خوب'); }
        else if (discount >= 5) { totalScore += 5; }
    }
    let catMatch = { gaming: ['laptop', 'monitor', 'gaming'], student: ['laptop', 'tablet', 'mobile'], office: ['laptop', 'monitor', 'accessory'], normal: ['mobile', 'laptop', 'tablet', 'accessory', 'camera', 'monitor', 'gaming'] };
    let matched = catMatch[usage] || catMatch.normal;
    if (matched.indexOf(product.category) !== -1) {
        totalScore += 12;
        let catNames = { mobile: 'موبایل', laptop: 'لپ‌تاپ', tablet: 'تبلت', accessory: 'لوازم جانبی', camera: 'دوربین', monitor: 'مانیتور', gaming: 'گیمینگ', home: 'خانگی', tv: 'تلویزیون' };
        reasons.push('مناسب ' + (catNames[product.category] || product.category));
    }
    if (product.price <= budgetNum) {
        totalScore += 18;
        if (product.price <= budgetNum * 0.5) totalScore += 7;
        else if (product.price <= budgetNum * 0.7) totalScore += 4;
        reasons.push('در بودجه شما');
    } else {
        totalScore -= 15;
        reasons.push('بالاتر از بودجه');
    }
    if (urgency === 'urgent' && stock > 3) { totalScore += 18; reasons.push('موجود برای خرید فوری'); }
    if (urgency === 'patient') {
        let discountScore = product.oldPrice && product.oldPrice > product.price ? ((product.oldPrice - product.price) / product.oldPrice) * 100 : 0;
        if (discountScore >= 15) totalScore += 10;
        else totalScore += 5;
        reasons.push('مناسب خرید هوشمند');
    }
    if (userHistoryProducts.length > 0) {
        let isInHistory = historyIds.indexOf(product.id) !== -1;
        if (isInHistory) {
            totalScore += 15;
            reasons.push('بازدید شده توسط شما');
            let inCart = currentCart.some(function (c) { return c.id === product.id; });
            if (inCart) { totalScore += 10; reasons.push('در سبد خرید شما'); }
        }
    }
    try {
        let sentiment = sentimentCache[product.id];
        if (!sentiment) {
            sentiment = await API.getAISentimentSummary(product.id);
            sentimentCache[product.id] = sentiment;
        }
        if (sentiment && sentiment.analyzed > 0) {
            if (sentiment.positivePercent >= 70) { totalScore += 15; reasons.push(sentiment.analyzed + ' نظر: ' + sentiment.positivePercent + '% مثبت'); }
            else if (sentiment.positivePercent >= 50) { totalScore += 8; reasons.push(sentiment.analyzed + ' نظر: اکثراً مثبت'); }
            else if (sentiment.negativePercent >= 50) { totalScore -= 10; reasons.push('نظرات منفی较多'); }
        }
    } catch (e) {}
    try {
        let prediction = await API.getPricePrediction(product.id);
        if (prediction && prediction.advice) {
            if (prediction.advice.indexOf('همین الان بخرید') !== -1) totalScore += 10;
            else if (prediction.advice.indexOf('منتظر کاهش') !== -1 && urgency !== 'urgent') totalScore += 8;
        }
    } catch (e) {}
    return { product: product, totalScore: totalScore, reasons: reasons.slice(0, 4) };
}

function displayProducts(scoredProducts, profile) {
    let container = document.getElementById('recommendedProducts');
    if (!container) return;
    let categoryHints = { gaming: ['لپ‌تاپ', 'مانیتور'], student: ['لپ‌تاپ', 'تبلت', 'موبایل'], office: ['لپ‌تاپ', 'مانیتور', 'لوازم جانبی'], normal: ['موبایل', 'لپ‌تاپ', 'تبلت', 'لوازم جانبی'] };
    if (!scoredProducts || scoredProducts.length === 0) {
        let usage = (profile && profile.usage) || 'normal';
        let hints = categoryHints[usage] || categoryHints.normal;
        container.innerHTML =
            '<div class="col-12 text-center py-5">' +
            '<i class="fa fa-search fa-3x mb-3 text-muted"></i>' +
            '<h5 class="text-white">محصولی یافت نشد</h5>' +
            '<p class="text-muted mb-1">با مشخصات فعلی محصولی مطابق نیاز شما وجود ندارد.</p>' +
            '<p class="text-muted small">دسته‌های پیشنهادی: <strong class="text-success">' + hints.join('، ') + '</strong></p>' +
            '<a href="./choose.html" class="btn btn-success mt-2"><i class="fa fa-edit ms-1"></i> ویرایش مشخصات</a> ' +
            '<a href="./category.html" class="btn btn-outline-success mt-2 ms-2"><i class="fa fa-store ms-1"></i> مشاهده همه محصولات</a>' +
            '</div>';
        return;
    }
    let usage = (profile && profile.usage) || 'normal';
    let hints = categoryHints[usage] || categoryHints.normal;
    let topScore = Math.max.apply(null, scoredProducts.map(function (s) { return s.totalScore; })) || 1;
    let html = '<div class="text-center mb-4"><small class="text-white-50" style="opacity:0.5;"><i class="fa fa-lightbulb text-warning ms-1"></i> پیشنهاد شده برای ' + hints.join('، ') + '</small></div>';
    html += '<div class="row g-3 g-md-4">';
    for (let i = 0; i < scoredProducts.length; i++) {
        let item = scoredProducts[i];
        let p = item.product;
        let score = item.totalScore;
        let reasons = item.reasons || [];
        let percent = Math.min(Math.round((score / topScore) * 100), 100);
        let rank = i === 0 ? 'انتخاب اول' : i === 1 ? 'انتخاب دوم' : i === 2 ? 'انتخاب سوم' : '';
        let discount = p.oldPrice && p.oldPrice > p.price ? Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100) : 0;
        let rankBadge = '';
        if (i === 0) rankBadge = '<span class="rank-badge" style="background:linear-gradient(135deg,#ffd700,#ff6b00);color:#000;"><i class="fa fa-crown ms-1"></i> برترین</span>';
        else if (i < 3) rankBadge = '<span class="rank-badge" style="background:rgba(0,200,83,0.9);color:#fff;">' + rank + '</span>';
        html += '<div class="col-6 col-md-3 mb-3">' +
            '<div class="product-card-modern h-100" style="border-color:' + (i === 0 ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.06)') + ';">' +
            '<div class="card-glow"></div>' +
            '<div class="product-img-wrap">' +
            rankBadge +
            (discount > 0 ? '<span class="discount-badge">-' + discount + '%</span>' : '') +
            '<img src="./img/' + p.image + '" alt="' + escapeHtml(p.name) + '" loading="lazy" onerror="this.src=\'https://placehold.co/200x150?text=No+Image\'">' +
            (p.stock > 0 && p.stock < 5 ? '<span class="stock-low"><i class="fa fa-clock ms-1"></i>فقط ' + p.stock + ' عدد</span>' : '') +
            '</div>' +
            '<div class="product-info">' +
            '<div class="product-title">' + escapeHtml(p.name) + '</div>' +
            '<div class="d-flex justify-content-between align-items-center mb-1">' +
            '<div><span class="price-tag">' + p.price.toLocaleString() + '</span><small class="text-white-50" style="font-size:0.65rem;"> تومان</small></div>' +
            (p.rating ? '<span style="background:rgba(255,215,0,0.15);color:#ffd700;font-size:0.65rem;padding:2px 8px;border-radius:10px;"><i class="fa fa-star" style="font-size:0.6rem;"></i> ' + p.rating + '</span>' : '') +
            '</div>' +
            (p.oldPrice && p.oldPrice > p.price ? '<div class="old-price-tag mb-1">' + p.oldPrice.toLocaleString() + ' تومان</div>' : '') +
            '<div class="score-bar-wrap"><div class="score-bar" style="background:' + (percent >= 70 ? '#00c853' : percent >= 40 ? '#ffc107' : '#ff5252') + ';--score-width:' + percent + '%;"></div></div>' +
            '<div class="mb-1" style="min-height:20px;">' +
            reasons.slice(0, 2).map(function (r) { return '<span class="reason-tag">' + r + '</span>'; }).join('') +
            '</div>' +
            '<div class="d-flex gap-2 mt-1">' +
            '<button onclick=\'addToCart({id:' + p.id + ',name:"' + escapeHtml(p.name) + '",price:' + p.price + ',image:"' + p.image + '"})\' class="btn-modern btn-add-cart"' + (p.stock === 0 ? ' disabled' : '') + '>' +
            '<i class="fa fa-cart-plus ms-1"></i> افزودن</button>' +
            '<a href="./product.html?id=' + p.id + '" class="btn-modern btn-view"><i class="fa fa-eye"></i></a>' +
            '</div>' +
            '<div class="stock-indicator mt-1"><i class="fa ' + (p.stock > 0 ? 'fa-check-circle text-success' : 'fa-times-circle text-danger') + '"></i> ' + (p.stock > 0 ? p.stock + ' عدد در انبار' : 'ناموجود') + '</div>' +
            '</div></div></div>';
    }
    html += '</div>';
    html += '<div class="ai-box-modern mt-4">' +
        '<div class="d-flex align-items-center gap-3">' +
        '<i class="fa fa-robot" style="color:#00c853;font-size:2.2rem;filter:drop-shadow(0 0 10px rgba(0,200,83,0.3));"></i>' +
        '<div><strong class="text-success fw-bold">هوش مصنوعی ارزان‌کالا</strong><br>' +
        '<span class="text-white-50 small" style="opacity:0.6;">این ' + scoredProducts.length + ' محصول با تحلیل هوشمند بر اساس <strong>نوع استفاده</strong>، <strong>بودجه</strong>، <strong>فوریت نیاز</strong>، <strong>نظرات کاربران</strong>، <strong>تخفیف‌ها</strong> و <strong>پیش‌بینی قیمت</strong> انتخاب شده‌اند.</span></div>' +
        '</div></div>';
    container.innerHTML = html;
    setTimeout(function() {
        document.querySelectorAll('.score-bar').forEach(function(el) {
            el.classList.add('animate');
        });
    }, 300);
}

function setupAddAllButton() {
    let btn = document.getElementById('addAllToCart');
    if (!btn) return;
    btn.onclick = function () {
        if (!currentProducts || currentProducts.length === 0) { alert('محصولی برای افزودن وجود ندارد'); return; }
        let added = 0, skipped = 0;
        let currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
        for (let i = 0; i < currentProducts.length; i++) {
            let product = currentProducts[i].product || currentProducts[i];
            if (product.stock === 0) continue;
            let existing = false;
            for (let j = 0; j < currentCart.length; j++) { if (currentCart[j].id === product.id) { existing = true; break; } }
            if (!existing) {
                if (typeof window.addToCartSilent === 'function') { window.addToCartSilent({ id: product.id, name: product.name, price: product.price, image: product.image }); }
                else { addToCart({ id: product.id, name: product.name, price: product.price, image: product.image }); }
                added++;
                currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
            } else { skipped++; }
        }
        if (added > 0) { let msg = added + ' محصول جدید به سبد خرید اضافه شد'; if (skipped > 0) msg += ' (' + skipped + ' محصول تکراری)'; alert(msg); if (typeof window.updateCartUI === 'function') window.updateCartUI(); }
        else if (skipped > 0) { alert('همه این محصولات قبلاً در سبد خرید هستند'); }
    };
}

function setupInstallmentCalculator() {
    let container = document.getElementById('buyTimeStatus');
    if (!container) return;
    container.innerHTML =
        '<div class="installment-modern mt-4">' +
        '<h5 class="text-success mb-3 fw-bold"><i class="fa fa-calculator ms-2"></i> ماشین حساب اقساط</h5>' +
        '<div class="row g-3">' +
        '<div class="col-md-6"><div class="mb-3"><label class="form-label text-white-50 small">مبلغ محصول (تومان)</label>' +
        '<input type="number" id="installmentPrice" class="form-control" style="background:#0a0c0b;border:1px solid #2a2f2e;color:white;border-radius:12px;" placeholder="مثلاً ۲۰۰۰۰۰۰۰" value="20000000">' +
        '</div></div>' +
        '<div class="col-md-3"><div class="mb-3"><label class="form-label text-white-50 small">درصد پیش‌پرداخت</label>' +
        '<select id="installmentDownPayment" class="form-select" style="background:#0a0c0b;border:1px solid #2a2f2e;color:white;border-radius:12px;">' +
        '<option value="0">۰٪</option><option value="10">۱۰٪</option><option value="20" selected>۲۰٪</option><option value="30">۳۰٪</option><option value="40">۴۰٪</option><option value="50">۵۰٪</option>' +
        '</select></div></div>' +
        '<div class="col-md-3"><div class="mb-3"><label class="form-label text-white-50 small">مدت (ماه)</label>' +
        '<select id="installmentMonths" class="form-select" style="background:#0a0c0b;border:1px solid #2a2f2e;color:white;border-radius:12px;">' +
        '<option value="6">۶ ماه</option><option value="12" selected>۱۲ ماه</option><option value="18">۱۸ ماه</option><option value="24">۲۴ ماه</option><option value="36">۳۶ ماه</option>' +
        '</select></div></div>' +
        '<div class="col-md-6"><div class="mb-3"><label class="form-label text-white-50 small">کارمزد سالانه (٪)</label>' +
        '<input type="number" id="installmentInterest" class="form-control" style="background:#0a0c0b;border:1px solid #2a2f2e;color:white;border-radius:12px;" value="18" step="0.1" min="0" max="36">' +
        '</div></div>' +
        '<div class="col-md-6 d-flex align-items-end"><button id="calcInstallmentBtn" class="btn btn-success w-100" style="border-radius:12px;padding:12px;"><i class="fa fa-calculator ms-2"></i> محاسبه اقساط</button></div>' +
        '</div>' +
        '<div id="installmentResult" class="mt-3 p-3" style="background:#0a0c0b;border-radius:16px;display:none;">' +
        '<div class="row g-2">' +
        '<div class="col-6 col-md-3"><div class="text-center p-2" style="background:#111413;border-radius:12px;"><div class="text-white-50 small">پیش‌پرداخت</div><div class="text-warning fw-bold" id="downPaymentAmount">۰</div></div></div>' +
        '<div class="col-6 col-md-3"><div class="text-center p-2" style="background:#111413;border-radius:12px;"><div class="text-white-50 small">مبلغ وام</div><div class="text-info fw-bold" id="loanAmount">۰</div></div></div>' +
        '<div class="col-6 col-md-3"><div class="text-center p-2" style="background:#111413;border-radius:12px;"><div class="text-white-50 small">کارمزد کل</div><div class="text-danger" id="totalInterest">۰</div></div></div>' +
        '<div class="col-6 col-md-3"><div class="text-center p-2" style="background:#111413;border-radius:12px;border:1px solid #00c853;"><div class="text-white-50 small">قسط ماهانه</div><div class="text-success fw-bold fs-5" id="monthlyPayment">۰</div></div></div>' +
        '</div>' +
        '<div class="mt-2 text-center"><span class="text-muted small">مبلغ کل پرداختی: </span><span class="fw-bold" id="totalPayment">۰</span><span class="text-muted small"> تومان</span></div>' +
        '</div></div>';
    let calcBtn = document.getElementById('calcInstallmentBtn');
    if (calcBtn) calcBtn.addEventListener('click', calculateInstallment);
    setTimeout(calculateInstallment, 200);
}

function calculateInstallment() {
    let price = parseFloat(document.getElementById('installmentPrice')?.value) || 0;
    let downPercent = parseFloat(document.getElementById('installmentDownPayment')?.value) || 0;
    let months = parseFloat(document.getElementById('installmentMonths')?.value) || 12;
    let yearlyInterest = parseFloat(document.getElementById('installmentInterest')?.value) || 18;
    if (price <= 0) { document.getElementById('installmentResult').style.display = 'none'; return; }
    let downPayment = price * (downPercent / 100);
    let loanAmount = price - downPayment;
    let monthlyInterest = (yearlyInterest / 12) / 100;
    let totalInterest = loanAmount * monthlyInterest * months;
    let totalPayment = loanAmount + totalInterest;
    let monthlyPayment = months > 0 ? totalPayment / months : 0;
    setText('downPaymentAmount', downPayment.toLocaleString() + ' تومان');
    setText('loanAmount', loanAmount.toLocaleString() + ' تومان');
    setText('totalInterest', totalInterest.toLocaleString() + ' تومان');
    setText('monthlyPayment', monthlyPayment.toLocaleString() + ' تومان');
    setText('totalPayment', totalPayment.toLocaleString());
    document.getElementById('installmentResult').style.display = 'block';
}

function setText(id, text) {
    let el = document.getElementById(id);
    if (el) el.textContent = text;
}

function escapeHtml(text) {
    if (!text) return '';
    let div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.addEventListener('load', function () {
    let viewed = JSON.parse(localStorage.getItem('viewedProducts') || '[]');
    let profile = JSON.parse(localStorage.getItem('profile'));
    if (profile) {
        let keep = viewed.slice(-30);
        localStorage.setItem('viewedProducts', JSON.stringify(keep));
    }
});
