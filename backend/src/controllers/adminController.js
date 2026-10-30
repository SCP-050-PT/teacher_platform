const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const config = require('../config');

// Генерация начального админа только если нет пользователей
const createInitialAdmin = async () => {
    try {
        const { rows } = await db.query('SELECT COUNT(*) FROM users');
        if (parseInt(rows[0].count) === 0) {
            const hashedPassword = await bcrypt.hash(
                process.env.INITIAL_ADMIN_PASSWORD || require('crypto').randomBytes(16).toString('hex'),
                10
            );
            
            await db.query(
                `INSERT INTO users (username, password_hash, role, full_name) 
                 VALUES ($1, $2, $3, $4)`,
                ['admin', hashedPassword, 'admin', 'Администратор']
            );
            
            console.log('✅ Создан начальный администратор');
            if (!process.env.INITIAL_ADMIN_PASSWORD) {
                console.log('⚠️  Пароль сгенерирован случайно, измените его при первом входе');
            }
        }
    } catch (err) {
        console.error('❌ Ошибка создания начального админа:', err);
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Требуются username и password' });
        }

        const { rows } = await db.query(
            'SELECT id, username, password_hash, role, full_name FROM users WHERE username = $1',
            [username]
        );

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Неверные учётные данные' });
        }

        const user = rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Неверные учётные данные' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRES_IN }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.full_name
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// ==================== НОВЫЕ МЕТОДЫ (добавлены) ====================

// GET /api/me - получить текущего пользователя
const getMe = async (req, res) => {
    try {
        const { rows } = await db.query(
            'SELECT id, username, role, full_name FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json(rows[0]);
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// PUT /api/change-password - сменить пароль текущего пользователя
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword || newPassword.length < 6) {
            return res.status(400).json({ 
                error: 'Требуются текущий и новый пароль (минимум 6 символов)' 
            });
        }

        // Получаем текущий хеш пароля
        const { rows } = await db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        // Проверяем текущий пароль
        const validPassword = await bcrypt.compare(currentPassword, rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный текущий пароль' });
        }

        // Хешируем и сохраняем новый пароль
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [hashedPassword, req.user.id]
        );
        
        res.json({ message: 'Пароль успешно изменён' });
    } catch (error) {
        console.error('Ошибка смены пароля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// PUT /api/change-username - сменить логин текущего пользователя
const changeUsername = async (req, res) => {
    try {
        const { newUsername } = req.body;
        
        if (!newUsername || newUsername.length < 3) {
            return res.status(400).json({ error: 'Логин должен быть минимум 3 символа' });
        }

        // Проверка уникальности нового логина
        const { rows: existing } = await db.query(
            'SELECT id FROM users WHERE username = $1 AND id != $2',
            [newUsername, req.user.id]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Этот логин уже занят другим пользователем' });
        }

        // Обновляем логин
        await db.query(
            'UPDATE users SET username = $1 WHERE id = $2',
            [newUsername, req.user.id]
        );
        
        // Генерируем новый токен с обновлённым username
        const token = jwt.sign(
            { id: req.user.id, username: newUsername, role: req.user.role },
            config.JWT_SECRET,
            { expiresIn: config.JWT_EXPIRES_IN }
        );
        
        res.json({ 
            message: 'Логин успешно изменён', 
            newUsername,
            token  // Новый токен с обновлённым username
        });
    } catch (error) {
        console.error('Ошибка смены логина:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// ==================== СУЩЕСТВУЮЩИЕ МЕТОДЫ ====================

const getUsers = async (req, res) => {
    try {
        const { rows } = await db.query(
            `SELECT id, username, role, full_name, created_at 
             FROM users 
             ORDER BY created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const createUser = async (req, res) => {
    try {
        const { username, password, fullName, role = 'methodist' } = req.body;
        
        if (!username || !password || !fullName) {
            return res.status(400).json({ error: 'Требуются username, password и fullName' });
        }

        // Проверка существования
        const { rows: existing } = await db.query(
            'SELECT id FROM users WHERE username = $1',
            [username]
        );
        
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Пользователь с таким логином уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const { rows } = await db.query(
            `INSERT INTO users (username, password_hash, role, full_name) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id, username, role, full_name, created_at`,
            [username, hashedPassword, role, fullName]
        );
        
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Нельзя удалить самого себя
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ error: 'Нельзя удалить самого себя' });
        }

        const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json({ message: 'Пользователь удалён' });
    } catch (error) {
        console.error('Ошибка удаления пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { id } = req.params;
        const newPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const result = await db.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [hashedPassword, id]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // В реальном проекте — отправка по email
        res.json({ message: 'Пароль сброшен', temporaryPassword: newPassword });
    } catch (error) {
        console.error('Ошибка сброса пароля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = {
    createInitialAdmin,
    login,
    getMe,           
    changePassword,  
    changeUsername,  
    getUsers,      
    createUser,    
    deleteUser,
    resetPassword
};