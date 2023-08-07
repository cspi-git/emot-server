# Emot Server
Emot server.

## Installation
Github:
```
git clone https://github.com/cspi-git/emot-server
```

NpmJS:
```
npm i dotenv simple-aes-256 mongodb request-async bottleneck express moment groom lodash hqc
```

## Setup
1. Make an environment file and add a variable called MONGODB_URL, there you must put your MongoDB url database.
2. In your MongoDB make a database called **core** and a collection called **emot.emails**.
3. Change the master key and admin key in **index.js**, make sure the admin key matches the **key.txt** in the client.

## Usage
```
node index.js
```

## License
MIT © CSPI