import { ImageAnnotatorClient } from '@google-cloud/vision';

// Create a client using the service account key file
const imageToTextClient = new ImageAnnotatorClient({
    keyFilename: 'service-account-file.json'
});

export default imageToTextClient;