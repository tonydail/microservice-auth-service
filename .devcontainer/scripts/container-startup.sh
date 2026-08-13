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

	if [ ! -f "./git-scripts/git-workflows.sh" ]; then
		echo '==> Git workflows script not found!'
	else
		echo '==> Git workflows script found! Adding to ~/.bashrc...'
		echo "source ./git-scripts/git-workflows.sh" >> ~/.bashrc
	fi

	
	# echo '==> Starting application in development mode...'
	# npm run dev
	sleep infinity

}

startup-common

if [ "$1" == "standalone" ]; then
	startup-standalone
elif [ "$1" == "dev" ]; then
	startup-dev
fi
