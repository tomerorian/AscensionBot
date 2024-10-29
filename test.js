import Tesseract from 'tesseract.js';

Tesseract.recognize('./example.png', 'eng', {
    logger: m => console.log(m) // Log progress messages
})
    .then(({ data: { text } }) => {
        console.log('Extracted Text:\n', text);
    })
    .catch(err => {
        console.error('Error:\n', err);
    });