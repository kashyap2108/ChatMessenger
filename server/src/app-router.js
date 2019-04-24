const moment = require("moment");

const START_TIME = new Date();

class AppRouter {
  constructor(app) {
    this.app = app;
    this.setupRouter = this.setupRouter.bind(this);
    this.setupRouter();
  }

  setupRouter() {
    const app = this.app;
    //  url:"/"
    // method: GET
    app.get("/", (req, res) => {
      return res.json({
        started: moment(START_TIME).fromNow()
      });
    });

    //  url:"/"
    // method: GET

    app.post("/api/users", (req, res) => {
      const body = req.body;

      app.models.user
        .create(body)
        .then(user => {
          return res.status(200).json(user);
        })
        .catch(err => {
          return res.status(400).json({ error: err });
        });
    });

    app.get("/api/users/:id", (req, res) => {
      const userId = req.params.id;
      app.models.user
        .load(userId)
        .then(user => {
          return res.status(200).json(user);
        })
        .catch(err => {
          return res.status(400).json({
            error: err
          });
        });
    });
  }
}

module.exports = AppRouter;
