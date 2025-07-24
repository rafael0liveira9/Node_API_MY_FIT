const { json } = require('body-parser');
const exercises = require('../exercises');
const { jwtUncrypt } = require('../../utils/midleware/auth'),
    { PrismaClient } = require("@prisma/client"),
    p = new PrismaClient();

const GetFaq = async (req, res) => {

    const data = await p.faq.findMany({
        where: {
            situation: 1,
        }
    })

    if (data) {
        await p.$disconnect();
        return res.status(200).json(data);
    } else {
        await p.$disconnect();
        return res.status(401).json(null);
    }
}

module.exports = { GetFaq };