const jwt = require('jsonwebtoken');
const config = require('../config');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }

    try {
        const user = jwt.verify(token, config.JWT_SECRET);
        
        // Валидация структуры токена
        if (!user.id || !user.role) {
            return res.status(403).json({ error: 'Невалидный токен' });
        }
        
        req.user = user;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Токен истёк' });
        }
        return res.status(403).json({ error: 'Невалидный токен' });
    }
};

module.exports = { authenticateToken };