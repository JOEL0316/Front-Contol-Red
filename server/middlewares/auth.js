const passport = require('passport');
const jwt = require('jsonwebtoken');

function authenticateJWT(req, res, next) {
    const token = req.header('Authorization')?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Acceso no autorizado' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tu_secreto_jwt');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: 'Token inválido o expirado' });
    }
}

module.exports = {
    authenticateJWT,
    passportAuthenticate: passport.authenticate('jwt', { session: false })
};