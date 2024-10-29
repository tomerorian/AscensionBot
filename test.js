import sharp from 'sharp';
import tesseract from 'node-tesseract-ocr';

// Preprocessing function
async function preprocessImage(inputPath, outputPath) {
    await sharp(inputPath)
        .resize({ width: 800 }) // Adjust width as needed
        .grayscale() // Convert to grayscale
        .modulate({
            brightness: 1.2, // Increase brightness (adjust if necessary)
            contrast: 2.0, // Increase contrast
        })
        .blur(1) // Optional: apply slight blur to reduce noise
        .threshold(128) // Binarize the image
        .toFile(outputPath); // Save the processed image
}

// Main function to run OCR
async function runOCR(imagePath) {
    const processedImagePath = 'processed-image.png';

    // Preprocess the image
    await preprocessImage(imagePath, processedImagePath);

    // Tesseract options
    const options = {
        lang: 'eng', // Specify the language
        config: '--psm 3', // Page Segmentation Mode (try different values if needed)
    };

    // Run OCR on the processed image
    tesseract.recognize(processedImagePath, options)
        .then((text) => {
            console.log('Extracted Text:', text);
        })
        .catch((err) => {
            console.error('Error:', err);
        });
}

// Run the OCR process
runOCR('example.png'); // Replace with your image path
