const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async'); 
const geocoder= require('../utils/geocoder');
const Bootcamp = require('../models/Bootcamp');

// @desc      Get all bootcamps
// @route     GET /api/v1/bootcamps
// @access    Public
exports.getBootcamps = asyncHandler(async (req, res, next)=>{
        
        res.status(200).json(res.advancedResults);
});

//@Desc     Get single bootcamps 
//@route    GET /api/v1/bootcamps/:id
//@access   public
exports.getBootcamp = asyncHandler(async (req, res, next)=>{
        const bootcamp = await Bootcamp.findById(req.params.id);

        if(!bootcamp){
            return  next(new ErrorResponse(`Bootcamp no found with id of ${req.params.id}`, 404));  
        }
        res.status(200).json({ success: true, data: bootcamp})
});

//@Desc     create a bootcamp
//@route    POST /api/v1/bootcamps
//@access   private
exports.createBootcamps = asyncHandler(async (req, res, next)=>{
        //Add user to req.body
        req.body.user= req.user.id;

        //Check for published bootcamp
        const publishedBootcamp = await Bootcamp.findOne({ user: req.user.id });

        //If the user is not an admin, they can only add one bootcamp
        if(publishedBootcamp && req.user.role !== 'admin') {
                return next(new ErrorResponse(`The user with id of ${req.user.id} has already published a bootcamp`, 400));         
        }
 
        const bootcamp = await Bootcamp.create(req.body);
        
        res.status(201).json({ success: true, data: bootcamp })
});

//@Desc     update bootcamp
//@route    PUT /api/v1/bootcamps/:id
//@access   private
exports.updateBootcamps = asyncHandler(async (req, res, next)=>{

        let bootcamp = await Bootcamp.findById(req.params.id);
    
        if(!bootcamp){
            return  next(new ErrorResponse(`Bootcamp not found with id of ${req.params.id}`, 404));
        }

        //Make sure user is bootcamp owner
        if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
                return next(new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`, 401));
        }

        bootcamp = await Bootcamp.findOneAndUpdate(req.params.id, req.body, {
                new : true,
                runValidators : true
            });
    
        res.status(200).json({success: true, data: bootcamp })
});

//@Desc     delete bootcamp
//@route    DELETE /api/v1/bootcamps/:id
//@access   private
exports.deleteBootcamps = asyncHandler(async (req, res, next)=>{

        const bootcamp = await Bootcamp.findById(req.params.id);

        if(!bootcamp){
            return  next(new ErrorResponse(`Bootcamp no found with id of ${req.params.id}`, 404));
        }

        //Make sure user is bootcamp owner
        if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
                return next(new ErrorResponse(`User ${req.params.id} is not authorized to delete this bootcamp`, 401));
        }

        await bootcamp.remove();
        res.status(200).json({success: true, data: { } });
});

//@Desc     get bootcamps within a radius
//@route    GET /api/v1/bootcamps/radius/:zipcode/:distance
//@access   private
exports.getBootcampsInRaduis = asyncHandler(async (req, res, next)=>{
        const{ zipcode,distance } = req.params;

        //Get lan and lng from geocoder
        const loc = await geocoder.geocode(zipcode);
        const lat= loc[0].latitude;
        const lng= loc[0].longitude;

        //Calc radius using radians
        //Divide dist by radius of earth
        //Radius of Earth= 3,963 mi/ 6378 km
        const radius= distance / 3963;

        const bootcamps= await Bootcamp.find({
                location: { $geoWithin: { $centerSphere: [[lat, lng], radius] } }
        });

        res.status(200).json({ success:true, count: bootcamps.length, data: bootcamps });
});

//@Desc     Upload photo for bootcamp
//@route    PUT /api/v1/bootcamps/:id/photo
//@access   private
exports.bootcampPhotoUpload = asyncHandler(async (req, res, next)=>{

        const bootcamp = await Bootcamp.findById(req.params.id);

        if(!bootcamp){
                return  next(new ErrorResponse(`Bootcamp no found with id of ${req.params.id}`, 404));
        }
        
        //Make sure user is bootcamp owner
        if(bootcamp.user.toString() !== req.user.id && req.user.role !== 'admin') {
                return next(new ErrorResponse(`User ${req.params.id} is not authorized to update this bootcamp`, 401));
        }

        if(!req.files) {
                return  next(new ErrorResponse(`Please upload a file`, 400));   
        }       
        
        const file = req.files.file;
        
        //Make sure the image is a photo
        if(!file.mimetype.startsWith('image')) {
                return  next(new ErrorResponse(`Please upload an image file`, 400));
        }

        //heck filesize
        if(file.size > process.env.MAX_FILE_UPLOAD) {
                return  next(new ErrorResponse(`Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`, 400));
        }

        //Create custom filename
        file.name= `photo_${bootcamp._id}${path.parse(file.name).ext}`;

        file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
                if (err) {
                        console.log(err);
                        return  next(new ErrorResponse(`Problem with file upload`, 500));       
                } 
                
                await Bootcamp.findByIdAndUpdate(req.params.id, { photo: file.name});
                res.status(200).json({ succcess: true, data: file.name });
        });
});

