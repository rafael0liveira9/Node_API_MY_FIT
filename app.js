const { urlencoded, json } = require("body-parser"),
    express = require("express"),
    serverless = require("serverless-http"),
    { config } = require("dotenv"),
    cors = require("cors"),
    router = express();
config();

console.log(`🔄 Ligando servidor`)
console.log(`🔄 Ligando servidor`)

router.use(cors());
router.use(json({ limit: "500mb" }));
router.use(urlencoded({ extended: true }));
router.use('/', require("./routes"));
module.exports.handler = serverless(router);
router.listen(process.env.PORT || 3001, () => {
    console.log(`✅ Server rodando na porta ${process.env.PORT || 3001}`)
})