const express = require('express');
const app = express();
const mongoose = require('mongoose');
const Image = require('./models/image');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Audio = require('./models/audio');
const methodOverride = require('method-override');
const DanceVideo = require('./models/DanceVideo');
require('dotenv').config();

// Middleware Setup
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Set view engine
app.set('view engine', 'ejs');

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads'),
    filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});

const imageFilter = (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];
    allowedImageTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only image files are allowed!"), false);
};

const audioFilter = (req, file, cb) => {
    const allowedAudioTypes = ["audio/mpeg", "audio/mp3"];
    allowedAudioTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only audio files are allowed!"), false);
};

const videoFilter = (req, file, cb) => {
    const allowedVideoTypes = ["video/mp4", "video/avi", "video/mpeg"];
    allowedVideoTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only video files are allowed!"), false);
};

const uploadImage = multer({ storage, fileFilter: imageFilter });
const uploadAudio = multer({ storage, fileFilter: audioFilter });
const uploadVideo = multer({ storage, fileFilter: videoFilter, limits: { fileSize: 100 * 1024 * 1024 } });

// Connect to MongoDB
mongoose.connect(process.env.URI)
    .then(() => app.listen(process.env.PORT || 3000, () => console.log('Server started')))
    .catch(err => console.log(err));

// Routes

// Home Page
app.get('/', (req, res) => {
    res.render('home', { title: 'Home' });
});

// Signup and Signin Pages
app.get('/signup', (req, res) => {
    res.render('signup', { title: 'SignIn/SignUp' });
});
app.get('/signin', (req, res) => {
    res.render('signin', { title: 'SignIn/SignUp' });
});
app.get('/dance', (req, res) => {
    res.redirect('/dance-videos');
});

// Upload Pages
app.get('/upload', (req, res) => res.render('upload', { title: 'Upload' }));
app.get('/upload-paint', (req, res) => res.render('upload-paint', { title: 'Upload Paintings' }));
app.get('/upload-music', (req, res) => res.render('upload-music', { title: 'Upload Music' }));
app.get('/upload-dance', (req, res) => res.render('upload-dance', { title: 'Upload Dance Video' }));

// Paintings
app.get('/paintings', async (req, res) => {
    try {
        const images = await Image.find();
        res.render('paintings', { title: 'Paintings', items: images });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/paintings', uploadImage.single('image'), async (req, res) => {
    try {
        const obj = {
            name: req.body.name,
            desc: req.body.desc,
            img: {
                data: fs.readFileSync(path.join(__dirname, 'uploads', req.file.filename)),
                contentType: req.file.mimetype
            }
        };
        const image = new Image(obj);
        await image.save();
        res.redirect('/paintings');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading painting');
    }
});

app.get('/paintings/:id', async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        res.render('details', { image, title: 'Image Details' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.delete('/paintings/:id', async (req, res) => {
    try {
        console.log('Deleting painting:', req.params.id);
        const result = await Image.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).send('Painting not found');
        }
        res.redirect('/paintings');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Music
app.get('/music', async (req, res) => {
    try {
        const audioFiles = await Audio.find();
        res.render('music', { audioFiles, title: 'Music Library' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/music', uploadAudio.single('file'), async (req, res) => {
    try {
        const obj = {
            title: req.body.title,
            description: req.body.description,
            file: {
                data: fs.readFileSync(path.join(__dirname, 'uploads', req.file.filename)),
                contentType: req.file.mimetype,
            },
            artist: req.body.artist || 'Unknown',
            genre: req.body.genre || 'Unknown',
            tags: req.body.tags ? req.body.tags.split(',') : [],
        };
        const audio = new Audio(obj);
        await audio.save();
        fs.unlinkSync(path.join(__dirname, 'uploads', req.file.filename));
        res.redirect('/music');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading music');
    }
});

app.get('/music/:id', async (req, res) => {
    try {
        const audio = await Audio.findById(req.params.id); // Fetch audio by ID
        res.render('musicDetails', { audio, title: 'Music Details' }); // Render the details page
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.delete('/music/:id', async (req, res) => {
    try {
        await Audio.findByIdAndDelete(req.params.id); // Delete audio by ID
        res.redirect('/music'); // Redirect to the music library
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Dance Videos



app.post('/dance-videos', uploadVideo.single('file'), async (req, res) => {
    try {
        const obj = {
            title: req.body.title,
            description: req.body.description,
            choreographer: req.body.choreographer || 'Unknown',
            genre: req.body.genre || 'Unknown',
            tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
            fileUrl: `/uploads/${req.file.filename}`,
        };
        const video = new DanceVideo(obj);
        await video.save();
        res.redirect('/dance-videos');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading video');
    }
});

app.get('/dance-videos', async (req, res) => {
    try {
        const videos = await DanceVideo.find(); // Fetches all videos
        res.render('dance', { title: 'Dance Videos', videos }); // Passes videos array to the template
        console.log(videos);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/dance-videos/:id', async (req, res) => {
    try {
        const video = await DanceVideo.findById(req.params.id);
        res.render('details4', { video, title: 'Dance Video Details' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.delete('/dance-videos/:id', async (req, res) => {
    try {
        await DanceVideo.findByIdAndDelete(req.params.id);
        res.redirect('/dance-videos');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
