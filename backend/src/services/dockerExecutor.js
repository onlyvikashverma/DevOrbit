// Using Judge0 CE API for reliable, non-whitelisted execution
export const executeCode = async (language, content) => {
  let languageId = 93; // Default to Node.js 18.15.0

  switch(language) {
    case 'javascript': case 'js':
      languageId = 93; 
      break;
    case 'python': case 'py':
      languageId = 92; // Python 3.11.2
      break;
    case 'java':
      languageId = 91; // Java JDK 17.0.6
      break;
    case 'c':
      languageId = 103; // GCC 14.1.0
      break;
    case 'c++': case 'cpp':
      languageId = 105; // GCC 14.1.0
      break;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }

  try {
    const response = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: content,
        language_id: languageId,
        stdin: ''
      })
    });

    const data = await response.json();
    console.log('[Judge0 Response]:', JSON.stringify(data));

    if (data.status?.id > 4) {
      return { output: data.status.description || 'Execution Failed', isError: true };
    }

    if (data.stderr) {
       return { output: data.stderr, isError: true };
    }
    
    if (data.compile_output) {
       return { output: data.compile_output, isError: true };
    }

    let finalOutput = data.stdout || '';

    // Fallback for common Java pitfalls
    if (!finalOutput.trim() && language === 'java') {
      if (!content.includes('public class Main')) {
        return { 
          output: 'DevOrbit Notice: For Java in this sandbox, please ensure your entrance class is: public class Main { ... }', 
          isError: false 
        };
      }
    }

    return { 
      output: finalOutput.trim() || 'Execution successful, but produced no output.', 
      isError: false 
    };

  } catch (error) {
    console.error('Judge0 Execution Error:', error.message || error);
    return { output: `Execution Server Error: ${error.message || error}`, isError: true };
  }
};


