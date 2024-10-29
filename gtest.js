// Import the necessary libraries
import fs from 'fs';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Create a client using the service account key file
const client = new ImageAnnotatorClient({
    keyFilename: 'service-account-file.json'
});

// Path to the image file
const fileName = 'example.png';

// Perform text detection on the image file
async function detectText() {
    try {
        const [result] = await client.textDetection(fileName);
        const detections = result.textAnnotations;

        if (detections.length > 0) {
            console.log('Detected text:');
            detections.forEach(text => {
                console.log(text.description); // Print the detected text
            });
        } else {
            console.log('No text detected.');
        }
    } catch (error) {
        console.error('Error during text detection:', error);
    }
}

// Call the function
detectText();
