FROM nginx

RUN apt update -y && apt upgrade -y && apt install openssl -y

RUN mkdir -p /etc/nginx/ssl && openssl req -x509 -nodes -out /etc/nginx/ssl/ft_tr.crt -keyout /etc/nginx/ssl/ft_tr.key -subj "/C=FR/CN=localhost"

COPY RVP.conf /etc/nginx/conf.d/RVP.conf

CMD [ "nginx", "-g", "daemon off;" ]