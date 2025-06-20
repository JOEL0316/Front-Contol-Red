const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

const app = express();

// Configuración mejorada de MongoDB con más detalles de error
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/network-control', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
})
    .then(() => console.log('✅ MongoDB conectado exitosamente'))
    .catch(err => {
        console.error('❌ Error de conexión a MongoDB:', err.message);
        console.error('ℹ️ URI usada:', process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/network-control');
        process.exit(1);
    });

// Modelo de Usuario con validación mejorada
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'El nombre es requerido'],
        minlength: [3, 'El nombre debe tener al menos 3 caracteres']
    },
    email: {
        type: String,
        required: [true, 'El email es requerido'],
        unique: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Por favor ingrese un email válido']
    },
    password: {
        type: String,
        required: [true, 'La contraseña es requerida'],
        minlength: [6, 'La contraseña debe tener al menos 6 caracteres']
    }
});

// Hash de contraseña antes de guardar
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

const User = mongoose.model('User', userSchema);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Ruta de registro con máxima depuración
app.post('/api/auth/register', async (req, res) => {
    console.log('📥 Solicitud de registro recibida:', req.body);

    try {
        const { name, email, password } = req.body;

        // Validación manual adicional
        if (!name || !email || !password) {
            console.log('⚠️ Validación fallida: Campos faltantes');
            return res.status(400).json({
                success: false,
                message: 'Nombre, email y contraseña son requeridos'
            });
        }

        console.log('🔍 Buscando usuario existente...');
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            console.log('⚠️ Usuario ya existe:', email);
            return res.status(409).json({
                success: false,
                message: 'El email ya está registrado'
            });
        }

        console.log('🛠 Creando nuevo usuario...');
        const newUser = new User({ name, email, password });

        console.log('💾 Guardando usuario en la base de datos...');
        const savedUser = await newUser.save();
        console.log('✅ Usuario guardado:', savedUser);

        // Generar token JWT
        const token = jwt.sign(
            { userId: savedUser._id },
            process.env.JWT_SECRET || 'secret_dev',
            { expiresIn: '1h' }
        );

        console.log('🔑 Token generado para usuario:', savedUser.email);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email
            }
        });

    } catch (error) {
        console.error('🔥 Error durante el registro:', error);

        let errorMessage = 'Error en el servidor. Por favor intente nuevamente.';
        let statusCode = 500;

        if (error.name === 'ValidationError') {
            errorMessage = Object.values(error.errors).map(val => val.message).join(', ');
            statusCode = 400;
        } else if (error.code === 11000) {
            errorMessage = 'El email ya está registrado';
            statusCode = 409;
        } else if (error.message.includes('buffering timed out')) {
            errorMessage = 'Error de conexión con la base de datos';
            statusCode = 503;
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage
        });
    }
});

// ... (resto de las rutas y configuración del servidor)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log('🔑 Ruta de registro: POST http://localhost:3000/api/auth/register');
});