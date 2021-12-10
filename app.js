const express = require('express')
const helpers = require('./_helpers');
const routes = require('./routes')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 3000
const { Server } = require("socket.io");
const io = new Server();

io.on("connection", (socket) => {
  socket.emit("chat_Msg", { some: "data" });

  socket.emit("chat_Msg", (data) => {
    console.log(data); // data will be "woot"
  });
});

app.use(cors())
if (process.env.NODE_ENV !== "production") {
  require('dotenv').config()
}
const passport = require('./config/passport')


// use helpers.getUser(req) to replace req.user
function authenticated(req, res, next) {
  // passport.authenticate('jwt', { ses...
};

app.use(express.urlencoded({ extended: true }))
app.use(express.json())

app.use(passport.initialize())

app.listen(port, () => console.log(`Example app listening on port ${port}!`))
app.use(routes)


module.exports = app
