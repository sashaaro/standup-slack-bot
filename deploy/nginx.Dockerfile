FROM nginx:1.18
RUN usermod -u 1000 nginx && groupmod -g 1000 nginx
