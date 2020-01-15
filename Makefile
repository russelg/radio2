init: setup pull build install

setup:
	docker volume create frontend_nodemodules
	python3 -m tools.generate_icecast_xml

pull: 
	docker-compose pull caddy icecast db

build:
	docker-compose build

install: frontend-install

frontend-install:
	docker-compose -f docker-compose.builder.yml run --rm frontend-install

dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

prod:
	docker-compose up -d

batch-add:
	docker-compose run server poetry run python -m tools.batch_add
