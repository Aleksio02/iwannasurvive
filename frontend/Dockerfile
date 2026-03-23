FROM node:24.12.0-alpine AS builder

WORKDIR /client

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM nginx:alpine
COPY --from=builder /client/dist /usr/share/nginx/html

# Копируем конфигурацию Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Порты
EXPOSE 80

# Команда запуска Nginx
CMD ["nginx", "-g", "daemon off;"]