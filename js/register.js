// register.js - Registration and login with API fallback to localStorage
(function() {
    document.addEventListener('DOMContentLoaded', function() {
        const birth = document.querySelector('#birth');
        if (birth) {
            let options = '';
            for (let i = 1404; i > 1300; i--) {
                options += `<option value="${i}">${i}</option>`;
            }
            birth.innerHTML = options;
        }

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
            toLogin.addEventListener('click', function(e) {
                e.preventDefault();
                registerForm.classList.add('d-none');
                loginForm.classList.remove('d-none');
            });
        }

        if (toRegister) {
            toRegister.addEventListener('click', function(e) {
                e.preventDefault();
                loginForm.classList.add('d-none');
                registerForm.classList.remove('d-none');
            });
        }

        const btnRegister = document.querySelector('#btnregister');
        if (btnRegister) {
            btnRegister.addEventListener('click', async function(e) {
                e.preventDefault();
                const fullnamer = document.querySelector('#fullnamer')?.value.trim();
                const birthVal = document.querySelector('#birth')?.value;
                const mobiler = document.querySelector('#mobiler')?.value.trim();
                const usernamer = document.querySelector('#usernamer')?.value.trim();
                const pass1 = document.querySelector('#pass1')?.value;
                const pass2 = document.querySelector('#pass2')?.value;

                if (!fullnamer || !mobiler || !usernamer || !pass1 || !pass2) {
                    alert('لطفاً تمام فیلدها را پر کنید!');
                    return;
                }

                if (pass1 !== pass2) {
                    alert('کلمه‌های عبور یکسان نیستند!');
                    return;
                }

                let registered = false;

                if (window.API && window.API.register) {
                    const result = await API.register(fullnamer, usernamer, pass1, '', mobiler, birthVal || '');
                    if (result.success) {
                        registered = true;
                        alert('ثبت نام با موفقیت انجام شد! خوش آمدید');
                        window.location.href = 'index.html';
                        return;
                    }
                }

                if (!registered) {
                    const users = JSON.parse(localStorage.getItem('users') || '[]');
                    if (users.some(u => u.username === usernamer)) {
                        alert('این نام کاربری قبلاً ثبت شده است');
                        return;
                    }
                    const isAdmin = usernamer === 'admin' && pass1 === 'admin123';
                    users.push({ fullnamer, birth: birthVal, mobile: mobiler, username: usernamer, password: pass1, role: isAdmin ? 'admin' : 'user' });
                    localStorage.setItem('users', JSON.stringify(users));
                    localStorage.setItem('token', 'local-' + Date.now());
                    localStorage.setItem('user', JSON.stringify({ fullname: fullnamer, username: usernamer, role: isAdmin ? 'admin' : 'user' }));
                    alert('ثبت نام با موفقیت انجام شد!');
                    document.querySelector('#registerForm')?.reset();
                    registerForm.classList.add('d-none');
                    loginForm.classList.remove('d-none');
                }
            });
        }

        const btnLogin = document.querySelector('#btnlogin');
        if (btnLogin) {
            btnLogin.addEventListener('click', async function(e) {
                e.preventDefault();
                const loginUser = document.querySelector('#loginUser')?.value.trim();
                const loginPass = document.querySelector('#loginPass')?.value;

                if (!loginUser || !loginPass) {
                    alert('لطفاً نام کاربری و کلمه عبور را وارد کنید');
                    return;
                }

                let loggedIn = false;

                if (window.API && window.API.login) {
                    const result = await API.login(loginUser, loginPass);
                    if (result.success) {
                        loggedIn = true;
                        const user = result.user || JSON.parse(localStorage.getItem('user') || '{}');
                        alert('خوش آمدید');
                        window.location.href = user.role === 'admin' ? 'admin.html' : 'index.html';
                        return;
                    }
                }

                if (!loggedIn) {
                    // Hardcoded admin fallback when server is down
                    if (loginUser === 'admin' && loginPass === 'admin123') {
                        localStorage.setItem('token', 'local-' + Date.now());
                        localStorage.setItem('user', JSON.stringify({ id: 1, username: 'admin', fullname: 'مدیر سیستم', role: 'admin' }));
                        alert('خوش آمدید مدیر');
                        window.location.href = 'admin.html';
                        return;
                    }
                    const users = JSON.parse(localStorage.getItem('users') || '[]');
                    const user = users.find(u => u.username === loginUser && u.password === loginPass);
                    if (user) {
                        localStorage.setItem('token', 'local-' + Date.now());
                        localStorage.setItem('user', JSON.stringify({ fullname: user.fullnamer, username: user.username, role: 'user' }));
                        alert(`خوش آمدید ${user.fullnamer || user.username}`);
                        window.location.href = 'index.html';
                    } else {
                        alert('نام کاربری یا کلمه عبور اشتباه است!');
                    }
                }
            });
        }
    });
})();
