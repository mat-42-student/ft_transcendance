re: clean all

all: build run

run:
	docker compose up

build:
	docker compose build

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

.PHONY: all build run re clean fclean
