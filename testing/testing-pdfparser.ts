// PDF parser
// Only for "DIGITAL PDF"
// Scan for words inside the PDF
// To run: node testing/testing-pdfparser.ts

import fs from "fs";    // FS - file system
import pdfParse from "pdf-parse";

const dataBuffer = fs.readFileSync("./testing/pbb.pdf");

try {
    //Testing line
    // console.log("buffer size:", dataBuffer?.length);

    const result = await pdfParse(dataBuffer);

    // Print result
    // console.log(result.text);

    // Save to text file
    const filePath = "testing/output/pbb.txt";
    fs.writeFileSync(filePath, result.text, "utf-8");

} catch (error) {
    console.error("Error parsing PDF:", error);
}