const processEvent = require('./processEvent.js');
const User = require('./models/User.js');
const EventImage = require('./models/EventImage.js');
const FaceMatch = require('./models/FaceMatch.js');

async function recognizeEvent(req,res){
    try{
        const {eventId, imageUrls} = req.body;

        // Support both single imageUrl and multiple imageUrls for backwards compatibility
        const urls = imageUrls || (req.body.imageUrl ? [req.body.imageUrl] : null);

        if(!eventId || !urls || urls.length === 0){
            return res.status(400).json({message:"eventId and imageUrls (array) are required"});
        }

        //load all registered users and their face descriptors
        const users = await User.find({});
        const registeredUsers = users.map(u=>({
            userId: u.userId,
            descriptor: u.faceDescriptors[0]? new Float32Array(u.faceDescriptors[0]) : null
        })).filter(u=>u.descriptor);

        // Process all images and collect results
        let totalFacesDetected = 0;
        let allMatches = [];
        const allKnownMatches = [];
        const eventImages = [];

        for (const imageUrl of urls) {
            try {
                //store the event image in the database
                const eventImage = await EventImage.create({
                    eventId,
                    imageUrl,
                    processed: false,
                    faceCount: 0
                });
                eventImages.push(eventImage);

                //process the event image to detect and recognize faces
                const matches = await processEvent(imageUrl, registeredUsers);
                totalFacesDetected += matches.length;
                allMatches.push(...matches);

                //prepare face matches for database (add eventId to each match)
                const knownMatches = matches
                    .filter(m => m.userId !== null)
                    .map(m => ({ ...m, eventId }));
                
                allKnownMatches.push(...knownMatches);

                //update event image document
                await eventImage.updateOne(
                    {_id: eventImage._id},
                    {processed: true, faceCount: matches.length} 
                );

                console.log(`Processed image ${urls.indexOf(imageUrl) + 1}/${urls.length}: ${matches.length} faces detected`);

            } catch (imageError) {
                console.error(`Error processing image ${imageUrl}:`, imageError.message);
                // Mark this image as having failed processing
                const failedImage = eventImages.find(ei => ei.imageUrl === imageUrl);
                if (failedImage) {
                    await failedImage.updateOne({ processed: false, faceCount: -1 });
                }
                // Continue processing other images instead of failing the entire request
            }
        }

        // Save all face matches to the database
        if (allKnownMatches.length > 0) {
            await FaceMatch.insertMany(allKnownMatches);
        }

        res.json({
            eventId,
            imagesProcessed: eventImages.length,
            totalFacesDetected,
            matchedUsers: allKnownMatches.map(m => ({ 
                userId: m.userId, 
                distance: m.distance,
                imageUrl: m.imageUrl 
            })),
            summary: {
                totalImages: urls.length,
                successfulImages: eventImages.length,
                knownFacesFound: allKnownMatches.length
            }
        });

  } catch (err) {
    console.error('Event recognition error:', err);
    
    // Provide specific error messages
    let errorMessage = 'Face recognition failed';
    let statusCode = 500;
    
    if (err.message && err.message.includes('Failed to download image')) {
      errorMessage = 'Unable to access the image URL. The image may be unavailable or the server is not responding.';
      statusCode = 502; // Bad Gateway
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED') {
      errorMessage = 'Network error: Unable to connect to the image server.';
      statusCode = 504; // Gateway Timeout
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: err.message 
    });
  }
}

module.exports = recognizeEvent;