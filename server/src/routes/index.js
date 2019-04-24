const express = require("express");
const router = express.Router();
const auth = require("./auth");

router.get("/").use("/", auth);
module.exports = router;
