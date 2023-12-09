const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
var request = require("request");
const dotenv = require("dotenv");
const http = require("http");
const logger = require("morgan");
const { auth } = require("express-openid-connect");

dotenv.load();

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

const config = {
  authRequired: false,
  auth0Logout: true,
};
const port = 3000;
config.baseURL = `http://localhost:${port}`;

app.use(auth(config));

// Middleware to make the `user` object available for all views
app.use(function (req, res, next) {
  res.locals.user = req.oidc.user;
  next();
});

app.get("/", function (req, res, next) {
  res.render("index", {
    title: "Lab-6",
    isAuthenticated: req.oidc.isAuthenticated(),
  });
});

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
  });
});

const clientId = "JIvCO5c2IBHlAe2patn6l6q5H35qxti0";
const clientSecret =
  "ZRF8Op0tWM36p1_hxXTU-B0K_Gq_-eAVtlrQpY24CasYiDmcXBhNS6IJMNcz1EgB";
const audience = "https://kpi.eu.auth0.com/api/v2/";

app.get("/logout", (req, res) => {
  sessions.destroy(req, res);
  res.redirect("/");
});

const users = [
  {
    login: "Login",
    password: "Password",
    username: "Username",
  },
  {
    login: "Login1",
    password: "Password1",
    username: "Username1",
  },
  {
    login: "ivanytska@gmail.com",
    password: "1234QWEee_",
    username: "ivanytska@gmail.com",
  },
];

app.post("/login", (req, res) => {
  const { login, password } = req.body;

  var options = {
    method: "POST",
    url: "https://kpi.eu.auth0.com/oauth/token",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    form: {
      grant_type: "http://auth0.com/oauth/grant-type/password-realm",
      username: login,
      password: password,
      audience: audience,
      client_id: clientId,
      client_secret: clientSecret,
      scope: "offline_access",
      realm: "Username-Password-Authentication",
    },
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    body = JSON.parse(body);
    token = body.access_token;
    console.log(token);
    if (body.error) {
      res.status(401).send();
      return false;
    }

    const user = users.find((user) => {
      if (user.login == login) {
        return true;
      }
      return false;
    });

    if (user) {
      sessions.init(token);
      req.session = sessions.get(token);
      req.session.username = user.username;
      req.session.login = user.login;

      res.json({ token: token });
    }

    res.status(401).send();
  });
});

http.createServer(app).listen(port, () => {
  console.log(`Listening on ${config.baseURL}`);
});
