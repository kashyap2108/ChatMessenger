const mongoose = require("mongoose");
const URL = "mongodb://localhost/chatapp";

class Database {
  constructor() {}
  connect() {
    return new Promise((resolve, reject) => {
      mongoose.connect(URL, (err, db) => {
        return err ? reject(err) : resolve(db);
      });
    });
  }
}

module.exports = Database;
