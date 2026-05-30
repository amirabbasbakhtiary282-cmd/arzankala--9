(function() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    function updateCartUI() {
        const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        document.querySelectorAll('.total__counter').forEach(el => {
            if (el) el.textContent = totalCount;
        });

        const totalPrice = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        document.querySelectorAll('.total__cost').forEach(el => {
            if (el) el.textContent = totalPrice.toLocaleString();
        });

        const compareList = JSON.parse(localStorage.getItem('compareList')) || [];
        const compareCount = document.getElementById('compareCount');
        if (compareCount) compareCount.textContent = compareList.length;

        renderCartItems();
    }

    function renderCartItems() {
        const containers = document.querySelectorAll('.cart__items');
        containers.forEach(container => {
            if (!container) return;
            if (cart.length === 0) {
                container.innerHTML = '<div class="text-center text-secondary p-4">🛒 سبد خرید خالی است</div>';
                return;
            }
            let html = '';
            cart.forEach(item => {
                html += `
                    <div class="cart-item">
                        <img src="./img/${item.image}" alt="${item.name}">
                        <div class="product-info">
                            <div class="product-name">${item.name}</div>
                            <div class="product-price">${item.price.toLocaleString()} تومان</div>
                            <div class="d-flex align-items-center mt-1">
                                <button onclick="window.decreaseQuantity(${item.id})" class="btn btn-sm btn-quantity">-</button>
                                <span class="mx-2" style="color:white;">${item.quantity || 1}</span>
                                <button onclick="window.increaseQuantity(${item.id})" class="btn btn-sm btn-quantity">+</button>
                                <button onclick="window.removeFromCart(${item.id})" class="btn btn-sm btn-remove ms-2"><i class="fa fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        });
    }

    // تابع معمولی با alert
    window.addToCart = function(product) {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        alert('✅ محصول به سبد خرید اضافه شد');
    };

    // ========== تابع جدید بدون alert (برای استفاده در addAll) ==========
    window.addToCartSilent = function(product) {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        // بدون alert
    };
    // =================================================================

    window.removeFromCart = function(id) {
        cart = cart.filter(item => item.id !== id);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
    };

    window.increaseQuantity = function(id) {
        const item = cart.find(item => item.id === id);
        if (item) {
            item.quantity = (item.quantity || 1) + 1;
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
        }
    };

    window.decreaseQuantity = function(id) {
        const item = cart.find(item => item.id === id);
        if (item) {
            if (item.quantity > 1) {
                item.quantity--;
            } else {
                cart = cart.filter(item => item.id !== id);
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
        }
    };

    window.clearCart = function() {
        if (confirm('آیا از حذف همه محصولات اطمینان دارید؟')) {
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartUI();
        }
    };

    window.updateCartUI = updateCartUI;
    window.getCartArray = function() { return [...cart]; };

    document.querySelectorAll('.removeAllItems').forEach(btn => {
        btn.addEventListener('click', window.clearCart);
    });

    document.querySelectorAll('#goToCheckout').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (cart.length === 0) {
                e.preventDefault();
                alert('سبد خرید شما خالی است');
            }
        });
    });

    const cartToggleBtn = document.getElementById('cartToggleBtn');
    const cartMenu = document.getElementById('cartMenu');
    const navbarToggler = document.getElementById('navbarToggler');

    if (cartToggleBtn && cartMenu) {
        cartToggleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            cartMenu.classList.toggle('active');
        });

        document.addEventListener('click', function(e) {
            if (!cartMenu.contains(e.target) && !cartToggleBtn.contains(e.target)) {
                cartMenu.classList.remove('active');
            }
        });
    }

    if (navbarToggler && cartMenu) {
        navbarToggler.addEventListener('click', function() {
            cartMenu.classList.remove('active');
        });
    }

    updateCartUI();

    window.addEventListener('storage', function(e) {
        if (e.key === 'cart') {
            cart = JSON.parse(e.newValue || '[]');
            updateCartUI();
        }
        if (e.key === 'compareList') {
            const compareCount = document.getElementById('compareCount');
            if (compareCount) {
                const compareList = JSON.parse(e.newValue || '[]');
                compareCount.textContent = compareList.length;
            }
        }
    });
})();