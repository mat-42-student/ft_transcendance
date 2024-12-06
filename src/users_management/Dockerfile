# backend/Dockerfile
FROM python:3.12

# Définir le répertoire de travail
WORKDIR /app

# Copier le fichier des dépendances et installer les paquets
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste de l'application
COPY . .

# Exposer le port utilisé par Daphne
EXPOSE 8001

# Définir le répertoire de travail
WORKDIR /app/users

# Commandes à exécuter
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]