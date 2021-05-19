FROM nginx:1.19.10-alpine
RUN usermod -u 1000 nginx && groupmod -g 1000 nginx
