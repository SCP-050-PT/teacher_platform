FROM node:18-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY src/ ./src/

# Создаём папку для загрузок
RUN mkdir -p uploads

# Открываем порт
EXPOSE 5000

# Запуск
CMD ["node", "src/server.js"]