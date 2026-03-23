import axios from 'axios';
import FormData from 'form-data';

async function testUpload() {
  const formData = new FormData();
  formData.append('file', Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'), 'eicar.txt');

  try {
    const response = await axios.post('http://localhost:5000/api/scan', formData, {
      headers: formData.getHeaders(),
    });
    console.log('Upload success:', response.data);
  } catch (error) {
    if (error.response) {
      console.error('Upload failed with status:', error.response.status, error.response.data);
    } else {
      console.error('Upload failed:', error.message);
    }
  }
}

testUpload();
