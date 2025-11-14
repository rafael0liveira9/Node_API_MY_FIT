const { json } = require('body-parser');

const { jwtUncrypt } = require('../../utils/midleware/auth'),
    { PrismaClient } = require("@prisma/client"),
    p = new PrismaClient(),
    { verify, sign } = require("jsonwebtoken"),
    s3 = require('../s3/index'),
    { compareSync, hashSync } = require('bcryptjs'),
    error = {
        status: 500,
        message: "Erro Interno"
    },
    moment = require('moment');

const GetShopWithTrainings = async (req, res, search) => {
    const whereClause = {
        situation: 1,
        ...(search && {
            training: {
                name: {
                    contains: search,
                    mode: 'insensitive'
                }
            }
        })
    };

    const shopsRaw = await p.shop.findMany({
        where: whereClause,
        take: 50,
        include: {
            training: {
                include: {
                    user: true,
                    trainingEvaluations: {
                        take: 50,
                        orderBy: { createdAt: 'desc' },
                    },
                    trainingExecution: {
                        take: 50,
                        orderBy: { startAt: 'desc' },
                    }
                }
            }
        }
    });

    const FOUR_HOURS_IN_MS = 4 * 60 * 60 * 1000;

    const calculateExecutionAvg = (executions) => {
        const validDurations = executions
            .filter(e => e.startAt && e.endAt)
            .map(e => {
                const start = new Date(e.startAt).getTime();
                const end = new Date(e.endAt).getTime();
                const duration = end - start;
                return duration < FOUR_HOURS_IN_MS ? duration / 1000 : null;
            })
            .filter(duration => duration !== null);

        return validDurations.length > 0
            ? validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length
            : null;
    };

    const calculateEvaluationAvg = (evaluations) => {
        if (!evaluations || evaluations.length === 0) return null;
        const sum = evaluations.reduce((acc, e) => acc + (e.evaluation || 0), 0);
        return sum / evaluations.length;
    };

    const result = shopsRaw.map(shop => {
        const training = shop.training;

        if (!training) return shop;

        const executionAvg = calculateExecutionAvg(training.trainingExecution || []);
        const evaluationAvg = calculateEvaluationAvg(training.trainingEvaluations || []);

        return {
            ...shop,
            training: {
                ...training,
                executionTime: executionAvg,
                evaluation: evaluationAvg,
            }
        };
    });

    const sortedShops = shopsRaw.sort((a, b) => {
        const aUser = a.training?.user;
        const bUser = b.training?.user;

        // 1. Prioridade: userType (menor = mais importante)
        if (aUser?.userType !== bUser?.userType) {
            return aUser?.userType - bUser?.userType;
        }

        // 2. Prioridade: entre os userType 4 e 5, quem tem CREF vem primeiro
        if ((aUser?.userType === 4 || aUser?.userType === 5) &&
            (bUser?.userType === 4 || bUser?.userType === 5)) {
            const aHasCref = aUser?.cref ? 1 : 0;
            const bHasCref = bUser?.cref ? 1 : 0;

            if (aHasCref !== bHasCref) {
                return bHasCref - aHasCref;
            }
        }

        // 3. Prioridade: média de avaliações (maior primeiro)
        const aAvg =
            (a.training?.trainingEvaluations?.reduce((acc, cur) => acc + cur.rating, 0) || 0) /
            (a.training?.trainingEvaluations?.length || 1);

        const bAvg =
            (b.training?.trainingEvaluations?.reduce((acc, cur) => acc + cur.rating, 0) || 0) /
            (b.training?.trainingEvaluations?.length || 1);

        return bAvg - aAvg;
    });

    if (sortedShops) {
        await p.$disconnect();
        return res.status(201).json(sortedShops);
    } else {
        await p.$disconnect();
        return res.status(401).json(null);
    }

}, GetShopTrainingById = async (req, res) => {
    const { id } = req.params;

    try {
        const shop = await p.shop.findUnique({
            where: { id: parseInt(id) },
            include: {
                training: {
                    include: {
                        user: true,
                        series: {
                            include: {
                                exercise: true
                            }
                        },
                        trainingEvaluations: {
                            take: 50,
                            orderBy: { createdAt: 'desc' },
                        },
                        trainingExecution: {
                            take: 50,
                            orderBy: { startAt: 'desc' },
                        }
                    }
                }
            }
        });

        if (!shop) {
            return res.status(404).json({ message: "Shop not found" });
        }

        const FOUR_HOURS_IN_MS = 4 * 60 * 60 * 1000;

        const calculateExecutionAvg = (executions) => {
            const validDurations = executions
                .filter(e => e.startAt && e.endAt)
                .map(e => {
                    const start = new Date(e.startAt).getTime();
                    const end = new Date(e.endAt).getTime();
                    const duration = end - start;
                    return duration < FOUR_HOURS_IN_MS ? duration / 1000 : null;
                })
                .filter(duration => duration !== null);

            return validDurations.length > 0
                ? validDurations.reduce((sum, d) => sum + d, 0) / validDurations.length
                : null;
        };

        const calculateEvaluationAvg = (evaluations) => {
            if (!evaluations || evaluations.length === 0) return null;
            const sum = evaluations.reduce((acc, e) => acc + (e.evaluation || 0), 0);
            return sum / evaluations.length;
        };

        const training = shop.training;

        if (training) {
            shop.training.executionTime = calculateExecutionAvg(training.trainingExecution || []);
            shop.training.evaluation = calculateEvaluationAvg(training.trainingEvaluations || []);
        }

        return res.status(200).json(shop);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Erro interno ao buscar loja" });
    } finally {
        await p.$disconnect();
    }
}


module.exports = { GetShopWithTrainings, GetShopTrainingById };