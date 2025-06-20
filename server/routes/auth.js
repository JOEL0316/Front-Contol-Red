const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Registro de usuario
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validación básica
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Todos los campos son requeridos' 
            });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'El correo ya está registrado' 
            });
        }

        // Hash de la contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear nuevo usuario
        const newUser = new User({
            name,
            email,
            password: hashedPassword
        });

        await newUser.save();

        // Crear token JWT
        const token = jwt.sign(
            { id: newUser._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error en el servidor. Por favor intente nuevamente.' 
        });
    }
});

module.exports = router;