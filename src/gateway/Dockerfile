FROM python:latest

RUN apt update -y

WORKDIR /code

COPY requirements.txt ./

RUN pip install -r requirements.txt

CMD ["sh", "./start.sh"]