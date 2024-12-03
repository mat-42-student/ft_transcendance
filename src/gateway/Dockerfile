FROM python:latest

RUN apt update -y

WORKDIR /code

COPY requirements.txt .
COPY wait-for-it.sh .

RUN pip install --no-cache-dir -r requirements.txt

CMD ["./start.sh"]