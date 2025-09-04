// utils/brochureUtils.js - Testing and utility functions

const fs = require("fs");
const path = require("path");

// ✅ Check if brochure file exists
function checkBrochureExists(brochureFile) {
  if (!brochureFile || !brochureFile.path) {
    return { exists: false, message: "No brochure file path provided" };
  }

  const exists = fs.existsSync(brochureFile.path);
  return {
    exists,
    message: exists ? "Brochure file found" : "Brochure file not found on disk",
    path: brochureFile.path,
    stats: exists ? fs.statSync(brochureFile.path) : null,
  };
}

// ✅ Create test brochure file (for development)
function createTestBrochure() {
  const uploadsDir = path.join(__dirname, "../uploads/brochures");
  fs.mkdirSync(uploadsDir, { recursive: true });

  const testPdfPath = path.join(uploadsDir, "test-brochure.pdf");

  // Create a simple test PDF content (this is just for testing)
  const testPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Brochure) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000198 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
290
%%EOF`;

  fs.writeFileSync(testPdfPath, testPdfContent);

  return {
    filename: "test-brochure.pdf",
    originalName: "Test Vehicle Brochure.pdf",
    path: testPdfPath,
    size: Buffer.byteLength(testPdfContent),
    mimetype: "application/pdf",
  };
}

// ✅ Get brochure file info
function getBrochureInfo(brochureFile) {
  if (!brochureFile) return null;

  return {
    filename: brochureFile.filename,
    originalName: brochureFile.originalName,
    path: brochureFile.path,
    size: brochureFile.size,
    mimetype: brochureFile.mimetype,
    exists: fs.existsSync(brochureFile.path),
    url: `/api/products/download-brochure`, // This will be product-specific
  };
}

// ✅ Clean old brochure files (utility function)
function cleanOldBrochures(maxAgeInDays = 30) {
  const brochuresDir = path.join(__dirname, "../uploads/brochures");

  if (!fs.existsSync(brochuresDir)) {
    return { message: "Brochures directory does not exist" };
  }

  const files = fs.readdirSync(brochuresDir);
  const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
  const now = Date.now();

  let deletedCount = 0;

  files.forEach((filename) => {
    const filePath = path.join(brochuresDir, filename);
    const stats = fs.statSync(filePath);

    if (now - stats.mtime.getTime() > maxAge) {
      try {
        fs.unlinkSync(filePath);
        deletedCount++;
      } catch (error) {
        console.warn(
          `Failed to delete old brochure ${filename}:`,
          error.message
        );
      }
    }
  });

  return {
    message: `Cleaned ${deletedCount} old brochure files`,
    deletedCount,
    totalFiles: files.length,
  };
}

// ✅ Debug brochure download
async function debugBrochureDownload(
  productId,
  baseUrl = "http://localhost:5000"
) {
  try {
    const fetch = require("node-fetch"); // You might need to install this: npm install node-fetch

    // First, get product info
    const productResponse = await fetch(`${baseUrl}/api/products/${productId}`);
    const product = await productResponse.json();

    if (!product.brochureFile) {
      return { error: "Product has no brochure file" };
    }

    // Check if file exists on disk
    const fileCheck = checkBrochureExists(product.brochureFile);

    // Try to download
    const downloadResponse = await fetch(
      `${baseUrl}/api/products/${productId}/download-brochure`
    );

    return {
      product: {
        id: productId,
        title: product.title,
        brochureFile: product.brochureFile,
      },
      fileCheck,
      downloadResponse: {
        status: downloadResponse.status,
        statusText: downloadResponse.statusText,
        headers: Object.fromEntries(downloadResponse.headers.entries()),
      },
    };
  } catch (error) {
    return { error: error.message };
  }
}

module.exports = {
  checkBrochureExists,
  createTestBrochure,
  getBrochureInfo,
  cleanOldBrochures,
  debugBrochureDownload,
};
