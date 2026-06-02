FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy static files
COPY pages/login.html /usr/share/nginx/html/index.html
COPY pages/login.css /usr/share/nginx/html/
COPY pages/login.js /usr/share/nginx/html/
COPY pages/home.html /usr/share/nginx/html/
COPY pages/home.css /usr/share/nginx/html/
COPY pages/home.js /usr/share/nginx/html/
COPY pages/layer_group_icon.png /usr/share/nginx/html/
COPY pages/auth.service.js /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]