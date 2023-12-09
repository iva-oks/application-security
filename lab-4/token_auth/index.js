const uuid = require("uuid");
const express = require("express");
const onFinished = require("on-finished");
const bodyParser = require("body-parser");
const path = require("path");
const port = 3000;
const fs = require("fs");
var request = require("request");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = "Authorization";
const clientId = "JIvCO5c2IBHlAe2patn6l6q5H35qxti0";
const clientSecret =
  "ZRF8Op0tWM36p1_hxXTU-B0K_Gq_-eAVtlrQpY24CasYiDmcXBhNS6IJMNcz1EgB";
const audience = "https://kpi.eu.auth0.com/api/v2/";

class Session {
  #sessions = {};

  constructor() {
    try {
      this.#sessions = fs.readFileSync("./sessions.json", "utf8");
      this.#sessions = JSON.parse(this.#sessions.trim());

      console.log(this.#sessions);
    } catch (e) {
      this.#sessions = {};
    }
  }

  #storeSessions() {
    fs.writeFileSync(
      "./sessions.json",
      JSON.stringify(this.#sessions),
      "utf-8"
    );
  }

  set(key, value) {
    if (!value) {
      value = {};
    }
    this.#sessions[key] = value;
    this.#storeSessions();
  }

  get(key) {
    return this.#sessions[key];
  }

  init(id) {
    const sessionId = id ? id : uuid.v4();
    this.set(sessionId);

    return sessionId;
  }

  destroy(req, res) {
    const sessionId = req.sessionId;
    delete this.#sessions[sessionId];
    this.#storeSessions();
  }
}

const sessions = new Session();

app.use((req, res, next) => {
  let currentSession = {};
  let sessionId = req.get(SESSION_KEY);

  if (sessionId) {
    currentSession = sessions.get(sessionId);
    if (!currentSession) {
      currentSession = {};
      sessionId = sessions.init(res);
    }
  } else {
    sessionId = sessions.init(res);
  }

  req.session = currentSession;
  req.sessionId = sessionId;

  onFinished(req, () => {
    const currentSession = req.session;
    const sessionId = req.sessionId;
    sessions.set(sessionId, currentSession);
  });

  next();
});

app.get("/", (req, res) => {
  if (req.session.login) {
    return res.json({
      username: req.session.login,
      logout: "http://localhost:3000/logout",
    });
  }
  res.sendFile(path.join(__dirname + "/index.html"));
});

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
    username: "Username1",
  },
];

app.post("/api/login", (req, res) => {
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
    console.log(body);
    token = body.access_token;
    //console.log(token);
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
      req.session.login = user.login;

      res.json({ token: token });
    }

    res.status(401).send();
  });
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
