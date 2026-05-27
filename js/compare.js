let compareList = JSON.parse(localStorage.getItem('compareList')) || [];

function addToCompare(product) {
    if (compareList.length >= 4) {
        alert('❌ حداکثر می‌توانید ۴ محصول را مقایسه کنید');
        return;
    }
    
    if (compareList.some(item => item.id === product.id)) {
        alert('⚠️ این محصول قبلاً به لیست مقایسه اضافه شده');
        return;
    }
    
    compareList.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category
    });
    
    localStorage.setItem('compareList', JSON.stringify(compareList));
    updateCompareUI();
    alert('✅ محصول به لیست مقایسه اضافه شد');
}

function removeFromCompare(id) {
    compareList = compareList.filter(item => item.id !== id);
    localStorage.setItem('compareList', JSON.stringify(compareList));
    updateCompareUI();
    
    if (window.location.pathname.includes('compare.html')) {
        displayCompareProducts();
    }
}

function clearCompare() {
    if (confirm('آیا از حذف همه محصولات از لیست مقایسه اطمینان دارید؟')) {
        compareList = [];
        localStorage.setItem('compareList', JSON.stringify(compareList));
        updateCompareUI();
        
        if (window.location.pathname.includes('compare.html')) {
            displayCompareProducts();
        }
    }
}

function getCompareCount() {
    return compareList.length;
}

function updateCompareUI() {
    document.querySelectorAll('.compare-counter').forEach(el => {
        if (el) el.textContent = getCompareCount();
    });
}

function displayCompareProducts() {
    const container = document.getElementById('compareContent');
    if (!container) return;
    
    if (compareList.length === 0) {
        container.innerHTML = `
            <div class="empty-compare">
                <i class="fa fa-balance-scale fa-4x"></i>
                <h4>لیست مقایسه خالی است</h4>
                <p class="text-muted">برای مقایسه محصولات، از صفحه محصولات به لیست مقایسه اضافه کنید</p>
                <a href="./category.html" class="btn btn-success mt-3">مشاهده محصولات</a>
            </div>
        `;
        return;
    }
    
    if (typeof productsDatabase === 'undefined') {
        container.innerHTML = '<div class="alert alert-danger">خطا در بارگذاری اطلاعات محصولات</div>';
        return;
    }
    
    const products = compareList.map(p => 
        productsDatabase.find(prod => prod.id === p.id)
    ).filter(p => p !== undefined);
    
    let html = '<div class="compare-table"><table><tr><th>مشخصات</th>';
    
    products.forEach(p => {
        html += `<th>${p.name}</th>`;
    });
    html += '</tr>';
    
    html += '<tr><td>تصویر</td>';
    products.forEach(p => {
        html += `
            <td>
                <div class="product-compare-card">
                    <img src="./img/${p.image}" onerror="this.src='https://via.placeholder.com/100'">
                    <div class="name">${p.name}</div>
                    <div class="price">${p.price.toLocaleString()} تومان</div>
                    <button onclick="removeFromCompare(${p.id});" class="btn-compare-remove">
                        <i class="fa fa-times ms-1"></i> حذف
                    </button>
                    <button onclick="addToCart({id: ${p.id}, name: '${p.name}', price: ${p.price}, image: '${p.image}'})" class="btn btn-success btn-sm w-100 mt-2">
                        <i class="fa fa-cart-plus"></i> افزودن به سبد
                    </button>
                </div>
            </td>
        `;
    });
    html += '</tr>';
    
    const specKeys = ['صفحه نمایش', 'دوربین', 'رم', 'حافظه', 'باتری', 'پردازنده', 'سیستم عامل', 'وزن'];
    
    specKeys.forEach(key => {
        html += `<tr><td>${key}</td>`;
        products.forEach(p => {
            let value = '---';
            if (p.specs && p.specs[key]) {
                value = p.specs[key];
            } else {
                for (let specKey in p.specs) {
                    if (specKey.includes(key) || key.includes(specKey)) {
                        value = p.specs[specKey];
                        break;
                    }
                }
            }
            html += `<td>${value}</td>`;
        });
        html += '</tr>';
    });
    
    html += '<tr><td>قیمت</td>';
    products.forEach(p => {
        html += `<td class="text-success fw-bold">${p.price.toLocaleString()} تومان</td>`;
    });
    html += '</tr>';
    
    html += '<tr><td>رتبه</td>';
    products.forEach(p => {
        const rating = p.rating || '---';
        html += `<td>${rating} <i class="fa fa-star" style="color: #ffc107;"></i></td>`;
    });
    html += '</tr>';
    
    html += '<tr><td>موجودی</td>';
    products.forEach(p => {
        if (p.stock > 0) {
            html += `<td class="feature-match">${p.stock} عدد</td>`;
        } else {
            html += `<td class="feature-no-match">ناموجود</td>`;
        }
    });
    html += '</tr>';
    
    html += '</table></div>';
    
    container.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
    updateCompareUI();
    
    if (window.location.pathname.includes('compare.html')) {
        if (typeof productsDatabase !== 'undefined') {
            displayCompareProducts();
        } else {
            setTimeout(() => {
                if (typeof productsDatabase !== 'undefined') {
                    displayCompareProducts();
                }
            }, 500);
        }
    }
});

window.addToCompare = addToCompare;
window.removeFromCompare = removeFromCompare;
window.clearCompare = clearCompare;
window.getCompareCount = getCompareCount;
window.displayCompareProducts = displayCompareProducts;