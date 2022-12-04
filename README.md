# Emot Server
Emot Server source code.

## Installation
Github:
```
git clone https://github.com/hanaui-git/emot-server
```

NpmJS:
```
npm i dotenv simple-aes-256 mongodb request-async bottleneck express moment groom lodash hqc
```

## Setup
1. Host a database using [MongoDB](https://mongodb.com/]
2. Put the database URL with credential in .env **MONGODB_URL**
3. Make a database called **core** and in the database make a collection called **emot.emails**

## Usage
```
node index.js
```

## Note
Be sure to change the **masterKey** & **adminKey** in index.js and ONLY use environment variables for production.

## License
MIT © Hanaui