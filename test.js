import sharp from 'sharp';
import tesseract from 'node-tesseract-ocr';

// Preprocessing function
async function preprocessImage(inputPath, outputPath) {
    await sharp(inputPath)
        .resize({ width: 800 }) // Resize the image
        .grayscale() // Convert to grayscale
        .modulate({
            brightness: 1.5, // Increase brightness
            contrast: 2.0, // Increase contrast
        })
        .threshold(140) // Apply thresholding to create a binary image
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
