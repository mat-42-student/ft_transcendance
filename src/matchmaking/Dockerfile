FROM python:latest

RUN apt update  

WORKDIR /code

COPY requirements.txt ./

RUN pip install -r requirements.txt

EXPOSE 8000

CMD ["sh", "./start.sh"]