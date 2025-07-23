# **App Name**: FotoChaveiro

## Core Features:

- Image Upload: Allows the user to upload an image from their computer or device.
- Keychain Size Selection: Presents a dropdown menu, letting the user select the desired keychain size (e.g., 3x4 cm, 3.5x4.5 cm, etc.).
- Cropped Preview: Displays a preview of the image, cropped to the selected keychain size ratio, giving users a clear idea of the final output.
- Manual Alignment/Crop: Gives users the option to manually adjust the image cropping, ensuring important details are included in the final keychain image. Uses react-easy-crop to allow for image cropping
- Quantity Selection: Lets users specify how many keychain images they want to fit on a single PDF page.
- PDF Generation: Generates a print-ready PDF file, formatted for A4 paper size, with the specified number of keychain images arranged to minimize wasted space.
- PDF Download: Provides a button to download the generated PDF file directly to the user's device.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5), evoking reliability, printing, and precision.
- Background color: Light blue (#E8EAF6), offering a calm and uncluttered backdrop.
- Accent color: Purple (#7E57C2) will add emphasis and focus to interactive elements
- Font pairing: 'Poppins' (sans-serif) for headings and 'PT Sans' (sans-serif) for body text, offering a contemporary and accessible feel. The sans-serif fonts offer a clean style in line with the purpose of the app.
- Use simple, clear icons for actions like upload, crop, and download.
- A clean, simple layout emphasizing the essential features: image upload, size selection, preview, and PDF generation. Use Tailwind CSS to arrange elements and manage spacing.
- Subtle transitions on hover and loading animations to enhance user experience.