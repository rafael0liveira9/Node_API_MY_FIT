const { urlencoded, json } = require("body-parser");
const express = require("express");
const serverless = require("serverless-http");
const { config } = require("dotenv");
const cors = require("cors");

config();

const app = express();

console.log(`🔄 Ligando servidor`)

app.use(cors());
app.use(json({ limit: "500mb" }));
app.use(urlencoded({ extended: true }));
app.use('/', require("./routes"));

if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3001;
    app.listen(port, () => {
        console.log(`✅ Server rodando na porta ${port}`);
    });
}


module.exports = app;