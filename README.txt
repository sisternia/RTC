Cấu trúc
/webrtc
|-- /models
|   |-- User.js
|   |-- Verify.js
|-- /node_modules
|-- /public
|   |-- /css
|   |-- |-- style.css
|   |-- /js
|   |-- |-- audio-recording.js
|   |-- |-- chat.js
|   |-- |-- main.js
|   |-- |-- room.js
|   |-- |-- socket-connection.js
|   |-- |-- video-setup.js
|   |-- login.html
|   |-- register.html
|   |-- index.html
|   |-- reset_pass.html
|   |-- room.html
|   |-- verify.html
|-- /routes
|   |-- auth.js
|-- main.js
|-- package.json
|-- server.js


npm init -y
npm install express socket.io simple-peer
npm install mongoose
npm install nodemailer
npm install socket.io-client --save
npm install nodemon --save-dev
npm install electron --save-dev
node server.js