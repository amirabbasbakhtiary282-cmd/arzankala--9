(function() {
    document.addEventListener('DOMContentLoaded', function() {
        createInstallmentCalculator();
    });

    function createInstallmentCalculator() {
        const container = document.getElementById('buyTimeStatus');
        if (!container) return;

        container.innerHTML = '';

        container.innerHTML = `
            <div class="installment-calculator" style="background: #111413; border-radius: 16px; padding: 20px; border: 1px solid #00c853;">
                <h5 class="text-success mb-3">
                    <i class="fa fa-calculator ms-2"></i>
                    ماشین حساب اقساط
                </h5>

                <div class="mb-3">
                    <label class="form-label text-white-50 small">مبلغ محصول (تومان)</label>
                    <input type="number" id="installmentPrice" class="form-control" placeholder="مثلاً ۲۰۰۰۰۰۰۰" value="20000000">
                </div>

                <div class="mb-3">
                    <label class="form-label text-white-50 small">درصد پیش‌پرداخت</label>
                    <select id="installmentDownPayment" class="form-select">
                        <option value="0">۰٪ (بدون پیش‌پرداخت)</option>
                        <option value="10">۱۰٪</option>
                        <option value="20" selected>۲۰٪</option>
                        <option value="30">۳۰٪</option>
                        <option value="40">۴۰٪</option>
                        <option value="50">۵۰٪</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label text-white-50 small">مدت بازپرداخت (ماه)</label>
                    <select id="installmentMonths" class="form-select">
                        <option value="6">۶ ماهه</option>
                        <option value="12" selected>۱۲ ماهه</option>
                        <option value="18">۱۸ ماهه</option>
                        <option value="24">۲۴ ماهه</option>
                        <option value="36">۳۶ ماهه</option>
                    </select>
                </div>

                <div class="mb-3">
                    <label class="form-label text-white-50 small">کارمزد سالانه (٪)</label>
                    <input type="number" id="installmentInterest" class="form-control" value="18" step="0.1" min="0" max="36">
                    <small class="text-muted">کارمزد معمول بانکی ۱۸-۲۴٪ است</small>
                </div>

                <button id="calcInstallmentBtn" class="btn btn-success w-100 mb-3">
                    <i class="fa fa-calculator ms-2"></i>
                    محاسبه اقساط
                </button>

                <div id="installmentResult" class="p-3" style="background: #0a0c0b; border-radius: 12px; display: none;">
                    <div class="d-flex justify-content-between mb-2">
                        <span>پیش‌پرداخت:</span>
                        <span class="text-warning fw-bold" id="downPaymentAmount">۰</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span>مبلغ وام:</span>
                        <span class="text-info fw-bold" id="loanAmount">۰</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2">
                        <span>کارمزد کل:</span>
                        <span class="text-danger" id="totalInterest">۰</span>
                    </div>
                    <div class="d-flex justify-content-between mb-2 border-top border-secondary pt-2">
                        <span class="fw-bold">قسط ماهانه:</span>
                        <span class="text-success fw-bold fs-5" id="monthlyPayment">۰</span>
                    </div>
                    <div class="d-flex justify-content-between">
                        <span>مبلغ کل پرداختی:</span>
                        <span class="fw-bold" id="totalPayment">۰</span>
                    </div>
                </div>

                <div class="small text-muted mt-2">
                    <i class="fa fa-info-circle text-success"></i>
                    محاسبات تقریبی و بدون در نظر گرفتن بیمه و هزینه‌های جانبی است
                </div>
            </div>
        `;

        document.getElementById('calcInstallmentBtn').addEventListener('click', calculateInstallment);

        setTimeout(calculateInstallment, 100);
    }

    function calculateInstallment() {
        const price = parseFloat(document.getElementById('installmentPrice').value) || 0;
        const downPercent = parseFloat(document.getElementById('installmentDownPayment').value) || 0;
        const months = parseFloat(document.getElementById('installmentMonths').value) || 12;
        const yearlyInterest = parseFloat(document.getElementById('installmentInterest').value) || 18;

        if (price <= 0) {
            alert('لطفاً مبلغ معتبری وارد کنید');
            return;
        }

        const downPayment = price * (downPercent / 100);
        const loanAmount = price - downPayment;
        const monthlyInterest = (yearlyInterest / 12) / 100;
        const totalInterest = loanAmount * monthlyInterest * months;
        const totalPayment = loanAmount + totalInterest;
        const monthlyPayment = totalPayment / months;

        document.getElementById('downPaymentAmount').textContent = downPayment.toLocaleString() + ' تومان';
        document.getElementById('loanAmount').textContent = loanAmount.toLocaleString() + ' تومان';
        document.getElementById('totalInterest').textContent = totalInterest.toLocaleString() + ' تومان';
        document.getElementById('monthlyPayment').textContent = monthlyPayment.toLocaleString() + ' تومان';
        document.getElementById('totalPayment').textContent = totalPayment.toLocaleString() + ' تومان';

        document.getElementById('installmentResult').style.display = 'block';
    }
})();