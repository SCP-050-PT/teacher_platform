const requireRole = (...allowedRoles) => {
    // Нормализация в массив
    const roles = Array.isArray(allowedRoles[0]) 
        ? allowedRoles[0] 
        : allowedRoles;

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Требуется авторизация' });
        }

        if (!roles.includes(req.user.role)) {
            console.warn(`🚫 Доступ запрещён: пользователь ${req.user.id} с ролью ${req.user.role} пытался доступ к ${req.path}`);
            return res.status(403).json({ error: 'Недостаточно прав' });
        }

        next();
    };
};

module.exports = { requireRole };