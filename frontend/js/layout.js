(function() {
  let page = location.pathname.split('/').pop() || 'index.html';

  let headerHTML =
    '<nav class="navbar-row1" id="navbarRow1" role="navigation" aria-label="نوار اصلی">' +
    '<div class="container">' +
    '<div class="d-flex align-items-center justify-content-between gap-2">' +
    '<a class="navbar-brand-main" href="./index.html" aria-label="ارزان‌کالا - صفحه اصلی" style="display:flex;align-items:center;gap:8px;text-decoration:none;transition:all 0.3s">' +
    '<img src="./img/logo.png" alt="ارزان‌کالا" style="height:38px;border-radius:50%;filter:drop-shadow(0 2px 8px rgba(0,230,118,0.3));transition:all 0.3s">' +
    '<span style="font-weight:800;font-size:1.1rem;color:#fff;transition:color 0.3s">ارزان‌کالا</span></a>' +
    '<div class="nav-search-box d-none d-lg-flex" style="position:relative">' +
    '<input type="text" id="hmNavSearch" placeholder="جستجوی محصولات..." autocomplete="off" aria-label="جستجو">' +
    '<button class="search-icon-btn" onclick="hmDoSearch(\'hmNavSearch\')" aria-label="جستجو"><i class="fa fa-search"></i></button>' +
    '<div class="hm-autocomplete-wrap" id="hmNavAutocomplete" role="listbox"></div></div>' +
    '<div class="d-flex align-items-center gap-1">' +
    '<a href="./choose.html" class="nav-action-btn d-none d-lg-flex" title="پیشنهاد هوشمند" aria-label="پیشنهاد هوشمند"><i class="fa fa-robot"></i></a>' +
    '<a href="./compare.html" class="nav-action-btn" title="مقایسه" aria-label="مقایسه محصولات"><i class="fa fa-balance-scale"></i><span class="badge-dot" id="hmCmpBadge" style="display:none" aria-hidden="true">0</span></a>' +
    '<a href="./register.html" class="nav-action-btn d-none d-lg-flex" title="ورود" aria-label="ورود به حساب"><i class="fa fa-user"></i></a>' +
    '<button class="nav-action-btn" id="hmCartBtn" title="سبد خرید" aria-label="سبد خرید"><i class="fa fa-shopping-cart"></i><span class="badge-dot" id="hmCartBadge" style="display:none" aria-hidden="true">0</span></button>' +
    '<button class="nav-action-btn d-none d-lg-flex" id="themeToggle" title="تغییر تم" aria-label="تغییر تم روشن تاریک"><i class="fa fa-moon" id="themeIcon"></i></button>' +
    '<button class="navbar-toggler border-0 py-1 d-lg-none" type="button" data-bs-toggle="collapse" data-bs-target="#hmNavbarCollapse" aria-label="منو"><span class="navbar-toggler-icon"></span></button>' +
    '</div></div>' +
    '<div class="collapse navbar-collapse" id="hmNavbarCollapse">' +
    '<ul class="navbar-nav me-auto mb-2 mb-lg-0 mt-2">' +
    '<li class="nav-item"><a class="nav-link px-3" href="./index.html"><i class="fa fa-home ms-1"></i> خانه</a></li>' +
    '<li class="nav-item"><a class="nav-link px-3" href="./category.html"><i class="fa fa-store ms-1"></i> محصولات</a></li>' +
    '<li class="nav-item"><a class="nav-link px-3" href="./choose.html"><i class="fa fa-robot ms-1"></i> پیشنهاد هوشمند</a></li>' +
    '<li class="nav-item"><a class="nav-link px-3" href="./compare.html"><i class="fa fa-balance-scale ms-1"></i> مقایسه</a></li>' +
    '<li class="nav-item"><a class="nav-link px-3" href="./profile.html"><i class="fa fa-user ms-1"></i> پروفایل</a></li>' +
    '<li class="nav-item d-none" id="hmAdminNav"><a class="nav-link px-3" href="./admin.html"><i class="fa fa-shield ms-1"></i> مدیریت</a></li>' +
    '<li class="nav-item d-lg-none"><a class="nav-link px-3 hm-chatbot-nav-toggle-mobile" href="javascript:void(0)"><i class="fa fa-comments ms-1"></i> دستیار هوشمند</a></li>' +
    '</ul>' +
    '<div class="d-flex d-lg-none mt-2" style="position:relative">' +
    '<div class="nav-search-box w-100">' +
    '<input type="text" id="hmMobileSearch" placeholder="جستجو..." autocomplete="off" aria-label="جستجوی موبایل">' +
    '<button class="search-icon-btn" onclick="hmDoSearch(\'hmMobileSearch\')" aria-label="جستجو"><i class="fa fa-search"></i></button>' +
    '<div class="hm-autocomplete-wrap" id="hmMobileAutocomplete" role="listbox"></div></div></div></div></div></nav>' +
    '<div class="nav-row2 d-none d-lg-block" id="navbarRow2" role="navigation" aria-label="نوار ناوبری">' +
    '<div class="container">' +
    '<div class="nav-2-inner">' +
    '<div class="dropdown" id="hmCatDropdown">' +
    '<button class="cat-dropdown-btn dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">' +
    '<i class="fa fa-bars"></i><span class="cat-label">دسته‌بندی کالاها</span><i class="fa fa-chevron-down arrow-icon"></i></button>' +
    '<ul class="dropdown-menu dropdown-menu-dark cat-megamenu">' +
    '<li><a class="dropdown-item" href="./category.html?category=mobile"><i class="fa fa-mobile-alt"></i> موبایل</a></li>' +
    '<li><a class="dropdown-item" href="./category.html?category=laptop"><i class="fa fa-laptop"></i> لپ‌تاپ</a></li>' +
    '<li><a class="dropdown-item" href="./category.html?category=accessory"><i class="fa fa-headphones"></i> هدفون و هندزفری</a></li>' +
    '<li><a class="dropdown-item" href="./category.html?category=gaming"><i class="fa fa-gamepad"></i> گیمینگ</a></li>' +
    '<li><a class="dropdown-item" href="./category.html?category=camera"><i class="fa fa-camera"></i> دوربین</a></li>' +
    '<li><a class="dropdown-item" href="./category.html?category=tablet"><i class="fa fa-tablet-alt"></i> تبلت</a></li>' +
    '<li><a class="dropdown-item" href="./category.html?category=monitor"><i class="fa fa-desktop"></i> مانیتور</a></li>' +
    '<li><a class="dropdown-item" href="./category.html?category=home"><i class="fa fa-blender"></i> لوازم خانگی</a></li>' +
    '<li><a class="dropdown-item" href="./category.html?category=tv"><i class="fa fa-tv"></i> تلویزیون</a></li></ul></div>' +
    '<div class="nav-2-links">' +
    '<a href="./index.html" class="nav-2-link"><i class="fa fa-home"></i> خانه</a>' +
    '<a href="./category.html" class="nav-2-link"><i class="fa fa-store"></i> محصولات</a>' +
    '<a href="./choose.html" class="nav-2-link"><i class="fa fa-robot"></i> پیشنهاد هوشمند</a>' +
    '<a href="./compare.html" class="nav-2-link"><i class="fa fa-balance-scale"></i> مقایسه</a>' +
    '<a href="./profile.html" class="nav-2-link"><i class="fa fa-id-card"></i> پروفایل</a>' +
    '<a href="./admin.html" class="nav-2-link" id="hmAdminPill" style="display:none"><i class="fa fa-shield"></i> مدیریت</a>' +
    '<a href="javascript:void(0)" class="nav-2-link hm-chatbot-nav-toggle" aria-label="دستیار هوشمند"><i class="fa fa-comments ms-1"></i> دستیار هوشمند</a></div></div></div></div>';

  let footerHTML =
    '<footer class="hm-footer" role="contentinfo">' +
    '<div class="container">' +
    '<div class="row gy-4">' +
    '<div class="col-lg-3 col-md-6">' +
    '<div class="hm-footer-title"><span class="bar" aria-hidden="true"></span> ارزان‌کالا</div>' +
    '<p style="color:var(--text-muted);font-size:0.8rem;line-height:1.8">فروشگاه آنلاین با ۱۰ سال سابقه. ضمانت کالا تضمینی، ارسال اکسپرس به سراسر ایران.</p></div>' +
    '<div class="col-lg-3 col-md-6">' +
    '<div class="hm-footer-title"><span class="bar" aria-hidden="true"></span> دسترسی سریع</div>' +
    '<a href="./category.html" class="hm-footer-link"><i class="fa fa-angle-left ms-1" style="color:var(--green-primary)"></i> محصولات</a>' +
    '<a href="./choose.html" class="hm-footer-link"><i class="fa fa-angle-left ms-1" style="color:var(--green-primary)"></i> پیشنهاد هوشمند</a>' +
    '<a href="./compare.html" class="hm-footer-link"><i class="fa fa-angle-left ms-1" style="color:var(--green-primary)"></i> مقایسه</a>' +
    '<a href="./profile.html" class="hm-footer-link"><i class="fa fa-angle-left ms-1" style="color:var(--green-primary)"></i> پروفایل</a>' +
    '<a href="#" class="hm-footer-link" id="hmFooterAdmin" style="display:none"><i class="fa fa-angle-left ms-1" style="color:var(--green-primary)"></i> مدیریت</a></div>' +
    '<div class="col-lg-3 col-md-6">' +
    '<div class="hm-footer-title"><span class="bar" aria-hidden="true"></span> دسته‌بندی‌ها</div>' +
    '<a href="./category.html?category=mobile" class="hm-footer-link"><i class="fa fa-angle-left ms-1" style="color:var(--green-primary)"></i> موبایل و تبلت</a>' +
    '<a href="./category.html?category=laptop" class="hm-footer-link"><i class="fa fa-angle-left ms-1" style="color:var(--green-primary)"></i> لپ‌تاپ</a>' +
    '<a href="./category.html?category=accessory" class="hm-footer-link"><i class="fa fa-angle-left ms-1" style="color:var(--green-primary)"></i> لوازم جانبی</a>' +
    '<a href="./category.html?category=home" class="hm-footer-link"><i class="fa fa-angle-left ms-1" style="color:var(--green-primary)"></i> لوازم خانگی</a></div>' +
    '<div class="col-lg-3 col-md-6">' +
    '<div class="hm-footer-title"><span class="bar" aria-hidden="true"></span> راه‌های ارتباطی</div>' +
    '<div class="hm-footer-contact"><i class="fa fa-map-marker-alt"></i> تهران، خیابان ولیعصر</div>' +
    '<div class="hm-footer-contact"><i class="fa fa-phone"></i> ۰۲۱-۱۲۳۴۵۶۷۸</div>' +
    '<div class="hm-footer-contact"><i class="fa fa-envelope"></i> info@arzankala.com</div>' +
    '<div class="hm-footer-contact"><i class="fa fa-clock"></i> ۷ روز هفته، ۲۴ ساعته</div>' +
    '<div class="d-flex gap-2 mt-3">' +
    '<a href="#" class="hm-social-btn" aria-label="اینستاگرام"><i class="fab fa-instagram"></i></a>' +
    '<a href="#" class="hm-social-btn" aria-label="تلگرام"><i class="fab fa-telegram"></i></a>' +
    '<a href="#" class="hm-social-btn" aria-label="واتساپ"><i class="fab fa-whatsapp"></i></a>' +
    '<a href="#" class="hm-social-btn" aria-label="توییتر"><i class="fab fa-twitter"></i></a></div></div></div>' +
    '<hr style="border-color:rgba(255,255,255,0.06);margin:28px 0">' +
    '<p style="text-align:center;color:var(--text-muted);font-size:0.75rem"><i class="fa fa-copyright ms-1" style="color:var(--green-primary)"></i> کلیه حقوق برای ارزان‌کالا محفوظ است - ۱۴۰۴</p></div></footer>' +
    '<div class="hm-chatbot" aria-label="چت‌بات پشتیبانی">' +
    '<div class="hm-chatbot-panel" id="hmChatbotPanel" role="dialog" aria-label="چت با پشتیبانی">' +
    '<div class="hm-chatbot-header"><div class="avatar"><i class="fa fa-robot"></i></div>' +
    '<div class="info"><div class="name">دستیار هوشمند</div><div class="status">آنلاین</div></div>' +
    '<button class="hm-chatbot-close" id="hmChatbotClose" aria-label="بستن چت"><i class="fa fa-times"></i></button></div>' +
    '<div class="hm-chatbot-messages" id="hmChatbotMessages"></div>' +
    '<div class="hm-chatbot-quick">' +
    '<button data-q="قیمت محصولات چنده؟">قیمت‌ها</button>' +
    '<button data-q="ارسال چقدر طول میکشه؟">ارسال</button>' +
    '<button data-q="گارانتی دارید؟">گارانتی</button>' +
    '<button data-q="کد تخفیف دارید؟">تخفیف</button>' +
    '<button data-q="چه دسته‌بندی‌هایی دارید؟">دسته‌بندی</button></div>' +
    '<div class="hm-chatbot-input">' +
    '<input type="text" id="hmChatbotInput" placeholder="پیام خود را بنویسید..." aria-label="پیام چت">' +
    '<button id="hmChatbotSend" aria-label="ارسال پیام"><i class="fa fa-paper-plane"></i></button></div></div>' +
    '<button class="hm-chatbot-btn" id="hmChatbotToggle" aria-label="باز کردن چت‌بات"><i class="fa fa-robot"></i></button></div>' +
    '<div class="cart-menu-wrapper" id="hmCartMenu">' +
    '<div class="container"><div class="row justify-content-end"><div class="col-12 col-lg-4">' +
    '<div class="cart"><div class="cart-header"><h5 class="mb-0"><i class="fa fa-shopping-cart me-2"></i> سبد خرید شما <button class="btn-close btn-close-white ms-2" id="hmCartClose" aria-label="بستن سبد خرید" style="font-size:0.7rem"></button></h5></div>' +
    '<div class="cart-body"><div class="cart__items"></div>' +
    '<div class="cart-summary">' +
    '<div class="d-flex justify-content-between align-items-center mb-3">' +
    '<span class="fw-bold fs-5 text-white">مجموع :</span>' +
    '<span class="total__cost fs-4 fw-bold">0</span>' +
    '<span class="text-white-50">تومان</span></div>' +
    '<div class="d-flex gap-2">' +
    '<button class="btn btn-danger-custom flex-grow-1 removeAllItems"><i class="fa fa-trash me-1"></i> حذف همه</button>' +
    '<a class="btn btn-warning-custom flex-grow-1" href="./buy.html"><i class="fa fa-credit-card me-1"></i> پرداخت</a></div></div></div></div></div></div></div>' +
    '<button class="hm-back-to-top" id="hmBackToTop" onclick="window.scrollTo({top:0,behavior:\'smooth\'})" aria-label="بازگشت به بالا"><i class="fa fa-arrow-up"></i></button>' +
    '<div id="hmNotifContainer"></div>';

  let headerEl = document.getElementById('site-header');
  if (headerEl) headerEl.innerHTML = headerHTML;

  let footerEl = document.getElementById('site-footer');
  if (footerEl) {
    footerEl.innerHTML = footerHTML;
  } else {
    // Fallback: append to body if #site-footer missing
    document.body.insertAdjacentHTML('beforeend', footerHTML);
  }

  // Active nav link
  let links = document.querySelectorAll('.nav-2-link, .navbar-nav .nav-link');
  let i, link, href;
  for (i = 0; i < links.length; i++) {
    link = links[i];
    href = link.getAttribute('href');
    if (href === page || (page === '' && href === './index.html')) {
      link.classList.add('active');
    }
  }

  // Admin check (shared across all pages)
  let userStr = localStorage.getItem('user');
  let isAdmin = false;
  if (userStr) {
    try { let user = JSON.parse(userStr); isAdmin = user.role === 'admin'; } catch (e) {}
  }
  let adminNav = document.getElementById('hmAdminNav');
  let adminPill = document.getElementById('hmAdminPill');
  let footerAdmin = document.getElementById('hmFooterAdmin');
  if (adminNav) adminNav.style.display = isAdmin ? '' : 'none';
  if (adminPill) adminPill.style.display = isAdmin ? '' : 'none';
  if (footerAdmin) footerAdmin.style.display = isAdmin ? '' : 'none';

  // Search handler (fallback for pages without home.js)
  window.hmDoSearch = function(inputId) {
    let input = document.getElementById(inputId);
    if (!input) return;
    let q = input.value.trim();
    if (q) {
      window.location.href = './category.html?search=' + encodeURIComponent(q);
    }
  };

  // Chatbot - works on ALL pages (layout.js runs everywhere)
  function initChatbot() {
    let toggleBtn = document.getElementById('hmChatbotToggle');
    let panel = document.getElementById('hmChatbotPanel');
    let closeBtn = document.getElementById('hmChatbotClose');
    let sendBtn = document.getElementById('hmChatbotSend');
    let input = document.getElementById('hmChatbotInput');
    let messages = document.getElementById('hmChatbotMessages');
    if (!toggleBtn || !panel) {
      console.warn('Chatbot elements not found', { toggleBtn, panel, closeBtn, sendBtn, input, messages });
      return;
    }

    function openChatbot() {
      panel.classList.add('active');
      if (messages.children.length === 0) {
        addBotMessage('سلام! من دستیار هوشمند ارزان‌کالا هستم. چطور می‌تونم کمکتون کنم؟');
      }
      setTimeout(function() { if (input) input.focus(); }, 100);
    }
    function closeChatbot() { panel.classList.remove('active'); }

    toggleBtn.addEventListener('click', function() {
      panel.classList.toggle('active');
      if (panel.classList.contains('active') && messages.children.length === 0) {
        addBotMessage('سلام! من دستیار هوشمند ارزان‌کالا هستم. چطور می‌تونم کمکتون کنم؟');
      }
    });
    if (closeBtn) closeBtn.addEventListener('click', closeChatbot);

    // Nav link toggle (works on all pages)
    let navToggle = document.querySelector('.hm-chatbot-nav-toggle');
    if (navToggle) navToggle.addEventListener('click', function(e) {
      e.preventDefault();
      openChatbot();
    });

    // Mobile nav toggle
    let navToggleMobile = document.querySelector('.hm-chatbot-nav-toggle-mobile');
    if (navToggleMobile) navToggleMobile.addEventListener('click', function(e) {
      e.preventDefault();
      openChatbot();
      // Close mobile menu
      let collapse = document.getElementById('hmNavbarCollapse');
      if (collapse) collapse.classList.remove('show');
    });

    let quickBtns = panel.querySelectorAll('.hm-chatbot-quick button');
    quickBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        let q = this.getAttribute('data-q');
        addUserMessage(q);
        setTimeout(function() { handleBotReply(q); }, 600);
      });
    });

    if (sendBtn && input) {
      sendBtn.addEventListener('click', function() {
        let val = input.value.trim();
        if (!val) return;
        addUserMessage(val);
        input.value = '';
        setTimeout(function() { handleBotReply(val); }, 600);
      });
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') sendBtn.click();
      });
    }

    function addBotMessage(text) {
      let div = document.createElement('div');
      div.className = 'hm-chat-msg bot';
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }
    function addUserMessage(text) {
      let div = document.createElement('div');
      div.className = 'hm-chat-msg user';
      div.textContent = text;
      messages.appendChild(div);
      messages.scrollTop = messages.scrollHeight;
    }
    function handleBotReply(q) {
      let lower = q.toLowerCase();
      if (lower.includes('قیمت') || lower.includes('ارزان')) {
        addBotMessage('قیمت‌ها بر اساس نرخ لحظه‌ای دلار محاسبه می‌شن. می‌تونید محصول مورد نظرتون رو جستجو کنید!');
      } else if (lower.includes('ارسال') || lower.includes('تحویل')) {
        addBotMessage('ارسال محصولات ۱ تا ۳ روز کاریه. ارسال رایگان برای خریدهای بالای ۵۰۰ هزار تومان!');
      } else if (lower.includes('گارانتی') || lower.includes('ضمانت')) {
        addBotMessage('تمام محصولات ما دارای گارانتی اصالت هستن. ۷ روز هم فرصت بازگشت دارید.');
      } else if (lower.includes('تخفیف') || lower.includes('کد')) {
        addBotMessage('برای دریافت کد تخفیف، ایمیلتون رو در خبرنامه ثبت کنید! ۱۰٪ تخفیف ویژه عضویت داریم.');
      } else if (lower.includes('دسته') || lower.includes('دسته‌بندی')) {
        addBotMessage('ما ۸ دسته‌بندی داریم: موبایل، لپ‌تاپ، لوازم جانبی، گیمینگ، دوربین، مانیتور، لوازم خانگی و تلویزیون.');
      } else {
        addBotMessage('ممنون از پیامتون! برای اطلاعات بیشتر با پشتیبانی ۰۲۱-۱۲۳۴۵۶۷۸ تماس بگیرید.');
      }
    }

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && panel.classList.contains('active')) closeChatbot();
    });

    // Close on click outside
    document.addEventListener('click', function(e) {
      if (panel.classList.contains('active') &&
          !panel.contains(e.target) &&
          e.target !== toggleBtn &&
          !toggleBtn.contains(e.target) &&
          e.target !== navToggle &&
          !navToggle?.contains(e.target) &&
          e.target !== navToggleMobile &&
          !navToggleMobile?.contains(e.target)) {
        closeChatbot();
      }
    });

    // Highlight nav links when open
    let observer = new MutationObserver(function() {
      let navToggle = document.querySelector('.hm-chatbot-nav-toggle');
      let navToggleMobile = document.querySelector('.hm-chatbot-nav-toggle-mobile');
      let isActive = panel.classList.contains('active');
      if (navToggle) navToggle.classList.toggle('active', isActive);
      if (navToggleMobile) navToggleMobile.classList.toggle('active', isActive);
    });
    observer.observe(panel, { attributes: true, attributeFilter: ['class'] });
  }

  // Cart menu - works on ALL pages
  function initCartMenu() {
    let cartBtn = document.getElementById('hmCartBtn');
    let cartMenu = document.getElementById('hmCartMenu');
    let cartClose = document.getElementById('hmCartClose');
    if (cartBtn && cartMenu) {
      cartBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        cartMenu.classList.toggle('active');
        if (cartMenu.classList.contains('active')) {
          if (typeof window.updateCartUI === 'function') window.updateCartUI();
        }
      });
      if (cartClose) cartClose.addEventListener('click', function() { cartMenu.classList.remove('active'); });
      document.addEventListener('click', function(e) {
        if (!cartBtn.contains(e.target) && !cartMenu.contains(e.target)) cartMenu.classList.remove('active');
      });
    }
  }

  function runInit() {
    initChatbot();
    initCartMenu();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInit);
  } else {
    runInit();
  }
})();
