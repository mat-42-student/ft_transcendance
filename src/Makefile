# Makefile for building Docker image and running Docker Compose

DOCKER_IMAGE_NAME = django-base
DOCKERFILE = ./_Base/Dockerfile.django

# Targets
.PHONY: all build run re clean

all: build_base build run

build_base:
	docker build -t $(DOCKER_IMAGE_NAME) -f $(DOCKERFILE) .

build:
	docker compose build

run:
	docker compose up

down:
	docker compose down

start:
	docker compose start
	docker compose logs -f

stop:
	docker compose stop

fclean: clean
	docker system prune -a -f

clean: stop
	docker compose down -v
	
re: clean build_base build run