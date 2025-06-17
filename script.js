// Configuración del entorno
const isLocalhost = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
const isSecure = window.location.protocol === 'https:';
const isFileProtocol = window.location.protocol === 'file:';

// Configuración de las APIs
const API_CONFIG = {
    devices: {
        dev: 'http://localhost:3001/api',
        prod: 'https://api-dispositivos.example.com/api'
    },
    blocking: {
        dev: 'http://localhost:3002/api',
        prod: 'https://api-bloqueos.example.com/api'
    },
    sites: {
        dev: 'http://localhost:3003/api',
        prod: 'https://api-sitios.example.com/api'
    },
    schedules: {
        dev: 'http://localhost:3004/api',
        prod: 'https://api-horarios.example.com/api'
    }
};

// Configuración de los endpoints para cada API
const ENDPOINTS = {
    devices: {
        base: isLocalhost ? API_CONFIG.devices.dev : API_CONFIG.devices.prod,
        list: '/devices',
        block: '/block-device'
    },
    blocking: {
        base: isLocalhost ? API_CONFIG.blocking.dev : API_CONFIG.blocking.prod,
        sites: '/blocked-sites'
    },
    schedules: {
        base: isLocalhost ? API_CONFIG.schedules.dev : API_CONFIG.schedules.prod,
        list: '/schedules'
    }
};

// URLs completas para cada endpoint
const API_URLS = {
    devices: ENDPOINTS.devices.base + ENDPOINTS.devices.list,
    blockDevice: ENDPOINTS.devices.base + ENDPOINTS.devices.block,
    blockedSites: ENDPOINTS.blocking.base + ENDPOINTS.blocking.sites,
    schedules: ENDPOINTS.schedules.base + ENDPOINTS.schedules.list
};

const DEV_MODE = isLocalhost; // Usar datos mock en desarrollo local

// Datos mock para desarrollo
const MOCK_DATA = {
    devices: [
        { name: "PC-Juan", ip: "192.168.1.10", status: "connected" },
        { name: "Phone-Maria", ip: "192.168.1.11", status: "connected" },
        { name: "Tablet-Luis", ip: "192.168.1.12", status: "blocked" }
    ],
    blockedSites: [
        { url: "facebook.com" },
        { url: "twitter.com" }
    ],
    schedules: []
};

// Estado de la aplicación
const AppState = {
    deferredPrompt: null,
    isPWAInstalled: false,
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
    scheduleLoader: document.getElementById("scheduleLoader")
};

// ==================== FUNCIONES PRINCIPALES ====================

/**
 * Carga la lista de dispositivos desde la API o datos mock
 */
async function loadDevices() {
    try {
        showLoader('devices');

        let devices;

        if (DEV_MODE) {
            await simulateNetworkDelay();
            devices = MOCK_DATA.devices;
            console.info("Modo desarrollo: Usando datos mock para dispositivos");
        } else {
            const response = await fetchWithTimeout(API_URLS.devices);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            devices = await response.json();
        }

        renderDevices(devices);
    } catch (error) {
        console.error("Error al cargar dispositivos:", error);
        showAlert("Error al cargar dispositivos. Mostrando datos de ejemplo.", "warning");
        renderDevices(MOCK_DATA.devices);
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

        if (DEV_MODE) {
            await simulateNetworkDelay();
            const device = MOCK_DATA.devices.find(d => d.ip === ip);
            if (device) {
                device.status = action === 'block' ? 'blocked' : 'connected';
                console.info(`Modo desarrollo: Dispositivo ${ip} ${action === 'block' ? 'bloqueado' : 'desbloqueado'}`);
            }
        } else {
            const response = await fetchWithTimeout(API_URLS.blockDevice, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ip, action })
            });

            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
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

        let sites;

        if (DEV_MODE) {
            await simulateNetworkDelay();
            sites = MOCK_DATA.blockedSites;
            console.info("Modo desarrollo: Usando datos mock para sitios bloqueados");
        } else {
            const response = await fetchWithTimeout(API_URLS.blockedSites);
            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
            sites = await response.json();
        }

        renderBlockedSites(sites);
    } catch (error) {
        console.error("Error al cargar sitios bloqueados:", error);
        showAlert("Error al cargar sitios bloqueados. Mostrando datos de ejemplo.", "warning");
        renderBlockedSites(MOCK_DATA.blockedSites);
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

        if (DEV_MODE) {
            await simulateNetworkDelay();
            if (!MOCK_DATA.blockedSites.some(s => s.url === url)) {
                MOCK_DATA.blockedSites.push({ url });
            }
            console.info(`Modo desarrollo: Sitio ${url} agregado a bloqueados`);
        } else {
            const response = await fetchWithTimeout(API_URLS.blockedSites, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });

            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
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

        if (DEV_MODE) {
            await simulateNetworkDelay();
            MOCK_DATA.blockedSites = MOCK_DATA.blockedSites.filter(s => s.url !== url);
            console.info(`Modo desarrollo: Sitio ${url} desbloqueado`);
        } else {
            const response = await fetchWithTimeout(
                `${API_URLS.blockedSites}?url=${encodeURIComponent(url)}`,
                { method: "DELETE" }
            );

            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
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

        if (DEV_MODE) {
            await simulateNetworkDelay();
            MOCK_DATA.schedules.push({ startTime, endTime, action });
            console.info(`Modo desarrollo: Horario guardado (${startTime} - ${endTime}, ${action})`);
        } else {
            const response = await fetchWithTimeout(API_URLS.schedules, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ startTime, endTime, action })
            });

            if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
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

// ==================== PWA ====================

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
 * Simula un retardo de red para desarrollo
 */
async function simulateNetworkDelay(min = 300, max = 800) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
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

// ==================== INICIALIZACIÓN ====================

document.addEventListener('DOMContentLoaded', () => {
    // Mostrar advertencia si estamos en file://
    if (isFileProtocol) {
        const alertMsg = "Para todas las funciones PWA, ejecuta este proyecto desde un servidor web local (http://localhost).";
        console.warn(alertMsg);
        showAlert(alertMsg, "warning", 10000);
    }

    // Configurar hora actual por defecto
    const now = new Date();
    if (DOM.startTime) DOM.startTime.value = now.toTimeString().substring(0, 5);
    if (DOM.endTime) {
        const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora después
        DOM.endTime.value = endTime.toTimeString().substring(0, 5);
    }

    // Inicializar la aplicación
    setupPWA();
    loadDevices();
    loadBlockedSites();
});