const { Router, json, urlencoded } = require('express'),
    moment = require('moment'),
    multer = require('multer'),
    user = require('../repository/user'),
    s3 = require('../repository/s3'),
    router = Router();

const upload = multer();

router.use(json());
router.use(urlencoded({ extended: true }));
router.get('/', async (_, res) => res.json({ message: process.env.TEST }));

// *********************************************************************************************** s3 ROUTES
router.post('/upload-image', upload.single('file'), async (req, res) => s3.ImportImageToS3(req, res));

// *********************************************************************************************** USER ROUTES
router.get('/user/:id', async (req, res) => user.GetUserById(req, res)),
    router.get('/get-my-user', async (req, res) => user.GetMyUser(req, res)),
    router.post('/user/:type', async (req, res) => user.SignUp(req, res)),
    router.post('/sign-in', async (req, res) => user.SignIn(req, res)),
    router.put('/user', async (req, res) => user.EditUser(req, res)),
    router.put('/photo-user', upload.single('file'), async (req, res) => user.PhotoUpdate(req, res)),
    router.put('/background-user', upload.single('file'), async (req, res) => user.backgroundImageUpdate(req, res)),
    router.put('/suspend-user', async (req, res) => user.SuspendUser(req, res)),
    router.put('/delete-user/:id', async (req, res) => user.DeleteUser(req, res));



module.exports = router