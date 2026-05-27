 const birth = document.querySelector('#birth');
        let options = '';
        for (let i = 1404; i > 1300; i--) {
            options += `<option value="${i}">${i}</option>`;
        }
        if (birth) birth.innerHTML = options;

        function setupPasswordToggle(eyeId, inputId) {
            const eye = document.querySelector(eyeId);
            const input = document.querySelector(inputId);
            if (eye && input) {
                eye.addEventListener('click', function() {
                    const type = input.type === 'password' ? 'text' : 'password';
                    input.type = type;
                    this.classList.toggle('fa-eye');
                    this.classList.toggle('fa-eye-slash');
                });
            }
        }
        
        setupPasswordToggle('#togglePass1', '#pass1');
        setupPasswordToggle('#togglePass2', '#pass2');
        setupPasswordToggle('#toggleLoginPass', '#loginPass');

        const registerForm = document.querySelector('#registerForm');
        const loginForm = document.querySelector('#loginForm');
        
        const toLogin = document.querySelector('#toLogin');
        const toRegister = document.querySelector('#toRegister');
        
        if (toLogin) {
            toLogin.onclick = function(e) {
                e.preventDefault();
                registerForm.classList.add('d-none');
                loginForm.classList.remove('d-none');
            };
        }
        
        if (toRegister) {
            toRegister.onclick = function(e) {
                e.preventDefault();
                loginForm.classList.add('d-none');
                registerForm.classList.remove('d-none');
            };
        }

        const btnRegister = document.querySelector('#btnregister');
        if (btnRegister) {
            btnRegister.addEventListener('click', function(e) {
                e.preventDefault();
                const fullnamer = document.querySelector('#fullnamer')?.value.trim();
                const birthVal = document.querySelector('#birth')?.value;
                const mobiler = document.querySelector('#mobiler')?.value.trim();
                const usernamer = document.querySelector('#usernamer')?.value.trim();
                const pass1 = document.querySelector('#pass1')?.value;
                const pass2 = document.querySelector('#pass2')?.value;

                if (!fullnamer || !mobiler || !usernamer || !pass1 || !pass2) {
                    alert('❌ لطفاً تمام فیلدها را پر کنید!');
                    return;
                }
                
                if (pass1 !== pass2) {
                    alert('❌ کلمه‌های عبور یکسان نیستند!');
                    return;
                }

                const users = JSON.parse(localStorage.getItem('users') || '[]');
                if (users.some(u => u.username === usernamer)) {
                    alert('❌ این نام کاربری قبلاً ثبت شده است');
                    return;
                }
                
                users.push({ 
                    fullnamer, 
                    birth: birthVal, 
                    mobile: mobiler, 
                    username: usernamer, 
                    password: pass1 
                });
                
                localStorage.setItem('users', JSON.stringify(users));
                alert('✅ ثبت نام با موفقیت انجام شد!');
                document.querySelector('#registerForm')?.reset();
                
                registerForm.classList.add('d-none');
                loginForm.classList.remove('d-none');
            });
        }

        const btnLogin = document.querySelector('#btnlogin');
        if (btnLogin) {
            btnLogin.addEventListener('click', function(e) {
                e.preventDefault();
                const loginUser = document.querySelector('#loginUser')?.value.trim();
                const loginPass = document.querySelector('#loginPass')?.value;

                const users = JSON.parse(localStorage.getItem('users') || '[]');
                const user = users.find(u => u.username === loginUser && u.password === loginPass);

                if (user) {
                    alert(`✅ خوش آمدید ${user.fullnamer || user.username} 😎`);
                    window.location.href = 'index.html';
                } else {
                    alert('❌ نام کاربری یا کلمه عبور اشتباه است!');
                }
            });
        }