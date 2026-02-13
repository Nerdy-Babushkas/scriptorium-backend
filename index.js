require("dotenv").config();
const app = require("./app");
const userService = require("./services/user-service");

const HTTP_PORT = process.env.PORT || 8080;

userService
  .connect()
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("API listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log("unable to start the server: " + err);
    process.exit();
  });
