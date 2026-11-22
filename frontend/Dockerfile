FROM node:22-bookworm-slim AS assets
WORKDIR /app

COPY index.html auth.html script.js style.css api-config.js ./
ARG API_BASE_URL=/api/v1
ENV API_BASE_URL=${API_BASE_URL}
RUN node -e "require('node:fs').writeFileSync('api-config.js', 'window.EXPENSE_TRACKER_API_BASE = ' + JSON.stringify(process.env.API_BASE_URL) + ';\\n')"

FROM nginx:stable-alpine AS runtime
COPY frontend/nginx.conf /etc/nginx/nginx.conf
COPY --from=assets /app/index.html /app/auth.html /app/script.js /app/style.css /app/api-config.js /usr/share/nginx/html/
USER nginx
EXPOSE 8080
ENTRYPOINT []
CMD ["nginx", "-g", "daemon off;"]
