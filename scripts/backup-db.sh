#!/bin/bash

# Конфигурация
BACKUP_DIR="/backups"
DB_NAME="teacher_profile"
RETENTION_DAYS=7
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"

# Создаём бэкап
docker exec teacher_postgres pg_dump -U teacher_user $DB_NAME > $BACKUP_FILE

# Сжимаем
gzip $BACKUP_FILE

# Удаляем старые бэкапы (старше 7 дней)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $BACKUP_FILE.gz"