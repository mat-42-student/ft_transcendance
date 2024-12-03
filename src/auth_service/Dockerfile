FROM python:3.10-slim

WORKDIR /code

RUN pip install --upgrade pip

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["sh", "./start.sh"]
