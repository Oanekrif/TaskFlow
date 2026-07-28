FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy static files
COPY pages/ /usr/share/nginx/pages/

COPY pages/login.html /usr/share/nginx/pages/index.html
# COPY pages/home.html /usr/share/nginx/pages/
COPY pages/dashboard.html /usr/share/nginx/pages/

COPY pages/styles/login.css /usr/share/nginx/pages/
# COPY pages/styles/home.css /usr/share/nginx/pages/
COPY pages/styles/dashboard.css /usr/share/nginx/pages/

COPY pages/scripts/auth.service.js /usr/share/nginx/pages/
COPY pages/scripts/login.js /usr/share/nginx/pages/
# COPY pages/scripts/home.js /usr/share/nginx/pages/
COPY pages/scripts/dashboard.js /usr/share/nginx/pages/

COPY pages/src/layer_group_icon.png /usr/share/nginx/pages/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]