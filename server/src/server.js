const http = require("http");
const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const webSocket = require("ws");
const mongoose = require("mongoose");
const passport = require("passport");
const routes = require("./routes");
const PORT = 5000;
const app = express();

const Connection = require("./socket");
app.server = http.createServer(app);

const db = require("../../config/keys").mongoURI;

// connect to MONGODB
mongoose
  .connect(db)
  .then(() => console.log("Mongodb Connected !!"))
  .catch(err => console.log("hello"));

// Middlewares
// Passport middleware
// app.connection = new connection(app);
app.use(passport.initialize());
// Passport Config
require("../../config/passport")(passport);

app.use(morgan("dev"));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({}));

app.use("/", routes);

app.wss = new webSocket.Server({
  server: app.server
});

// let clients = [];

app.connection = new Connection(app);

app.server.listen(process.env.PORT || PORT, () => {
  console.log(`App is running on port ${app.server.address().port}`);
});
