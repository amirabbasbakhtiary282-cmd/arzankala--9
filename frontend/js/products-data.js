const productsDatabase = [
    {
        id: 1,
        name: "گوشی سامسونگ Galaxy A54",
        category: "mobile",
        price: 18900000,
        oldPrice: 22000000,
        image: "a54.jpg",
        stock: 18,
        ratingCount: 0,
        description: "گوشی هوشمند میان رده با صفحه نمایش Super AMOLED 6.4 اینچی، دوربین 50 مگاپیکسل و باتری 5000 میلی‌آمپر",
        specs: {
            "صفحه نمایش": "6.4 اینچ Super AMOLED 120Hz",
            "دوربین اصلی": "50 مگاپیکسل با OIS",
            "دوربین اولتراواید": "12 مگاپیکسل",
            "دوربین ماکرو": "5 مگاپیکسل",
            "دوربین سلفی": "32 مگاپیکسل",
            "رم": "8 گیگابایت",
            "حافظه داخلی": "256 گیگابایت",
            "باتری": "5000 میلی‌آمپر",
            "شارژ سریع": "25 وات",
            "پردازنده": "Exynos 1380",
            "سیستم عامل": "اندروید 14 با One UI 6.1"
        }
    },
    // ... (remaining items unchanged) ...
];

// ============ توابع کمکی ===========
function getProductById(id) {
    return productsDatabase.find(p => p.id === parseInt(id));
}

function getRelatedProducts(currentId, limit = 4) {
    const current = getProductById(currentId);
    if (!current) return [];
    return productsDatabase
        .filter(p => p.category === current.category && p.id !== current.id)
        .slice(0, limit);
}

function getProductsByCategory(category) {
    if (!category) return productsDatabase;
    return productsDatabase.filter(p => p.category === category);
}

function searchProducts(query) {
    query = query.toLowerCase();
    return productsDatabase.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.description && p.description.toLowerCase().includes(query)) ||
        (p.specs && Object.values(p.specs).some(spec => 
            String(spec).toLowerCase().includes(query)
        ))
    );
}

module.exports = productsDatabase;
