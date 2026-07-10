(function() {
    let slides, currentSlide = 0, autoPlayTimer, progressTimer;
    let AUTO_INTERVAL = 5000;

    function initSlider() {
        let wrapper = document.querySelector('.slider-wrapper');
        if (!wrapper) return;
        slides = wrapper.querySelectorAll('.slide');
        if (slides.length < 2) return;

        let prevBtn = document.querySelector('.slider-wrapper + .prev, #slider .prev');
        let nextBtn = document.querySelector('.slider-wrapper + .next, #slider .next');
        if (!prevBtn) prevBtn = document.querySelector('.prev');
        if (!nextBtn) nextBtn = document.querySelector('.next');

        if (prevBtn) prevBtn.addEventListener('click', function() { navigateSlide(-1); resetAutoPlay(); });
        if (nextBtn) nextBtn.addEventListener('click', function() { navigateSlide(1); resetAutoPlay(); });

        startAutoPlay();
        addTouchSupport(wrapper);
    }

    function addTouchSupport(el) {
        let startX = 0, startY = 0, dist = 0;
        el.addEventListener('touchstart', function(e) {
            let touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;
            dist = 0;
        }, {passive: true});
        el.addEventListener('touchmove', function(e) {
            let touch = e.touches[0];
            dist = touch.clientX - startX;
        }, {passive: true});
        el.addEventListener('touchend', function(e) {
            let dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dy) > Math.abs(dist) * 1.5) return;
            if (Math.abs(dist) > 50) {
                if (dist > 0) { navigateSlide(-1); } else { navigateSlide(1); }
                resetAutoPlay();
            }
        }, {passive: true});
    }

    function navigateSlide(direction) {
        if (!slides || slides.length === 0) return;
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + direction + slides.length) % slides.length;
        slides[currentSlide].classList.add('active');
        updateProgressBar();
    }

    function startAutoPlay() {
        stopAutoPlay();
        autoPlayTimer = setInterval(function() { navigateSlide(1); }, AUTO_INTERVAL);
    }

    function stopAutoPlay() {
        if (autoPlayTimer) { clearInterval(autoPlayTimer); autoPlayTimer = null; }
        if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
    }

    function resetAutoPlay() {
        stopAutoPlay();
        startAutoPlay();
    }

    function updateProgressBar() {
        let bar = document.querySelector('.progress-bar');
        if (bar) {
            bar.style.transition = 'none';
            bar.style.width = '0%';
            setTimeout(function() {
                bar.style.transition = 'width ' + AUTO_INTERVAL + 'ms linear';
                bar.style.width = '100%';
            }, 50);
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        initSlider();
    });

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        initSlider();
    }
})();
