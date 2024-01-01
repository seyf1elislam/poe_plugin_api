const express = require("express");
const app = express();
const jsonParser = express.json({ limit: "100mb" });

require("./client_use").registerEndpoints(app, jsonParser);

app.listen(3000, () => {
    console.log("---------------------------------------------");
    console.log("PoePluging hosted on http://127.0.0.1:3000/v1");
    console.log("---------------------------------------------");
});
