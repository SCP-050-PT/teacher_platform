const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    const client = await pool.connect();
    
    try {
        console.log('🚀 Начало миграции...');
        
        // Проверяем существование таблиц
        const { rows: tables } = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        
        const existingTables = tables.map(t => t.table_name);
        console.log('📋 Существующие таблицы:', existingTables);
        
        // Читаем SQL файл
        const sqlPath = path.join(__dirname, 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        // Разбиваем на отдельные команды (по точке с запятой)
        const commands = sql
            .split(';')
            .map(cmd => cmd.trim())
            .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
        
        console.log(`🔧 Выполнение ${commands.length} команд...`);
        
        for (let i = 0; i < commands.length; i++) {
            const cmd = commands[i];
            try {
                await client.query(cmd);
                process.stdout.write(`\r✅ ${i + 1}/${commands.length} выполнено`);
            } catch (err) {
                // Игнорируем ошибки "already exists"
                if (!err.message.includes('already exists') && 
                    !err.message.includes('duplicate key')) {
                    console.error(`\n❌ Ошибка в команде: ${cmd.substring(0, 100)}...`);
                    console.error(err.message);
                }
            }
        }
        
        console.log('\n✅ Миграция завершена успешно!');
        
    } catch (error) {
        console.error('❌ Ошибка миграции:', error);
        process.exit(1);
    } finally {
        client.release();
    }
};

// Запуск если вызван напрямую
if (require.main === module) {
    runMigration().then(() => process.exit(0));
}

module.exports = { runMigration };