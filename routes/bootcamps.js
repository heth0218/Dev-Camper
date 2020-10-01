const express = require('express');

const { getBootcamps, getBootcamp, createBootcamps, updateBootcamps, deleteBootcamps, getBootcampsInRaduis, bootcampPhotoUpload } = require('../controllers/bootcamps');

const Bootcamp = require('../models/Bootcamp');

//Include other resource routers
const courseRouter= require('./courses');
const reviewRouter= require('./reviews');

const router = express.Router();

const advancedResults = require('../middleware/advancedResults');
const { protect, authorize } = require('../middleware/auth');

//Re-route into other resource routers
router.use('/:bootcampId/courses', courseRouter);
router.use('/:bootcampId/reviews', reviewRouter);

router.route('/radius/:zipcode/:distance').get(getBootcampsInRaduis);

router.route('/:id/photos').put(protect, authorize('publisher','admin'), bootcampPhotoUpload);

router
    .route('/')
    .get(advancedResults(Bootcamp, 'courses'), getBootcamps)
    .post(protect, authorize('publisher','admin'), createBootcamps);

router
    .route('/:id')
    .get(getBootcamp)
    .put(protect, authorize('publisher','admin'), updateBootcamps)
    .delete(protect, authorize('publisher','admin'), deleteBootcamps);

module.exports = router;
