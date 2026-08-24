#!/bin/bash
startup-common() {
	echo '==> Executing common container startup script...'

	echo '==> Current working directory:'
	pwd

	echo '==> Fixing file permissions...'
	sudo chown -R node:node ./node_modules ./dist || true

	echo '==> Bootstrapping dependencies and database...'
	npm install &&
		npx prisma generate &&
		npm run db:migrate &&
		npm run db:seed || true

	echo '==> Initializing transactional outbox connector...'
	/microservice-auth-service/register-outbox-connector.sh
}

startup-standalone() {
	echo '==> Executing standalone container startup script...'

	echo '==> Compiling application production build...'
	npm run build

	echo '==> Starting application runtime process...'
	npm start
}

startup-dev() {
	echo '==> Executing development container startup script...'

	if [ ! -f "./workflow-scripts/workflow-helper" ]; then
		echo '==> Workflow helper script not found!'
	else
		echo '==> Workflow helper script found! Adding to ~/.bashrc...'
		echo "source ./workflow-scripts/workflow-helper" >> ~/.bashrc
	fi
	
	sleep infinity

}

startup-common

if [ "$1" == "standalone" ]; then
	startup-standalone
elif [ "$1" == "dev" ]; then
	startup-dev
fi
