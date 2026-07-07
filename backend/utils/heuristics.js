/**
 * Local Static & Heuristic Malware Analysis Engine
 * Calculates Shannon entropy, verifies magic bytes, and scans for suspicious indicators.
 */

// Calculate Shannon entropy of a buffer to detect obfuscation/packing (ranges 0 to 8)
export function calculateEntropy(buffer) {
  const len = buffer.length;
  if (len === 0) return 0;

  const frequencies = new Uint32Array(256);
  for (let i = 0; i < len; i++) {
    frequencies[buffer[i]]++;
  }

  let entropy = 0;
  for (let i = 0; i < 256; i++) {
    const f = frequencies[i];
    if (f > 0) {
      const p = f / len;
      entropy -= p * Math.log2(p);
    }
  }
  return Number(entropy.toFixed(3));
}

// Map magic bytes (hex) to standard file types
export function getMagicType(buffer) {
  if (buffer.length < 4) return 'unknown';
  const hex = buffer.slice(0, 4).toString('hex').toLowerCase();
  
  if (hex.startsWith('4d5a')) return 'executable'; // PE EXE, DLL, SYS, SCR
  if (hex.startsWith('25504446')) return 'pdf'; // %PDF
  if (hex.startsWith('504b0304')) return 'zip/office'; // PK.. (ZIP, DOCX, XLSX, PPTX, JAR)
  if (hex.startsWith('89504e47')) return 'png';
  if (hex.startsWith('ffd8ff')) return 'jpeg';
  if (hex.startsWith('47494638')) return 'gif';
  if (hex.startsWith('7b')) return 'json'; // {
  if (hex.startsWith('3c21') || hex.startsWith('3c68') || hex.startsWith('3c5f')) return 'html'; // <! or <h or <_
  
  return 'unknown';
}

export function analyzeFile(buffer, filename) {
  const flags = [];
  let score = 0; // 0 to 100
  const normalizedFilename = filename.toLowerCase();
  const ext = normalizedFilename.split('.').pop();
  const fileEntropy = calculateEntropy(buffer);
  const magicType = getMagicType(buffer);

  // 1. Double Extension Detection (e.g. invoice.pdf.exe)
  const dotsCount = (filename.match(/\./g) || []).length;
  const isDoubleExtension = dotsCount > 1 && /\.(pdf|docx|xlsx|txt|png|jpg|gif|csv)\.(exe|bat|cmd|ps1|vbs|scr|dll|js|vbe|jar)$/i.test(normalizedFilename);
  if (isDoubleExtension) {
    flags.push('CRITICAL: Double extension spoofing detected (e.g., pdf.exe).');
    score = Math.max(score, 85);
  }

  // 2. Right-to-Left Override (RTLO) Character Detection (\u202e)
  if (filename.includes('\u202e')) {
    flags.push('CRITICAL: Right-to-Left Override (RTLO) character detected in filename.');
    score = Math.max(score, 95);
  }

  // 3. Extension vs. Magic Byte Mismatch (Extension Masquerading)
  const executableExts = ['exe', 'dll', 'sys', 'scr', 'cpl', 'efi', 'pif'];
  const documentExts = ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'rtf', 'csv'];
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'];

  if (magicType === 'executable' && !executableExts.includes(ext)) {
    flags.push(`CRITICAL: Extension Masquerading! Executable binary hidden as .${ext} file.`);
    score = Math.max(score, 95);
  } else if (magicType === 'pdf' && ext !== 'pdf') {
    flags.push(`WARNING: Format mismatch. PDF file structure hidden as .${ext} extension.`);
    score = Math.max(score, 50);
  } else if (magicType === 'png' || magicType === 'jpeg' || magicType === 'gif') {
    if (!imageExts.includes(ext)) {
      flags.push(`WARNING: Format mismatch. Image structure hidden as .${ext} extension.`);
      score = Math.max(score, 40);
    }
  }

  // Convert buffer to string for text-based analysis
  // Use both ascii and utf-8 to be safe with obfuscation
  const asciiContent = buffer.toString('ascii');
  
  // 4. PDF Exploit Signature Checks
  if (magicType === 'pdf' || ext === 'pdf') {
    let pdfThreats = 0;
    if (asciiContent.includes('/JavaScript') || asciiContent.includes('/JS')) {
      flags.push('MEDIUM: Embedded JavaScript detected inside the PDF.');
      pdfThreats += 20;
    }
    if (asciiContent.includes('/OpenAction')) {
      flags.push('HIGH: Automatic action trigger (/OpenAction) detected inside the PDF.');
      pdfThreats += 35;
    }
    if (asciiContent.includes('/Launch')) {
      flags.push('HIGH: Program execution trigger (/Launch) detected inside the PDF.');
      pdfThreats += 40;
    }
    if (asciiContent.includes('/EmbeddedFiles')) {
      flags.push('MEDIUM: Embedded file container (/EmbeddedFiles) detected inside the PDF.');
      pdfThreats += 15;
    }
    score = Math.max(score, Math.min(90, pdfThreats));
  }

  // 5. Office Macro Detection in PK formats (ZIP/DOCX/XLSX)
  if (magicType === 'zip/office' || ['docx', 'xlsx', 'docm', 'xlsm'].includes(ext)) {
    if (asciiContent.includes('vbaProject.bin') || asciiContent.includes('word/vba') || asciiContent.includes('xl/vba')) {
      flags.push('HIGH: Embedded VBA macros (vbaProject.bin) detected in Office Document/Archive.');
      score = Math.max(score, 70);
    }
  }

  // 6. Suspicious Scripting / Shell Patterns (Powershell, batch, VBS, JS)
  const scriptExts = ['ps1', 'bat', 'cmd', 'vbs', 'vbe', 'js', 'sh', 'html', 'htm'];
  if (scriptExts.includes(ext) || magicType === 'html') {
    let scriptScore = 0;
    const lowerContent = asciiContent.toLowerCase();
    
    // Remote payload downloader
    if (lowerContent.includes('downloadstring') || lowerContent.includes('downloadfile') || lowerContent.includes('wget ') || lowerContent.includes('curl ')) {
      flags.push('HIGH: Remote script/payload download pattern detected.');
      scriptScore += 35;
    }
    // Execution bypass
    if (lowerContent.includes('bypass') && (lowerContent.includes('-executionpolicy') || lowerContent.includes('-ep '))) {
      flags.push('HIGH: PowerShell execution policy bypass flag detected.');
      scriptScore += 35;
    }
    // Obfuscation / eval
    if (lowerContent.includes('eval(') || lowerContent.includes('unescape(') || lowerContent.includes('fromcharcode')) {
      flags.push('MEDIUM: Code obfuscation markers (eval, unescape, fromCharCode) detected.');
      scriptScore += 20;
    }
    // WScript shell
    if (lowerContent.includes('wscript.shell') || lowerContent.includes('activexobject') || lowerContent.includes('shell.application')) {
      flags.push('HIGH: Windows Script Host (WScript.Shell) execution object detected.');
      scriptScore += 45;
    }
    // Hidden execution
    if (lowerContent.includes('-windowstyle hidden') || lowerContent.includes('-w hidden') || lowerContent.includes('createobject("wscript.shell").run')) {
      flags.push('HIGH: Background/Hidden shell execution pattern detected.');
      scriptScore += 40;
    }

    score = Math.max(score, Math.min(95, scriptScore));
  }

  // 7. Entropy Analysis (Compressed/packed scripts/documents are highly suspicious)
  const susceptibleToEntropy = [...documentExts, ...scriptExts].includes(ext) || magicType === 'pdf';
  if (susceptibleToEntropy && fileEntropy > 7.3) {
    flags.push(`MEDIUM: Extremely high file entropy (${fileEntropy}) indicates packing, encryption, or heavy obfuscation.`);
    score = Math.max(score, Math.min(90, score + 30));
  }

  // EICAR specific local detection
  if (asciiContent.includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE')) {
    flags.push('CRITICAL: Local heuristic match for EICAR standard antivirus test signature.');
    score = 100;
  }

  // Determine classification and confidence
  const isMalicious = score >= 50;
  let confidence = 0;
  
  if (flags.length > 0) {
    confidence = Math.min(95, 50 + flags.length * 15);
  } else {
    confidence = 80;
  }

  return {
    score,
    isMalicious,
    confidence,
    flags,
    entropy: fileEntropy,
    magicType
  };
}
