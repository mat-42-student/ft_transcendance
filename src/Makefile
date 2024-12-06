# Docker compose filename
COMPOSE		=	my_compose.yml

COMPOSE_CMD = docker-compose -f ${COMPOSE}

build:
	${COMPOSE_CMD} up --build

up:
	${COMPOSE_CMD} up

down:
	${COMPOSE_CMD} down

stop:
	${COMPOSE_CMD} stop

start:
	${COMPOSE_CMD} start
	${COMPOSE_CMD} logs -f

# Clean volumes (db)
dbclean: down
	docker volume prune -f

# Remove all containers and images (implies re-build)
fclean: down
	docker system prune -af

.PHONY: all build up down stop start dbclean fclean