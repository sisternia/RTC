Cấu trúc
/webrtc
|-- /models
|   |-- User.js
|   |-- Verify.js
|   |-- Room.js
|   |-- Friend.js
|   |-- PrivateMess.js
|-- /node_modules
|-- /public
|   |-- /css
|   |-- |-- style.css
|   |-- /js
|   |-- |-- audio-recording.js
|   |-- |-- chat.js
|   |-- |-- main.js
|   |-- |-- friend.js
|   |-- |-- room.js
|   |-- |-- socket-connection.js
|   |-- |-- video-setup.js
|   |-- |-- chat-user.js
|   |-- login.html
|   |-- chat_user.html
|   |-- infor_user.html
|   |-- search_user.html
|   |-- friend_user.html
|   |-- register.html
|   |-- index.html
|   |-- reset_pass.html
|   |-- room.html
|   |-- verify.html
|-- /ssl
|-- /routes
|   |-- auth_friend.js
|   |-- auth_account.js
|   |-- auth_privatemess.js
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

Cài đặt OpenSSL
openssl genrsa -out key.pem 2048
openssl req -new -key key.pem -out csr.pem
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem

node server.js