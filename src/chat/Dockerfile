FROM django-base

# RUN apt update -y

WORKDIR /code

# COPY requirements.txt .

# RUN pip install --no-cache-dir -r requirements.txt

ENTRYPOINT ["python", "manage.py", "runchatworker"]