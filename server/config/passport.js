const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Estrategia Local para login
passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: 'Usuario no encontrado' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return done(null, false, { message: 'Contraseña incorrecta' });

        return done(null, user);
    } catch (error) {
        return done(error);
    }
}));

// Estrategia JWT
const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'secret_dev'
};

passport.use(new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
        const user = await User.findById(payload.userId);
        if (user) return done(null, user);
        return done(null, false);
    } catch (error) {
        return done(error, false);
    }
}));

module.exports = passport;