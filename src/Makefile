# Makefile for building Docker image and running Docker Compose

# Variables
DOCKER_IMAGE_NAME = django-base
DOCKERFILE = ./_Base/Dockerfile.django
# DOCKER_COMPOSE_FILE = docker-compose.yml

# Targets
.PHONY: all build run re clean

all: build run

build_base:
	# Utiliser une tabulation ici
	docker build -t $(DOCKER_IMAGE_NAME) -f $(DOCKERFILE) .

build:
	# Idem ici
	docker compose up --build

run:
	docker compose up

start:
	docker compose start
	docker compose logs -f

stop:
	docker compose stop

clean:
	docker compose down -v
	docker system prune -a -f

re: clean build_base build run