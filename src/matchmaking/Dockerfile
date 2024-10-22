FROM python:latest

RUN apt update -y

WORKDIR /code

COPY requirements.txt ./

RUN pip install -r requirements.txt

EXPOSE 8006

CMD ["sh", "./start.sh"]