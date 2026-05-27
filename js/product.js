

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ product.js loaded');
    
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    
    if (!productId) {
        window.location.href = 'category.html';
        return;
    }
    
    if (typeof getProductById === 'undefined') {
        console.error('❌ products-data.js لود نشده');
        return;
    }
    
    const product = getProductById(productId);
    
    if (!product) {
        alert('محصول مورد نظر یافت نشد');
        window.location.href = 'category.html';
        return;
    }
    
    displayProductDetails(product);
    displayRelatedProducts(product);
});

function displayProductDetails(product) {
    // تصویر
    const mainImage = document.getElementById('mainImage');
    if (mainImage) {
        mainImage.src = `img/${product.image}`;
        mainImage.onerror = function() {
            this.src = 'https://via.placeholder.com/600x400?text=' + product.name;
        };
    }
    
    // عنوان
    const nameEl = document.getElementById('productName');
    if (nameEl) nameEl.textContent = product.name;
    
    // قیمت
    const priceEl = document.getElementById('productPrice');
    if (priceEl) priceEl.textContent = product.price.toLocaleString() + ' تومان';
    
    // قیمت قدیم و تخفیف
    if (product.oldPrice) {
        const oldPriceEl = document.getElementById('productOldPrice');
        if (oldPriceEl) {
            oldPriceEl.textContent = product.oldPrice.toLocaleString() + ' تومان';
            oldPriceEl.style.display = 'inline';
        }
        
        const discount = Math.round((1 - product.price / product.oldPrice) * 100);
        const badgeEl = document.getElementById('discountBadge');
        if (badgeEl) {
            badgeEl.textContent = discount + '% تخفیف';
            badgeEl.style.display = 'inline-block';
        }
    }
    
    // توضیحات
    const descEl = document.getElementById('productDesc');
    if (descEl) descEl.textContent = product.description || 'توضیحاتی برای این محصول ثبت نشده است.';
    
    // مشخصات فنی
    const specsTable = document.getElementById('specsTable');
    if (specsTable && product.specs) {
        specsTable.innerHTML = Object.entries(product.specs)
            .map(([key, value]) => `
                <tr>
                    <td class="fw-bold bg-light" style="width: 40%;">${key}</td>
                    <td>${value}</td>
                </tr>
            `).join('');
    }
    
    // موجودی
    const stockInfo = document.getElementById('stockInfo');
    if (stockInfo) {
        if (product.stock > 0) {
            stockInfo.className = 'text-success';
            stockInfo.innerHTML = `<i class="fa fa-check-circle"></i> ${product.stock} عدد موجود در انبار`;
            const addBtn = document.getElementById('addToCartBtn');
            if (addBtn) addBtn.disabled = false;
        } else {
            stockInfo.className = 'text-danger';
            stockInfo.innerHTML = '<i class="fa fa-times-circle"></i> ناموجود';
            const addBtn = document.getElementById('addToCartBtn');
            if (addBtn) addBtn.disabled = true;
        }
    }
    
    // دکمه افزودن به سبد
    const addBtn = document.getElementById('addToCartBtn');
    if (addBtn) {
        addBtn.onclick = function() {
            addToCart({
                id: product.id,
                name: product.name,
                price: product.price,
                image: product.image
            });
        };
    }
}

function displayRelatedProducts(product) {
    const related = getRelatedProducts(product.id, 4);
    const container = document.getElementById('relatedProducts');
    
    if (!container) return;
    
    if (related.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-secondary py-4">محصول مشابهی یافت نشد</div>';
        return;
    }
    
    container.innerHTML = related.map(p => `
        <div class="col-6 col-md-3 mb-3">
            <div class="card h-100">
                <img src="./img/${p.image}" class="card-img-top" alt="${p.name}" 
                     style="height: 120px; object-fit: cover;"
                     onerror="this.src='https://via.placeholder.com/300x200?text=${p.name}'">
                <div class="card-body p-2">
                    <h6 class="card-title small fw-bold">${p.name}</h6>
                    <div class="text-success small fw-bold">${p.price.toLocaleString()} تومان</div>
                    <a href="./product.html?id=${p.id}" class="btn btn-outline-success btn-sm w-100 mt-2">
                        مشاهده
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}