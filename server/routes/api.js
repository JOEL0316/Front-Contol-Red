const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateJWT } = require('../middlewares/auth');

// URLs de tus APIs en Render (configurar en .env)
const API_URLS = {
    devices: process.env.DEVICES_API_URL,
    blocking: process.env.BLOCKING_API_URL,
    schedules: process.env.SCHEDULES_API_URL
};

// Middleware para agregar headers a las peticiones
const apiRequest = async (url, options = {}, req) => {
    try {
        const response = await axios({
            url,
            method: options.method || 'GET',
            data: options.body,
            headers: {
                'Authorization': req.headers.authorization,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error en API externa:', error.response?.data || error.message);
        throw error;
    }
};

// Proxy para dispositivos
router.get('/devices', authenticateJWT, async (req, res) => {
    try {
        const data = await apiRequest(`${API_URLS.devices}/devices`, {}, req);
        res.json(data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            message: error.response?.data?.message || 'Error al obtener dispositivos'
        });
    }
});

// Proxy para bloquear dispositivo
router.post('/block-device', authenticateJWT, async (req, res) => {
    try {
        const data = await apiRequest(`${API_URLS.devices}/block-device`, {
            method: 'POST',
            body: req.body
        }, req);
        res.json(data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            message: error.response?.data?.message || 'Error al bloquear dispositivo'
        });
    }
});

// Proxy para sitios bloqueados
router.get('/blocked-sites', authenticateJWT, async (req, res) => {
    try {
        const data = await apiRequest(`${API_URLS.blocking}/blocked-sites`, {}, req);
        res.json(data);
    } catch (error) {
        res.status(error.response?.status || 500).json({
            message: error.response?.data?.message || 'Error al obtener sitios bloqueados'
        });
    }
});

// ... (similar para otras rutas)

module.exports = router;