#!/bin/bash

DOMAIN="your-domain.ru"
EMAIL="your-email@example.com"

# Останавливаем всё
docker-compose down

# Запускаем только nginx и certbot для получения сертификата
docker-compose up -d nginx

# Получаем сертификат
docker-compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Перезапускаем всё
docker-compose down
docker-compose up -d

echo "SSL certificates installed for $DOMAIN"