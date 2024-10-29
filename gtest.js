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

        if (detections.length > 1) { // Ensure there's text detected beyond the full block
            console.log('Detected text:');
            detections.slice(1).forEach(text => {
                console.log(text.description); // Print the detected text line by line
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
