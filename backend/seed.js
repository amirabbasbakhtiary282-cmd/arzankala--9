// ============================================
// seed.js - پر کردن دیتابیس AxioDB با ۲۵ محصول
// ============================================

const { AxioDB } = require('axiodb');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'AxioDB');
const FALLBACK_RATE = 1753100;
function toToman(usd) { return Math.round(usd * FALLBACK_RATE / 10); }

const products = [
    { id: 1, name: "گوشی سامسونگ Galaxy A54", category: "mobile", price: toToman(350), priceUSD: 350, oldPrice: toToman(420), oldPriceUSD: 420, image: "a54.jpg", stock: 18, rating: 4.5, description: "گوشی هوشمند میان رده با صفحه نمایش Super AMOLED 6.4 اینچی", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "6.4 اینچ Super AMOLED 120Hz", "رم": "8 گیگابایت", "حافظه داخلی": "256 گیگابایت", "باتری": "5000 میلی‌آمپر" } },
    { id: 2, name: "گوشی شیائومی Redmi Note 13 Pro", category: "mobile", price: toToman(300), priceUSD: 300, oldPrice: toToman(360), oldPriceUSD: 360, image: "redmi13pro.jpg", stock: 25, rating: 4.7, description: "گوشی پرفروش با دوربین 200 مگاپیکسل و نمایشگر AMOLED", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "6.67 اینچ AMOLED 120Hz", "رم": "8 گیگابایت", "حافظه داخلی": "256 گیگابایت", "باتری": "5000 میلی‌آمپر" } },
    { id: 3, name: "گوشی اپل iPhone 13", category: "mobile", price: toToman(600), priceUSD: 600, oldPrice: toToman(720), oldPriceUSD: 720, image: "iphone13.jpg", stock: 8, rating: 4.9, description: "آیفون 13 با تراشه A15 Bionic", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "6.1 اینچ Super Retina XDR", "رم": "4 گیگابایت", "حافظه داخلی": "128 گیگابایت", "دوربین": "12 مگاپیکسل دوگانه" } },
    { id: 4, name: "تبلت سامسونگ Galaxy Tab S9", category: "tablet", price: toToman(650), priceUSD: 650, oldPrice: toToman(780), oldPriceUSD: 780, image: "tabs9.jpg", stock: 12, rating: 4.6, description: "تبلت پرچمدار با صفحه نمایش AMOLED و قلم S-Pen", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "11 اینچ AMOLED 120Hz", "رم": "8 گیگابایت", "حافظه داخلی": "256 گیگابایت", "باتری": "8000 میلی‌آمپر" } },
    { id: 5, name: "گوشی Poco X6 Pro", category: "mobile", price: toToman(350), priceUSD: 350, oldPrice: toToman(420), oldPriceUSD: 420, image: "pocoX6Pro.jpg", stock: 18, rating: 4.4, description: "گوشی گیمینگ با تراشه Dimensity 8300 Ultra", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "6.7 اینچ AMOLED 120Hz", "رم": "12 گیگابایت", "حافظه داخلی": "512 گیگابایت", "باتری": "5000 میلی‌آمپر" } },
    { id: 6, name: "لپ تاپ ایسوس VivoBook 15", category: "laptop", price: toToman(550), priceUSD: 550, oldPrice: toToman(660), oldPriceUSD: 660, image: "vivobook15.jpg", stock: 10, rating: 4.3, description: "لپ تاپ سبک با پردازنده Intel Core i5", viewCount: 0, purchaseCount: 0, specs: { "پردازنده": "Intel Core i5-1235U", "رم": "16 گیگابایت", "حافظه داخلی": "512 گیگابایت SSD", "صفحه نمایش": "15.6 اینچ FHD" } },
    { id: 7, name: "لپ تاپ لنوو IdeaPad Gaming 3", category: "laptop", price: toToman(700), priceUSD: 700, oldPrice: toToman(840), oldPriceUSD: 840, image: "ideapadGaming3.jpg", stock: 7, rating: 4.5, description: "لپ تاپ گیمینگ با کارت گرافیک NVIDIA RTX 3050", viewCount: 0, purchaseCount: 0, specs: { "پردازنده": "Intel Core i5-12450H", "رم": "16 گیگابایت", "حافظه داخلی": "512 گیگابایت SSD", "کارت گرافیک": "NVIDIA RTX 3050" } },
    { id: 8, name: "لپ تاپ اپل MacBook Air M2", category: "laptop", price: toToman(900), priceUSD: 900, oldPrice: toToman(1080), oldPriceUSD: 1080, image: "macbookAirM2.jpg", stock: 5, rating: 4.9, description: "لپ تاپ فوق العاده سبک با تراشه Apple M2", viewCount: 0, purchaseCount: 0, specs: { "پردازنده": "Apple M2", "رم": "8 گیگابایت", "حافظه داخلی": "256 گیگابایت SSD", "صفحه نمایش": "13.6 اینچ Liquid Retina" } },
    { id: 9, name: "مانیتور ال جی 27 اینچ UltraGear", category: "monitor", price: toToman(350), priceUSD: 350, oldPrice: toToman(420), oldPriceUSD: 420, image: "ultragear27.jpg", stock: 14, rating: 4.6, description: "مانیتور گیمینگ 27 اینچی QHD با نرخ تازه‌سازی 165 هرتز", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "27 اینچ IPS QHD", "رزولوشن": "2560x1440", "نرخ تازه‌سازی": "165Hz" } },
    { id: 10, name: "هدفون بلوتوثی JBL Tune 760NC", category: "accessory", price: toToman(130), priceUSD: 130, oldPrice: toToman(156), oldPriceUSD: 156, image: "jbl760nc.jpg", stock: 25, rating: 4.7, description: "هدفون نویز کنسلینگ فعال", viewCount: 0, purchaseCount: 0, specs: { "نوع": "روی گوشی", "اتصال": "بلوتوث 5.0", "باتری": "35 ساعت" } },
    { id: 11, name: "کیبورد و موس لاجیتک MK270", category: "accessory", price: toToman(50), priceUSD: 50, oldPrice: toToman(60), oldPriceUSD: 60, image: "logitechMK270.jpg", stock: 30, rating: 4.4, description: "ست کیبورد و موس بی‌سیم", viewCount: 0, purchaseCount: 0, specs: { "نوع": "Wireless", "برد": "10 متر", "باتری کیبورد": "24 ماه" } },
    { id: 12, name: "پاور بانک انکر 20000mAh", category: "accessory", price: toToman(40), priceUSD: 40, oldPrice: toToman(48), oldPriceUSD: 48, image: "anker20000.jpg", stock: 20, rating: 4.5, description: "پاور بانک پرظرفیت با شارژ سریع", viewCount: 0, purchaseCount: 0, specs: { "ظرفیت": "20000 میلی‌آمپر", "شارژ سریع": "22.5 وات", "وزن": "340 گرم" } },
    { id: 13, name: "هارد اکسترنال وسترن دیجیتال 2TB", category: "accessory", price: toToman(80), priceUSD: 80, oldPrice: toToman(96), oldPriceUSD: 96, image: "wd2tb.jpg", stock: 15, rating: 4.6, description: "هارد اکسترنال 2 ترابایت", viewCount: 0, purchaseCount: 0, specs: { "ظرفیت": "2 ترابایت", "پورت": "USB 3.0", "وزن": "130 گرم" } },
    { id: 14, name: "وب کم لاجیتک C920s", category: "accessory", price: toToman(120), priceUSD: 120, oldPrice: toToman(144), oldPriceUSD: 144, image: "logitechC920.jpg", stock: 12, rating: 4.7, description: "وب‌کم Full HD با میکروفون استریو", viewCount: 0, purchaseCount: 0, specs: { "رزولوشن": "1080p Full HD", "فوکوس": "خودکار" } },
    { id: 15, name: "دوربین کانن EOS 250D", category: "camera", price: toToman(700), priceUSD: 700, oldPrice: toToman(840), oldPriceUSD: 840, image: "canon250d.jpg", stock: 9, rating: 4.6, description: "دوربین DSLR با کیفیت بالا", viewCount: 0, purchaseCount: 0, specs: { "رزولوشن": "24.1 مگاپیکسل", "فیلمبرداری": "4K", "وزن": "449 گرم" } },
    { id: 16, name: "دوربین سونی Alpha A6400", category: "camera", price: toToman(722), priceUSD: 722, oldPrice: toToman(866), oldPriceUSD: 866, image: "sonyA6400.jpg", stock: 6, rating: 4.8, description: "دوربین بدون آینه با فوکوس سریع", viewCount: 0, purchaseCount: 0, specs: { "رزولوشن": "24.2 مگاپیکسل", "فوکوس": "0.02 ثانیه", "وزن": "403 گرم" } },
    { id: 17, name: "یخچال فریزر سامسونگ 30 فوت", category: "home", price: toToman(945), priceUSD: 945, oldPrice: toToman(1134), oldPriceUSD: 1134, image: "fridge30.jpg", stock: 4, rating: 4.7, description: "یخچال فریزر با ظرفیت بالا", viewCount: 0, purchaseCount: 0, specs: { "ظرفیت": "30 فوت", "کلاس انرژی": "A++" } },
    { id: 18, name: "ماشین لباسشویی ال جی 9 کیلو", category: "home", price: toToman(475), priceUSD: 475, oldPrice: toToman(570), oldPriceUSD: 570, image: "lgWashing9.jpg", stock: 7, rating: 4.5, description: "ماشین لباسشویی با موتور اینورتر", viewCount: 0, purchaseCount: 0, specs: { "ظرفیت": "9 کیلوگرم", "سرعت چرخش": "1200 دور" } },
    { id: 19, name: "هدفون بی‌سیم اپل AirPods Pro 2", category: "accessory", price: toToman(200), priceUSD: 200, oldPrice: toToman(240), oldPriceUSD: 240, image: "airpodspro2.jpg", stock: 22, rating: 4.9, description: "هدفون بی‌سیم با نویز کنسلینگ", viewCount: 0, purchaseCount: 0, specs: { "نوع": "درون گوشی", "تراشه": "Apple H2", "باتری": "6 ساعت" } },
    { id: 20, name: "اسپیکر بلوتوثی JBL Charge 5", category: "accessory", price: toToman(190), priceUSD: 190, oldPrice: toToman(228), oldPriceUSD: 228, image: "jblcharge5.jpg", stock: 16, rating: 4.7, description: "اسپیکر قابل حمل با باتری قدرتمند", viewCount: 0, purchaseCount: 0, specs: { "توان": "40 وات", "باتری": "20 ساعت", "مقاومت": "IP67" } },
    { id: 21, name: "مچ‌بند هوشمند شیائومی Mi Band 8", category: "accessory", price: toToman(31), priceUSD: 31, oldPrice: toToman(37), oldPriceUSD: 37, image: "miband8.jpg", stock: 35, rating: 4.5, description: "مچ‌بند هوشمند با نمایشگر AMOLED", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "1.62 اینچ", "باتری": "16 روز", "ضد آب": "5ATM" } },
    { id: 22, name: "گوشی موبایل نوکیا 105", category: "mobile", price: toToman(14), priceUSD: 14, oldPrice: toToman(17), oldPriceUSD: 17, image: "nokia105.jpg", stock: 42, rating: 4.2, description: "گوشی دکمه‌ای ساده با باتری بادوام", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "1.8 اینچ", "باتری": "800 میلی‌آمپر", "چراغ قوه": "دارد" } },
    { id: 23, name: "تلویزیون سامسونگ 55 اینچ 4K", category: "tv", price: toToman(1200), priceUSD: 1200, oldPrice: toToman(1440), oldPriceUSD: 1440, image: "samsungtv55.jpg", stock: 8, rating: 4.8, description: "تلویزیون هوشمند 4K", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "55 اینچ", "رزولوشن": "3840x2160", "سیستم عامل": "Tizen" } },
    { id: 24, name: "کنترلر بازی ایکس باکس سری X", category: "gaming", price: toToman(75), priceUSD: 75, oldPrice: toToman(90), oldPriceUSD: 90, image: "xboxcontroller.jpg", stock: 28, rating: 4.8, description: "دسته بازی بی‌سیم", viewCount: 0, purchaseCount: 0, specs: { "نوع": "بی‌سیم", "اتصال": "بلوتوث", "وزن": "240 گرم" } },
    { id: 25, name: "قهوه‌ساز دالیکس Bistro", category: "home", price: toToman(150), priceUSD: 150, oldPrice: toToman(180), oldPriceUSD: 180, image: "bistro.jpg", stock: 11, rating: 4.5, description: "قهوه‌ساز اسپرسو ساز", viewCount: 0, purchaseCount: 0, specs: { "نوع": "اسپرسو ساز", "توان": "1450 وات", "فشار پمپ": "15 بار" } },
    { id: 26, name: "گوشی سامسونگ Galaxy S24 Ultra", category: "mobile", price: toToman(1200), priceUSD: 1200, oldPrice: toToman(1440), oldPriceUSD: 1440, image: "s24ultra.jpg", stock: 7, rating: 4.9, description: "پرچمدار سامسونگ با هوش مصنوعی Galaxy AI و دوربین 200 مگاپیکسل", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "6.8 اینچ Dynamic AMOLED 2X 120Hz", "رم": "12 گیگابایت", "حافظه داخلی": "512 گیگابایت", "دوربین": "200 مگاپیکسل + قلم S-Pen" } },
    { id: 27, name: "گوشی اپل iPhone 15 Pro Max", category: "mobile", price: toToman(1400), priceUSD: 1400, oldPrice: toToman(1680), oldPriceUSD: 1680, image: "iphone15promax.jpg", stock: 5, rating: 4.9, description: "قوی‌ترین آیفون با تراشه A17 Pro و تیتانیوم", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "6.7 اینچ Super Retina XDR 120Hz", "رم": "8 گیگابایت", "حافظه داخلی": "256 گیگابایت", "دوربین": "48 مگاپیکسل سه‌گانه" } },
    { id: 28, name: "گوشی Nothing Phone (2)", category: "mobile", price: toToman(650), priceUSD: 650, oldPrice: toToman(780), oldPriceUSD: 780, image: "nothingphone2.jpg", stock: 12, rating: 4.6, description: "گوشی با طراحی Glyph LED منحصربه‌فرد و تجربه خالص اندروید", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "6.7 اینچ LTPO OLED 120Hz", "رم": "12 گیگابایت", "حافظه داخلی": "256 گیگابایت", "Glyph LED": "دارد" } },
    { id: 29, name: "هدفون سونی WH-1000XM5", category: "accessory", price: toToman(330), priceUSD: 330, oldPrice: toToman(396), oldPriceUSD: 396, image: "sonyxm5.jpg", stock: 14, rating: 4.8, description: "هدفون حرفه‌ای نویز کنسلینگ با کیفیت صدای بینظیر", viewCount: 0, purchaseCount: 0, specs: { "نوع": "روی گوشی", "نویز کنسلینگ": "فعال + Adaptive", "باتری": "40 ساعت" } },
    { id: 30, name: "هدفون اپل AirPods Max", category: "accessory", price: toToman(550), priceUSD: 550, oldPrice: toToman(660), oldPriceUSD: 660, image: "airpodsmax.jpg", stock: 6, rating: 4.7, description: "هدفون پرچمدار اپل با طراحی لوکس و کیفیت صدای استثنایی", viewCount: 0, purchaseCount: 0, specs: { "نوع": "روی گوشی", "تراشه": "Apple H1", "باتری": "20 ساعت" } },
    { id: 31, name: "لپ تاپ ایسوس ROG Zephyrus G14", category: "laptop", price: toToman(1500), priceUSD: 1500, oldPrice: toToman(1800), oldPriceUSD: 1800, image: "rogzephyrusg14.jpg", stock: 4, rating: 4.7, description: "لپ تاپ گیمینگ فوق‌العاده قدرتمند با پردازنده Ryzen 9 و RTX 4070", viewCount: 0, purchaseCount: 0, specs: { "پردازنده": "AMD Ryzen 9 7940HS", "رم": "32 گیگابایت", "کارت گرافیک": "NVIDIA RTX 4070", "صفحه نمایش": "14 اینچ QHD 165Hz" } },
    { id: 32, name: "لپ تاپ اپل MacBook Pro 14 M3 Pro", category: "laptop", price: toToman(2200), priceUSD: 2200, oldPrice: toToman(2640), oldPriceUSD: 2640, image: "macbookpro14m3.jpg", stock: 3, rating: 4.9, description: "لپ تاپ حرفه‌ای با تراشه M3 Pro و نمایشگر Liquid Retina XDR", viewCount: 0, purchaseCount: 0, specs: { "پردازنده": "Apple M3 Pro", "رم": "18 گیگابایت", "حافظه داخلی": "512 گیگابایت SSD", "صفحه نمایش": "14.2 اینچ Liquid Retina XDR" } },
    { id: 33, name: "لپ تاپ Dell XPS 15", category: "laptop", price: toToman(1500), priceUSD: 1500, oldPrice: toToman(1800), oldPriceUSD: 1800, image: "dellxps15.jpg", stock: 6, rating: 4.6, description: "لپ تاپ فوق‌باریک با نمایشگر InfinityEdge OLED 4K", viewCount: 0, purchaseCount: 0, specs: { "پردازنده": "Intel Core i7-13700H", "رم": "16 گیگابایت", "حافظه داخلی": "512 گیگابایت SSD", "صفحه نمایش": "15.6 اینچ OLED 4K" } },
    { id: 34, name: "ساعت هوشمند سامسونگ Galaxy Watch 6 Classic", category: "accessory", price: toToman(350), priceUSD: 350, oldPrice: toToman(420), oldPriceUSD: 420, image: "galaxywatch6classic.jpg", stock: 15, rating: 4.6, description: "ساعت هوشمند با صفحه چرخان و نمایشگر Super AMOLED", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "1.47 اینچ Super AMOLED", "باتری": "425 میلی‌آمپر", "سیستم عامل": "Wear OS" } },
    { id: 35, name: "کنسول بازی پلی استیشن 5 Slim", category: "gaming", price: toToman(500), priceUSD: 500, oldPrice: toToman(600), oldPriceUSD: 600, image: "ps5slim.jpg", stock: 8, rating: 4.9, description: "کنسول بازی نسل نهم با SSD فوق‌سریع و کنترلر DualSense", viewCount: 0, purchaseCount: 0, specs: { "حافظه داخلی": "1TB SSD", "رزولوشن": "تا 4K 120Hz", "کنترلر": "DualSense بی‌سیم" } },
    { id: 36, name: "کنسول بازی نینتندو سوییچ OLED", category: "gaming", price: toToman(350), priceUSD: 350, oldPrice: toToman(420), oldPriceUSD: 420, image: "switcholed.jpg", stock: 11, rating: 4.7, description: "کنسول بازی قابل حمل با نمایشگر OLED 7 اینچی", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "7 اینچ OLED", "حافظه داخلی": "64 گیگابایت", "باتری": "4.5 تا 9 ساعت" } },
    { id: 37, name: "جاروبرقی دایسون V15 Detect", category: "home", price: toToman(750), priceUSD: 750, oldPrice: toToman(900), oldPriceUSD: 900, image: "dysonv15.jpg", stock: 5, rating: 4.8, description: "جاروبرقی بی‌سیم با سنسور لیزری و نمایشگر LCD", viewCount: 0, purchaseCount: 0, specs: { "نوع": "بی‌سیم", "توان": "660 وات", "مدت کار": "60 دقیقه", "فناوری": " Laser Slim Fluffy" } },
    { id: 38, name: "هدفون سامسونگ Galaxy Buds2 Pro", category: "accessory", price: toToman(170), priceUSD: 170, oldPrice: toToman(204), oldPriceUSD: 204, image: "buds2pro.jpg", stock: 20, rating: 4.6, description: "هدفون بی‌سیم با نویز کنسلینگ و صدای 24bit Hi-Fi", viewCount: 0, purchaseCount: 0, specs: { "نوع": "درون گوشی", "نویز کنسلینگ": "فعال", "باتری": "29 ساعت" } },
    { id: 39, name: "تبلت اپل iPad Air M2", category: "tablet", price: toToman(600), priceUSD: 600, oldPrice: toToman(720), oldPriceUSD: 720, image: "ipadairM2.jpg", stock: 10, rating: 4.8, description: "تبلت قدرتمند با تراشه M2 و طراحی فوق‌باریک", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "11 اینچ Liquid Retina", "تراشه": "Apple M2", "حافظه داخلی": "256 گیگابایت" } },
    { id: 40, name: "دوربین گوپرو Hero 12 Black", category: "camera", price: toToman(400), priceUSD: 400, oldPrice: toToman(480), oldPriceUSD: 480, image: "gopro12.jpg", stock: 8, rating: 4.5, description: "دوربین اکشن حرفه‌ای با فیلمبرداری 5.3K و تثبیت‌کننده HyperSmooth 6.0", viewCount: 0, purchaseCount: 0, specs: { "رزولوشن": "5.3K تا 60fps", "تثبیت‌کننده": "HyperSmooth 6.0", "ضد آب": "تا 10 متر" } },
    { id: 41, name: "تلویزیون ال جی C3 OLED 65 اینچ", category: "tv", price: toToman(1800), priceUSD: 1800, oldPrice: toToman(2160), oldPriceUSD: 2160, image: "lgc3oled.jpg", stock: 3, rating: 4.9, description: "تلویزیون OLED با پردازنده α9 Gen6 و پشتیبانی از Dolby Vision", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "65 اینچ OLED evo", "رزولوشن": "4K 120Hz", "پردازنده": "α9 Gen6 AI" } },
    { id: 42, name: "موس گیمینگ لاجیتک G Pro X Superlight 2", category: "gaming", price: toToman(160), priceUSD: 160, oldPrice: toToman(192), oldPriceUSD: 192, image: "gproxsuperlight2.jpg", stock: 18, rating: 4.7, description: "موس حرفه‌ای گیمینگ با وزن 60 گرم و سنسور Hero 2", viewCount: 0, purchaseCount: 0, specs: { "نوع": "بی‌سیم", "سنسور": "Hero 2", "وزن": "60 گرم", "باتری": "95 ساعت" } },
    { id: 43, name: "مانیتور سامسونگ Odyssey G7 32 اینچ", category: "monitor", price: toToman(700), priceUSD: 700, oldPrice: toToman(840), oldPriceUSD: 840, image: "odysseyg7.jpg", stock: 6, rating: 4.7, description: "مانیتور گیمینگ 4K با نرخ تازه‌سازی 144Hz و Mini LED", viewCount: 0, purchaseCount: 0, specs: { "صفحه نمایش": "32 اینچ VA Mini LED", "رزولوشن": "4K UHD", "نرخ تازه‌سازی": "144Hz" } },
    { id: 44, name: "هدفون سونی WF-1000XM5", category: "accessory", price: toToman(280), priceUSD: 280, oldPrice: toToman(336), oldPriceUSD: 336, image: "sonywf1000xm5.jpg", stock: 13, rating: 4.7, description: "هدفون بی‌سیم حرفه‌ای با نویز کنسلینگ پیشرفته", viewCount: 0, purchaseCount: 0, specs: { "نوع": "درون گوشی", "نویز کنسلینگ": "فعال + Adaptive", "باتری": "24 ساعت" } },
    { id: 45, name: "کیبورد مکانیکی کی‌کرون Q1 Pro", category: "gaming", price: toToman(200), priceUSD: 200, oldPrice: toToman(240), oldPriceUSD: 240, image: "keychronq1pro.jpg", stock: 16, rating: 4.5, description: "کیبورد مکانیکی 75% با بدنه آلومینیومی و اتصال بی‌سیم", viewCount: 0, purchaseCount: 0, specs: { "نوع": "75% مکانیکی", "اتصال": "بی‌سیم + USB-C", "سوئیچ": "Gateron Jupiter" } }
];

async function seedDatabase() {
    try {
        console.log('🔄 در حال اتصال به AxioDB...');

const db = new AxioDB({ GUI: false, CustomPath: DB_PATH });

// Clean database completely
if (fs.existsSync(DB_PATH)) {
    const rmDir = (dir) => {
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(f => {
                const p = path.join(dir, f);
                if (fs.lstatSync(p).isDirectory()) rmDir(p);
                else fs.unlinkSync(p);
            });
            fs.rmdirSync(dir);
        }
    };
    rmDir(DB_PATH);
    console.log('🧹 دیتابیس کاملاً پاک‌سازی شد');
}

const mainDB = await db.createDB('ArzanKalaDB');

        // ========== محصولات ==========
        const productsCollection = await mainDB.createCollection('products');
        console.log('✅ کالکشن products ایجاد شد');

        let addedCount = 0;
        for (const product of products) {
            await productsCollection.insert(product);
            addedCount++;
            console.log(`✅ [${addedCount}/${products.length}] ${product.name}`);
        }

        console.log('========================================');
        console.log(`🎉 ${addedCount} محصول با موفقیت به دیتابیس اضافه شد`);
        console.log('========================================');

        const prodResult = await productsCollection.query({}).Limit(10000).exec();
        const allProducts = prodResult?.data?.documents || [];
        console.log(`📊 تعداد کل محصولات: ${allProducts.length}`);

        // ========== کاربر ادمین ==========
        const usersCollection = await mainDB.createCollection('users');
        console.log('✅ کالکشن users ایجاد شد');

        const hashedPassword = await bcrypt.hash('admin123', 10);
        await usersCollection.insert({
            id: 1,
            username: 'admin',
            password: hashedPassword,
            fullname: 'مدیر سایت',
            email: 'admin@arzankala.com',
            role: 'admin',
            isActive: true,
            createdAt: new Date().toISOString()
        });
        console.log('✅ کاربر ادمین ایجاد شد (username: admin, password: admin123)');

        // ========== نظرات نمونه ==========
        const commentsCollection = await mainDB.createCollection('comments');
        console.log('✅ کالکشن comments ایجاد شد');

        const sampleComments = [
            { productId: 1, username: "مهدی رضایی", content: "بعد از یک هفته استفاده، واقعاً از کیفیتش راضی هستم. صفحه نمایش عالی و باتری خوبی داره.", rating: 5, isApproved: true, createdAt: "2025-06-10T10:30:00.000Z", aiAnalysis: null },
            { productId: 1, username: "سارا احمدی", content: "قیمتش نسبت به امکاناتش مناسبه. فقط کاش زودتر شارژ میشد.", rating: 4, isApproved: true, createdAt: "2025-06-12T14:20:00.000Z", aiAnalysis: null },
            { productId: 2, username: "امیر حسینی", content: "دوربین ۲۰۰ مگاپیکسلی واقعاً شگفت‌انگیزه. عکس‌ها باورنکردنی هستن.", rating: 5, isApproved: true, createdAt: "2025-06-15T09:00:00.000Z", aiAnalysis: null },
            { productId: 3, username: "زهرا محمدی", content: "آیفون ۱۳ هنوز هم یکی از بهترین گوشی‌های بازار. از خریدم پشیمون نیستم.", rating: 5, isApproved: true, createdAt: "2025-06-18T16:45:00.000Z", aiAnalysis: null },
            { productId: 5, username: "رضا کریمی", content: "گوشی خوبیه ولی نسبت به رقبا قیمتش بالاست. انتظار بیشتری داشتم.", rating: 3, isApproved: true, createdAt: "2025-06-20T11:15:00.000Z", aiAnalysis: null },
            { productId: 6, username: "الناز موسوی", content: "لپ تاپ سبک و خوبیه برای کارهای روزمره. خوشحالم خریدم.", rating: 4, isApproved: false, createdAt: "2025-06-22T08:30:00.000Z", aiAnalysis: null },
            { productId: 8, username: "کیان جعفری", content: "مک‌بوک ایر فوق‌العاده‌ست. طراحی بی‌نظیر و عمر باتری عالی. وزن سبکش هم عالیه.", rating: 5, isApproved: true, createdAt: "2025-06-25T13:00:00.000Z", aiAnalysis: null },
            { productId: 10, username: "پرنیان سعیدی", content: "هدفون رو خریدم برای استفاده روزانه. کیفیت صداش خوبه و نویز کنسلینگ مناسبی داره.", rating: 4, isApproved: false, createdAt: "2025-06-27T17:30:00.000Z", aiAnalysis: null },
            { productId: 15, username: "بابک نادری", content: "کیفیت عکس‌هاش واقعاً خوبه. برای شروع حرفه‌ای گزینه مناسبیه.", rating: 4, isApproved: true, createdAt: "2025-06-29T10:00:00.000Z", aiAnalysis: null },
            { productId: 19, username: "لیلا صالحی", content: "ایرپادز عالیه. فقط یه کم گرونه. کیفیت صدا و راحتی عالی.", rating: 4, isApproved: false, createdAt: "2025-07-01T12:00:00.000Z", aiAnalysis: null }
        ];

        let commentCount = 0;
        for (const comment of sampleComments) {
            commentCount++;
            const commentWithId = { id: commentCount, ...comment };
            await commentsCollection.insert(commentWithId);
            console.log(`✅ نظر ${commentCount} برای محصول ${comment.productId} اضافه شد`);
        }
        console.log(`🎉 ${commentCount} نظر نمونه اضافه شد`);

        // ========== محاسبه مجدد امتیاز محصولات بر اساس نظرات تأیید شده ==========
        const allComments = await commentsCollection.query({}).Limit(10000).exec();
        const allCommentsData = allComments?.data?.documents || [];
        const approvedComments = allCommentsData.filter(c => c.isApproved === true);

        const productRatings = {};
        approvedComments.forEach(c => {
            if (!productRatings[c.productId]) {
                productRatings[c.productId] = { sum: 0, count: 0 };
            }
            productRatings[c.productId].sum += c.rating;
            productRatings[c.productId].count++;
        });

        for (const [productId, data] of Object.entries(productRatings)) {
            const avgRating = Math.round((data.sum / data.count) * 10) / 10;
            await productsCollection.update({ id: parseInt(productId) }).UpdateOne({ rating: avgRating, ratingCount: data.count });
            console.log(`⭐ محصول ${productId}: امتیاز ${avgRating} (${data.count} نظر)`);
        }

        // محصولاتی که نظر ندارند، ratingCount = 0
        const prodResult2 = await productsCollection.query({}).Limit(10000).exec();
        const allProducts2 = prodResult2?.data?.documents || [];
        for (const product of allProducts2) {
            if (!productRatings[product.id]) {
                await productsCollection.update({ id: product.id }).UpdateOne({ ratingCount: 0 });
            }
        }

        const userResult2 = await usersCollection.query({}).Limit(10000).exec();
        const allUsers = userResult2?.data?.documents || [];
        console.log(`📊 تعداد کل کاربران: ${allUsers.length}`);
        console.log('🎉 عملیات با موفقیت به پایان رسید');

        process.exit(0);

    } catch (error) {
        console.error('❌ خطا:', error.message);
        process.exit(1);
    }
}

seedDatabase();
