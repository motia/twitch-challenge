const dotenv = require('dotenv')
const result = dotenv.config()

if (result.error) {
    throw result.error
}

module.exports = {
    apps: [
        {
            name: "twitch-challenge",
            script: "./backend/build/serve.js",
            env: Object.assign({
                NODE_ENV: "development",
            }, result.parsed),
            env: Object.assign({
                NODE_ENV: "production",
            }, result.parsed),
            watch: [
                './backend/build',
                './backend/.env'
            ],
            log_date_format: 'YYYY-MM-DD',
            autorestart: true,
        }
    ],
    "deploy": {
        "production": {
            "user": "motia",
            "host": ["49.12.14.37"],
            "ref": "origin/master",
            "repo": "git@github.com:motia/twitch-api.git",
            "path": "/var/www/twitch-challenge",
            "post-deploy": "cd backend; yarn install; yarn build; cd ../app; yarn install; yarn build;"
        },
    }
}