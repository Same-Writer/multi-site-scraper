const { spawn } = require('child_process');
const path = require('path');

// Function to run the web server with a timeout
function testWebServer(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    console.log(`Starting web server test with ${timeoutMs}ms timeout...`);
    
    // Spawn the web server process
    const webServer = spawn('node', [path.join(__dirname, 'web.js')], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    let serverStarted = false;
    
    // Capture stdout
    webServer.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      process.stdout.write(output);
      
      // Check if server started successfully
      if (output.includes('Web UI server running at')) {
        serverStarted = true;
        console.log('\n✅ Web server started successfully!');
      }
    });
    
    // Capture stderr
    webServer.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      process.stderr.write(output);
    });
    
    // Handle process exit
    webServer.on('close', (code) => {
      console.log(`\nWeb server process exited with code ${code}`);
      if (code === 0) {
        resolve({ success: true, stdout, stderr, serverStarted });
      } else {
        reject(new Error(`Web server exited with code ${code}\nStderr: ${stderr}`));
      }
    });
    
    // Handle process error (e.g., failed to start)
    webServer.on('error', (error) => {
      console.error('Failed to start web server process:', error);
      reject(new Error(`Failed to start web server: ${error.message}`));
    });
    
    // Set timeout to kill the process
    const timeout = setTimeout(() => {
      console.log('\n⏰ Timeout reached. Terminating web server process...');
      webServer.kill('SIGTERM');
    }, timeoutMs);
    
    // Clear timeout if process exits naturally
    webServer.on('close', () => {
      clearTimeout(timeout);
    });
  });
}

// Run the test
async function runTest() {
  try {
    const result = await testWebServer(15000); // 15 second timeout
    
    if (result.serverStarted) {
      console.log('\n✅ Web UI test PASSED: Server started successfully and ran without errors');
      process.exit(0);
    } else {
      console.log('\n❌ Web UI test FAILED: Server did not start properly');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Web UI test FAILED:', error.message);
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, stopping test...');
  process.exit(0);
});

// Run the test
runTest();
