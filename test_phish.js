import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';

async function testScan() {
  try {
    // 1. Test short-circuit logic for an AI image
    fs.writeFileSync('./test_midjourney.png', 'fake image binary data');
    const form1 = new FormData();
    form1.append('file', fs.createReadStream('./test_midjourney.png'));

    console.log("Testing AI Image (short-circuit)...");
    const res1 = await axios.post('http://127.0.0.1:5000/api/phish/analyze', form1, {
      headers: form1.getHeaders()
    });
    console.log("Result 1:", JSON.stringify(res1.data, null, 2));

    // 2. Test LLM logic for an arbitrary image without the keyword
    fs.writeFileSync('./test_photo.jpg', 'BM ffff authentic image binary data EXIF data');
    const form2 = new FormData();
    form2.append('file', fs.createReadStream('./test_photo.jpg'));

    console.log("\nTesting Authentic Photo (LLM)...");
    const res2 = await axios.post('http://127.0.0.1:5000/api/phish/analyze', form2, {
      headers: form2.getHeaders()
    });
    console.log("Result 2:", JSON.stringify(res2.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error("Test failed with response:", err.response.status, err.response.data);
    } else {
      console.error("Test failed network/other:", err.message);
    }
  }
}

testScan();
