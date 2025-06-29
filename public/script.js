// Configuración del entorno (solo para PWA)
const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
const isSecure = window.location.protocol === 'https:';
const isFileProtocol = window.location.protocol === 'file:';

// URLs de las APIs deployadas en Render (reemplaza con tus URLs reales)
const API_URLS = {
    devices: 'https://api-dispositivos.onrender.com/api/devices',
    blockDevice: 'https://api-dispositivos.onrender.com/api/block-device',
    blockedSites: 'https://api-bloqueos.onrender.com/api/blocked-sites',
    schedules: 'https://api-horarios.onrender.com/api/schedules'
};

// Estado de la aplicación
const AppState = {
    deferredPrompt: null,  // Para PWA
    isPWAInstalled: false, // Para PWA
    isLoading: false
};

// Elementos DOM
const DOM = {
    // Tabla de dispositivos
    devicesTable: document.querySelector("#devicesTable tbody"),

    // Bloqueo de sitios
    blockedSitesList: document.getElementById("blockedSitesList"),
    siteToBlockInput: document.getElementById("siteToBlock"),
    addRuleBtn: document.getElementById("addRule"),

    // Horarios
    scheduleForm: document.getElementById("scheduleForm"),
    startTime: document.getElementById("startTime"),
    endTime: document.getElementById("endTime"),
    scheduleAction: document.getElementById("scheduleAction"),

    // PWA
    installPWA: document.getElementById("installPWA"),
    installPWAFloat: document.getElementById("installPWA-Float"),

    // Loaders
    devicesLoader: document.getElementById("devicesLoader"),
    sitesLoader: document.getElementById("sitesLoader"),
    scheduleLoader: document.getElementById("scheduleLoader"),

    // Autenticación
    logoutBtn: document.getElementById("logoutBtn"),
    userProfile: document.getElementById("userProfile")
};

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Carga la lista de dispositivos desde la API
 */
async function loadDevices() {
    try {
        showLoader('devices');
        
        const response = await fetchWithTimeout(API_URLS.devices, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                Auth.logout();
                return;
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const devices = await response.json();
        renderDevices(devices);
    } catch (error) {
        console.error("Error al cargar dispositivos:", error);
        showAlert("Error al cargar dispositivos", "danger");
    } finally {
        hideLoader('devices');
    }
}

/**
 * Renderiza la lista de dispositivos en la tabla
 */
function renderDevices(devices) {
    if (!devices || !Array.isArray(devices)) {
        console.error("Datos de dispositivos inválidos:", devices);
        return;
    }

    DOM.devicesTable.innerHTML = devices.map(device => `
        <tr>
            <td>${escapeHtml(device.name || "Desconocido")}</td>
            <td>${escapeHtml(device.ip)}</td>
            <td>
                <span class="badge bg-${device.status === "connected" ? "success" : "danger"}">
                    ${device.status === "connected" ? "Conectado" : "Bloqueado"}
                </span>
            </td>
            <td>
                <button class="btn btn-sm ${device.status === "connected" ? "btn-danger" : "btn-success"} btn-action" 
                        data-ip="${escapeHtml(device.ip)}" 
                        data-action="${device.status === "connected" ? "block" : "unblock"}">
                    ${device.status === "connected" ? "Bloquear" : "Permitir"}
                </button>
            </td>
        </tr>
    `).join("");
}

/**
 * Maneja el bloqueo/desbloqueo de dispositivos
 */
async function handleDeviceAction(ip, action) {
    if (!ip || !action) return;

    try {
        showLoader('devices');

        const response = await fetchWithTimeout(API_URLS.blockDevice, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ ip, action })
        });

        if (!response.ok) {
            if (response.status === 401) {
                Auth.logout();
                return;
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        await loadDevices();
        showAlert(`Dispositivo ${action === 'block' ? 'bloqueado' : 'desbloqueado'} correctamente`, "success");
    } catch (error) {
        console.error("Error al cambiar estado del dispositivo:", error);
        showAlert("Error al realizar la acción", "danger");
    } finally {
        hideLoader('devices');
    }
}

/**
 * Carga la lista de sitios bloqueados
 */
async function loadBlockedSites() {
    try {
        showLoader('sites');

        const response = await fetchWithTimeout(API_URLS.blockedSites, {
            headers: {
                'Authorization': `Bearer ${Auth.getToken()}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                Auth.logout();
                return;
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const sites = await response.json();
        renderBlockedSites(sites);
    } catch (error) {
        console.error("Error al cargar sitios bloqueados:", error);
        showAlert("Error al cargar sitios bloqueados", "danger");
    } finally {
        hideLoader('sites');
    }
}

/**
 * Renderiza la lista de sitios bloqueados
 */
function renderBlockedSites(sites) {
    if (!sites || !Array.isArray(sites)) {
        console.error("Datos de sitios bloqueados inválidos:", sites);
        return;
    }

    DOM.blockedSitesList.innerHTML = sites.map(site => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            ${escapeHtml(site.url)}
            <button class="btn btn-sm btn-success btn-unblock" data-url="${escapeHtml(site.url)}">
                <i class="fas fa-unlock me-1"></i> Desbloquear
            </button>
        </li>
    `).join("");
}

/**
 * Agrega un nuevo sitio a bloquear
 */
async function addBlockedSite(url) {
    if (!url) {
        showAlert("Ingresa una URL válida", "warning");
        return;
    }

    try {
        showLoader('sites');

        const response = await fetchWithTimeout(API_URLS.blockedSites, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            if (response.status === 401) {
                Auth.logout();
                return;
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        DOM.siteToBlockInput.value = "";
        await loadBlockedSites();
        showAlert(`Sitio ${url} bloqueado correctamente`, "success");
    } catch (error) {
        console.error("Error al bloquear sitio:", error);
        showAlert("Error al bloquear el sitio", "danger");
    } finally {
        hideLoader('sites');
    }
}

/**
 * Desbloquea un sitio
 */
async function unblockSite(url) {
    if (!url) return;

    try {
        showLoader('sites');

        const response = await fetchWithTimeout(
            `${API_URLS.blockedSites}?url=${encodeURIComponent(url)}`,
            { 
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${Auth.getToken()}`
                }
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                Auth.logout();
                return;
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        await loadBlockedSites();
        showAlert(`Sitio ${url} desbloqueado correctamente`, "success");
    } catch (error) {
        console.error("Error al desbloquear sitio:", error);
        showAlert("Error al desbloquear el sitio", "danger");
    } finally {
        hideLoader('sites');
    }
}

/**
 * Guarda un nuevo horario de bloqueo
 */
async function saveSchedule(startTime, endTime, action) {
    if (!startTime || !endTime || !action) {
        showAlert("Completa todos los campos del horario", "warning");
        return;
    }

    try {
        showLoader('schedule');

        const response = await fetchWithTimeout(API_URLS.schedules, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Auth.getToken()}`
            },
            body: JSON.stringify({ startTime, endTime, action })
        });

        if (!response.ok) {
            if (response.status === 401) {
                Auth.logout();
                return;
            }
            throw new Error(`Error HTTP: ${response.status}`);
        }

        DOM.scheduleForm.reset();
        showAlert("Horario guardado correctamente", "success");
    } catch (error) {
        console.error("Error al guardar horario:", error);
        showAlert("Error al guardar el horario", "danger");
    } finally {
        hideLoader('schedule');
    }
}

// ==================== PWA (Manteniendo tu implementación original) ====================

/**
 * Configura la funcionalidad PWA
 */
function setupPWA() {
    // Verificar si podemos instalar la PWA
    const canInstallPWA = !isFileProtocol && ('serviceWorker' in navigator) &&
        (isSecure || isLocalhost);

    if (!canInstallPWA) {
        console.warn("PWA no disponible en este entorno:", {
            protocol: window.location.protocol,
            isLocalhost,
            isSecure,
            hasSW: 'serviceWorker' in navigator
        });
        return;
    }

    // Registrar Service Worker
    registerServiceWorker();

    // Configurar instalación PWA
    setupInstallPrompt();
}

/**
 * Registra el Service Worker
 */
function registerServiceWorker() {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            console.log('ServiceWorker registrado con éxito:', registration.scope);

            // Verificar actualizaciones periódicamente
            setInterval(() => registration.update(), 60 * 60 * 1000); // Cada hora
        } catch (error) {
            console.error('Error al registrar ServiceWorker:', error);
        }
    });
}

/**
 * Configura el prompt de instalación
 */
function setupInstallPrompt() {
    let installFallbackTimeout;

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        AppState.deferredPrompt = e;
        showInstallButton();
        console.log('Evento beforeinstallprompt activado');

        // Cancelar el fallback si el evento se disparó
        clearTimeout(installFallbackTimeout);
    });

    // Mostrar botón después de 10 segundos si el evento no se disparó
    installFallbackTimeout = setTimeout(() => {
        if (!AppState.isPWAInstalled && !AppState.deferredPrompt) {
            console.warn('El evento beforeinstallprompt no se disparó, mostrando botón manualmente');
            showInstallButton(true);
        }
    }, 10000);

    // Configurar listeners para los botones de instalación
    const installButtons = [DOM.installPWA, DOM.installPWAFloat?.querySelector('button')];
    installButtons.forEach(btn => {
        btn?.addEventListener('click', async () => {
            if (!AppState.deferredPrompt) return;

            try {
                AppState.deferredPrompt.prompt();
                const { outcome } = await AppState.deferredPrompt.userChoice;

                if (outcome === 'accepted') {
                    console.log('Usuario aceptó la instalación');
                    AppState.isPWAInstalled = true;
                    hideInstallButton();
                } else {
                    console.log('Usuario rechazó la instalación');
                }
            } catch (error) {
                console.error('Error al mostrar el prompt de instalación:', error);
            }
        });
    });

    // Detectar si la PWA ya está instalada
    window.addEventListener('appinstalled', () => {
        console.log('PWA instalada con éxito');
        AppState.isPWAInstalled = true;
        hideInstallButton();
        clearTimeout(installFallbackTimeout);
    });

    // Verificar el modo de visualización actual
    if (window.matchMedia('(display-mode: standalone)').matches) {
        AppState.isPWAInstalled = true;
        hideInstallButton();
    }
}

/**
 * Muestra el botón de instalación
 */
function showInstallButton(isFallback = false) {
    if (AppState.isPWAInstalled) return;

    if (DOM.installPWA) {
        DOM.installPWA.classList.remove('d-none');
        if (isFallback) {
            DOM.installPWA.innerHTML = '<i class="fas fa-download me-2"></i>Instalar App (Modo Seguro)';
            DOM.installPWA.classList.add('btn-warning');
        }
    }
    if (DOM.installPWAFloat) DOM.installPWAFloat.classList.remove('d-none');
}

/**
 * Oculta el botón de instalación
 */
function hideInstallButton() {
    if (DOM.installPWA) DOM.installPWA.classList.add('d-none');
    if (DOM.installPWAFloat) DOM.installPWAFloat.classList.add('d-none');
}

// ==================== UTILIDADES ====================

/**
 * Muestra un mensaje de alerta
 */
function showAlert(message, type, duration = 3000) {
    const alertId = `alert-${Date.now()}`;
    const alert = document.createElement('div');
    alert.id = alertId;
    alert.className = `alert alert-${type} position-fixed top-0 start-50 translate-middle-x mt-3 fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        <div class="d-flex align-items-center">
            <i class="fas ${type === 'success' ? 'fa-check-circle' :
            type === 'warning' ? 'fa-exclamation-triangle' :
                'fa-exclamation-circle'} me-2"></i>
            <span>${message}</span>
            <button type="button" class="btn-close ms-auto" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    document.body.appendChild(alert);

    // Cierre automático
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.classList.remove('show');
            setTimeout(() => alertElement.remove(), 150);
        }
    }, duration);
}

/**
 * Muestra un indicador de carga
 */
function showLoader(context) {
    AppState.isLoading = true;

    const loaders = {
        devices: () => {
            if (DOM.devicesLoader) DOM.devicesLoader.classList.remove('d-none');
            if (DOM.devicesTable) DOM.devicesTable.classList.add('d-none');
        },
        sites: () => {
            if (DOM.sitesLoader) DOM.sitesLoader.classList.remove('d-none');
            if (DOM.blockedSitesList) DOM.blockedSitesList.classList.add('d-none');
        },
        schedule: () => {
            if (DOM.scheduleLoader) DOM.scheduleLoader.classList.remove('d-none');
            const submitBtn = DOM.scheduleForm?.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `
                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Guardando...
                `;
            }
        }
    };

    if (loaders[context]) loaders[context]();
}

/**
 * Oculta el indicador de carga
 */
function hideLoader(context) {
    AppState.isLoading = false;

    const hiders = {
        devices: () => {
            if (DOM.devicesLoader) DOM.devicesLoader.classList.add('d-none');
            if (DOM.devicesTable) DOM.devicesTable.classList.remove('d-none');
        },
        sites: () => {
            if (DOM.sitesLoader) DOM.sitesLoader.classList.add('d-none');
            if (DOM.blockedSitesList) DOM.blockedSitesList.classList.remove('d-none');
        },
        schedule: () => {
            if (DOM.scheduleLoader) DOM.scheduleLoader.classList.add('d-none');
            const submitBtn = DOM.scheduleForm?.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Guardar Horario';
            }
        }
    };

    if (hiders[context]) hiders[context]();
}

/**
 * Fetch con timeout
 */
async function fetchWithTimeout(resource, options = {}, timeout = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(resource, {
        ...options,
        signal: controller.signal
    });

    clearTimeout(id);
    return response;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==================== EVENT LISTENERS ====================

// Dispositivos - Bloquear/Desbloquear
DOM.devicesTable?.addEventListener('click', (e) => {
    if (AppState.isLoading) return;

    const btn = e.target.closest('.btn-action');
    if (!btn) return;

    const ip = btn.dataset.ip;
    const action = btn.dataset.action;
    handleDeviceAction(ip, action);
});

// Sitios - Agregar
DOM.addRuleBtn?.addEventListener('click', () => {
    if (AppState.isLoading) return;

    const url = DOM.siteToBlockInput.value.trim();
    addBlockedSite(url);
});

// Sitios - Desbloquear
DOM.blockedSitesList?.addEventListener('click', (e) => {
    if (AppState.isLoading) return;

    const btn = e.target.closest('.btn-unblock');
    if (!btn) return;

    const url = btn.dataset.url;
    unblockSite(url);
});

// Horarios - Guardar
DOM.scheduleForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (AppState.isLoading) return;

    const startTime = DOM.startTime.value;
    const endTime = DOM.endTime.value;
    const action = DOM.scheduleAction.value;

    saveSchedule(startTime, endTime, action);
});

// Logout
DOM.logoutBtn?.addEventListener('click', () => {
    Auth.logout();
});

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    if (!Auth.isAuthenticated()) {
        window.location.href = '/login.html';
        return;
    }

    // Mostrar información del usuario
    const user = Auth.getCurrentUser();
    if (user && DOM.userProfile) {
        DOM.userProfile.textContent = user.name;
    }

    // Configurar hora actual por defecto
    const now = new Date();
    if (DOM.startTime) DOM.startTime.value = now.toTimeString().substring(0, 5);
    if (DOM.endTime) {
        const endTime = new Date(now.getTime() + 60 * 60 * 1000);
        DOM.endTime.value = endTime.toTimeString().substring(0, 5);
    }

    // Inicializar la aplicación
    setupPWA();
    loadDevices();
    loadBlockedSites();
});