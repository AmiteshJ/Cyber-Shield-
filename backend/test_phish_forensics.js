import axios from 'axios';
import FormData from 'form-data';

async function runTest(name, filename, fileContent) {
  console.log(`\n--- Running Test: ${name} ---`);
  const form = new FormData();
  form.append('file', Buffer.from(fileContent), { filename, contentType: 'image/png' });

  try {
    const response = await axios.post('http://127.0.0.1:5000/api/phish/analyze', form, {
      headers: form.getHeaders(),
      timeout: 10000
    });
    console.log('Status Code:', response.status);
    console.log('Verdict:', response.data.data.isPhishing ? 'AI GENERATED ⚠️' : 'CLEAN/SAFE ✅');
    console.log('Confidence:', response.data.data.confidence + '%');
    console.log('Explanation Snippet:', response.data.data.explanation.substring(0, 200) + '...');
    
    // Assertions
    if (name.includes('AI Image') && !response.data.data.isPhishing) {
      throw new Error('Assertion Failed: Expected AI generated classification');
    }
    if (name.includes('Camera Image') && response.data.data.isPhishing) {
      throw new Error('Assertion Failed: Expected Safe classification');
    }
    if (name.includes('Inconclusive Image') && response.data.data.isPhishing) {
      throw new Error('Assertion Failed: Expected Safe classification');
    }
    console.log('Assertion PASSED');
  } catch (error) {
    if (error.response) {
      console.error('Test Failed with server response:', error.response.status, error.response.data);
    } else {
      console.error('Test Failed:', error.message);
    }
    process.exit(1);
  }
}

async function runAllTests() {
  console.log('=== STARTING DEEPFAKE SCAN INTEGRATION TESTS ===');
  
  // 1. AI Image containing Midjourney chunk at the end
  await runTest(
    'AI Image (Midjourney tag)',
    'midjourney_creation.png',
    'PNG header ... image data ... Creator: Midjourney, Prompt: A retro-futuristic hacker terminal ... IEND'
  );

  // 2. Camera Photo containing Canon metadata
  await runTest(
    'Camera Image (Canon EXIF)',
    'nature_shot.png',
    'PNG header ... Exif metadata: Canon EOS 5D Mark IV, Lens: 24-70mm ... IEND'
  );

  // 3. Inconclusive image containing neither
  await runTest(
    'Inconclusive Image (No tags)',
    'simple_diagram.png',
    'PNG header ... raw pixels ... IEND'
  );

  console.log('\n=== ALL DEEPFAKE FORENSICS TESTS COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

runAllTests();
