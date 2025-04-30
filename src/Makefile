# Makefile for building Docker image and running Docker Compose

DOCKER_IMAGE_NAME = django-base
DOCKERFILE = ./_Base/Dockerfile.django

# Targets
.PHONY: all build run re clean fclean

re: clean all

all: build_base build run

run:
	docker compose up

build_base:
	docker build -t $(DOCKER_IMAGE_NAME) -f $(DOCKERFILE) .

build:
	docker compose build

jbuild:
	docker compose -f my_compose.yml up --build

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
