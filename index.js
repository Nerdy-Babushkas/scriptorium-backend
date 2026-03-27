// index.js
const app = require("./app");

const HTTP_PORT = process.env.PORT || 8080;

app.listen(HTTP_PORT, () => {
  console.log("API listening on port " + HTTP_PORT);
});
