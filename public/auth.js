class Auth {
    static async register(userData) {
        try {
            console.log('📤 Enviando datos de registro:', userData);

            // Validación mejorada del cliente
            const { name, email, password, confirmPassword } = userData;
            
            if (!name || !email || !password || !confirmPassword) {
                throw new Error('Todos los campos son requeridos');
            }

            if (password !== confirmPassword) {
                throw new Error('Las contraseñas no coinciden');
            }

            if (password.length < 6) {
                throw new Error('La contraseña debe tener al menos 6 caracteres');
            }

            if (!this.validateEmail(email)) {
                throw new Error('El correo electrónico no es válido');
            }

            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            console.log('📥 Respuesta del servidor recibida');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Error del servidor:', {
                    status: response.status,
                    error: errorData
                });
                throw new Error(
                    errorData.message || 
                    `Error en el registro (${response.status})`
                );
            }

            const data = await response.json();
            
            console.log('🔐 Datos recibidos:', data);

            if (!data.token || !data.user) {
                throw new Error('Respuesta del servidor incompleta');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            this.showMessage('¡Registro exitoso! Redirigiendo...', 'success');

            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1500);

            return data;
        } catch (error) {
            console.error('❌ Error completo en el registro:', {
                message: error.message,
                stack: error.stack
            });

            let errorMessage = error.message;

            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión.';
            }

            this.showMessage(errorMessage, 'danger');
            throw error;
        }
    }

    static validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    static async login(email, password) {
        try {
            if (!email || !password) {
                throw new Error('Email y contraseña son requeridos');
            }

            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(
                    errorData.message || 
                    `Error en el login (${response.status})`
                );
            }

            const data = await response.json();

            if (!data.token || !data.user) {
                throw new Error('Respuesta del servidor incompleta');
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            window.location.href = '/index.html';
            return data;
        } catch (error) {
            console.error('Login error:', error);
            this.showMessage(
                error.message || 'Error al iniciar sesión', 
                'danger'
            );
            throw error;
        }
    }

    static logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html?logout=true';
    }

    static isAuthenticated() {
        const token = localStorage.getItem('token');
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.exp && payload.exp < Date.now() / 1000) {
                this.logout();
                return false;
            }
            return true;
        } catch (e) {
            console.error('Error al verificar token:', e);
            return false;
        }
    }

    static showMessage(message, type = 'success') {
        // Limpiar mensajes anteriores
        const existingAlerts = document.querySelectorAll('.auth-message');
        existingAlerts.forEach(el => el.remove());

        const alertDiv = document.createElement('div');
        alertDiv.className = `auth-message alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3`;
        alertDiv.style.zIndex = '1000';
        alertDiv.style.minWidth = '300px';
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} me-2"></i>
                <span>${message}</span>
                <button class="btn-close ms-auto" onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;
        document.body.appendChild(alertDiv);

        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Protección de rutas
document.addEventListener('DOMContentLoaded', () => {
    const publicRoutes = ['/login.html', '/register.html'];
    const currentPath = window.location.pathname;

    if (publicRoutes.includes(currentPath)) {
        if (Auth.isAuthenticated()) {
            window.location.href = '/index.html';
        }
    } else {
        if (!Auth.isAuthenticated()) {
            window.location.href = '/login.html?redirect=' + encodeURIComponent(currentPath);
        }
    }
});

window.Auth = Auth;