document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('slider');
    if (!slider) return;
    
    const slides = slider.querySelectorAll('.slide');
    const prevBtn = slider.querySelector('.prev');
    const nextBtn = slider.querySelector('.next');
    const progressBar = slider.querySelector('.progress-bar');
    
    if (!slides.length) return;
    
    let currentSlide = 0;
    let progressTimer = null;
    let slideTimer = null;
    let isTransitioning = false;
    
    function showSlide(index) {
        if (isTransitioning) return;
        isTransitioning = true;
        
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        
        for (let i = 0; i < slides.length; i++) {
            if (i === index) {
                slides[i].classList.add('active');
            } else {
                slides[i].classList.remove('active');
            }
        }
        
        currentSlide = index;
        
        setTimeout(function() {
            isTransitioning = false;
        }, 500);
        
        resetProgress();
    }
    
    function resetProgress() {
        if (progressTimer) {
            clearTimeout(progressTimer);
            progressTimer = null;
        }
        
        if (slideTimer) {
            clearTimeout(slideTimer);
            slideTimer = null;
        }
        
        if (!progressBar) return;
        
        progressBar.style.transition = 'none';
        progressBar.style.width = '0%';
        
        setTimeout(function() {
            progressBar.style.transition = 'width 5s linear';
            progressBar.style.width = '100%';
            
            slideTimer = setTimeout(function() {
                let nextIndex = currentSlide + 1;
                if (nextIndex >= slides.length) nextIndex = 0;
                showSlide(nextIndex);
            }, 5000);
        }, 50);
    }
    
    function stopProgress() {
        if (progressTimer) {
            clearTimeout(progressTimer);
            progressTimer = null;
        }
        if (slideTimer) {
            clearTimeout(slideTimer);
            slideTimer = null;
        }
        if (progressBar) {
            progressBar.style.transition = 'none';
        }
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            stopProgress();
            showSlide(currentSlide - 1);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            stopProgress();
            showSlide(currentSlide + 1);
        });
    }
    
    if (slider) {
        slider.addEventListener('mouseenter', function() {
            stopProgress();
        });
        
        slider.addEventListener('mouseleave', function() {
            resetProgress();
        });
    }
    
    showSlide(0);
});