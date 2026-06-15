// shop-cart.js - Single source of truth for cart management
(function() {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    window.updateCartUI = function() {
        const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
        document.querySelectorAll('.total__counter').forEach(el => { if (el) el.textContent = totalCount; });
        
        const totalPrice = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
        document.querySelectorAll('.total__cost').forEach(el => { if (el) el.textContent = totalPrice.toLocaleString(); });
        
        // Update compare count
        const compareList = JSON.parse(localStorage.getItem('compareList')) || [];
        document.querySelectorAll('.compare-counter').forEach(el => { if (el) el.textContent = compareList.length; });
        
        renderCartItems();
    };

    function renderCartItems() {
        const containers = document.querySelectorAll('.cart__items');
        containers.forEach(container => {
            if (!container) return;
            if (cart.length === 0) {
                container.innerHTML = '<div class="text-center text-secondary p-4">سبد خرید خالی است</div>';
                return;
            }
            container.innerHTML = cart.map(item => {
                let displayPrice = item.frozenPrice || item.price;
                let lockIcon = item.frozenPrice ? '<i class="fa fa-lock ms-1" style="font-size:0.6rem;color:#00c853;" title="قیمت ثابت شده"></i>' : '';
                return '<div class="cart-item">' +
                    '<img src="./img/' + item.image + '" alt="' + item.name + '">' +
                    '<div class="product-info">' +
                    '<div class="product-name">' + item.name + '</div>' +
                    '<div class="product-price">' + displayPrice.toLocaleString() + ' تومان ' + lockIcon + '</div>' +
                    '<div class="d-flex align-items-center mt-1">' +
                    '<button onclick="window.decreaseQuantity(' + item.id + ')" class="btn btn-sm btn-quantity">-</button>' +
                    '<span class="mx-2" style="color:white;">' + (item.quantity || 1) + '</span>' +
                    '<button onclick="window.increaseQuantity(' + item.id + ')" class="btn btn-sm btn-quantity">+</button>' +
                    '<button onclick="window.removeFromCart(' + item.id + ')" class="btn btn-sm btn-remove ms-2"><i class="fa fa-trash"></i></button>' +
                    '</div></div></div>';
            }).join('');
        });
    }

    window.addToCart = function(product) {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        // Track cart history for recommendations
        let cartHistory = JSON.parse(localStorage.getItem('cartHistory') || '[]');
        if (!cartHistory.find(item => item.id === product.id)) {
            cartHistory.push({ id: product.id, name: product.name, addedAt: Date.now() });
            if (cartHistory.length > 50) cartHistory = cartHistory.slice(-50);
            localStorage.setItem('cartHistory', JSON.stringify(cartHistory));
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
        if (window.API) {
            window.API.showNotification('محصول به سبد خرید اضافه شد');
        }
    };

    window.addToCartSilent = function(product) {
        const existing = cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartUI();
    };

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

    // Toggle cart menu
    document.querySelectorAll('.cart-toggle-btn, #cartToggleBtn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const menu = document.getElementById('cartMenu');
            if (menu) menu.classList.toggle('active');
        });
    });

    // Close cart on outside click
    document.addEventListener('click', function(e) {
        const menu = document.getElementById('cartMenu');
        const toggle = document.querySelector('.cart-toggle-btn, #cartToggleBtn');
        if (menu && toggle && !menu.contains(e.target) && !toggle.contains(e.target)) {
            menu.classList.remove('active');
        }
    });

    // Remove all items buttons
    document.querySelectorAll('.removeAllItems').forEach(btn => {
        btn.addEventListener('click', window.clearCart);
    });

    // Checkout button
    document.querySelectorAll('#goToCheckout').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (cart.length === 0) {
                e.preventDefault();
                alert('سبد خرید شما خالی است');
            }
        });
    });

    // Mobile menu close on nav link click
    document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
        link.addEventListener('click', function() {
            const navbar = document.getElementById('navbarMain');
            if (navbar && navbar.classList.contains('show')) {
                const bsCollapse = bootstrap.Collapse.getInstance(navbar);
                if (bsCollapse) bsCollapse.hide();
            }
        });
    });

    // Listen for storage changes from other tabs
    window.addEventListener('storage', function(e) {
        if (e.key === 'cart') {
            cart = JSON.parse(e.newValue || '[]');
            updateCartUI();
        }
        if (e.key === 'compareList') {
            document.querySelectorAll('.compare-counter').forEach(el => {
                if (el) {
                    const list = JSON.parse(e.newValue || '[]');
                    el.textContent = list.length;
                }
            });
        }
    });

    // Initial render
    updateCartUI();
})();
