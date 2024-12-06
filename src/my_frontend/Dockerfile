# frontend/Dockerfile
FROM nginx:alpine

# Copier le fichier de configuration Nginx
COPY ./nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers du frontend
COPY ./static/ /usr/share/nginx/html

# Exposer le port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]