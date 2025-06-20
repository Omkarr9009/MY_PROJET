import React, { useState } from 'react';
import axios from 'axios';
import axiosRetry from 'axios-retry';

// Configure axios-retry for handling temporary server downtimes
axiosRetry(axios, {
  retries: 3,
  retryDelay: (retryCount) => retryCount * 1000,
  retryCondition: (error) => {
    return error.code === 'ECONNREFUSED' || !error.response;
  },
});

function App() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [userMessage, setUserMessage] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [documentId, setDocumentId] = useState('');
  const [filename, setFilename] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // null, 'success', or 'failed'

  // Check if the backend server is running
  const checkServerHealth = async () => {
    try {
      await axios.get('http://localhost:5001/health', { timeout: 2000 });
      return true;
    } catch (err) {
      console.error('Server health check failed:', {
        message: err.message,
        code: err.code,
        response: err.response?.data,
      });
      return false;
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
    setUploadStatus(null); // Reset upload status when a new file is selected
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      setUploadStatus('failed');
      return;
    }

    setIsUploading(true);
    setError('');
    setUploadStatus(null); // Reset upload status

    // Check server health before uploading
    const isServerUp = await checkServerHealth();
    if (!isServerUp) {
      setError('Backend server is not running. Please start the server on http://localhost:5001 and try again.');
      setIsUploading(false);
      setUploadStatus('failed');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await axios.post('http://localhost:5001/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      console.log('Upload response:', uploadRes.data);

      // Validate the response format
      if (!uploadRes.data || typeof uploadRes.data !== 'object') {
        throw new Error('Invalid response format from server');
      }

      setSummary(uploadRes.data.summary || 'No summary available.');
      setDocumentId(uploadRes.data.case_id || '');
      setFilename(uploadRes.data.filename || file.name);
      setChatLog([]);
      setError('');
      setUploadStatus('success');
    } catch (err) {
      console.error('Detailed upload error:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        code: err.code,
        cors: err.message.includes('Access-Control') ? 'Possible CORS issue: Check if the frontend port matches the CORS origin allowed by the backend.' : 'No CORS issue detected',
      });
      setError(
        err.response?.data?.error || 
        (err.message.includes('Access-Control') 
          ? 'CORS error: The frontend port does not match the allowed origin in the backend. Check the browser console for details.' 
          : 'An error occurred during the upload process.')
      );
      setUploadStatus('failed');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle sending chat messages
  const handleSendMessage = async () => {
    if (!userMessage.trim()) {
      setError('Please enter a message to proceed.');
      return;
    }

    const newChatLog = [...chatLog, { role: 'user', content: userMessage }];
    setChatLog(newChatLog);
    setUserMessage('');
    setError('');

    try {
      const res = await axios.post('http://localhost:5001/chat', {
        message: userMessage,
        case_id: documentId,
      });
      const reply = res.data.reply;

      setChatLog([
        ...newChatLog,
        { role: 'assistant', content: reply }
      ]);
    } catch (err) {
      console.error('Chat error:', {
        message: err.message,
        response: err.response?.data,
        cors: err.message.includes('Access-Control') ? 'Possible CORS issue' : 'No CORS issue detected',
      });
      const errorMsg = err.response?.data?.error || 'An error occurred while processing your request.';
      setChatLog([...newChatLog, { role: 'assistant', content: errorMsg }]);
      setError(errorMsg);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
        fontFamily: "'Arial', sans-serif",
        color: '#2c3e50',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Header Section */}
      <header
        style={{
          width: '100%',
          maxWidth: '1200px',
          backgroundColor: '#2c3e50',
          padding: '15px 30px',
          borderBottom: '3px solid #d4af37',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
          marginBottom: '30px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '28px', marginRight: '15px' }}>⚖️</span>
          <h1
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: '28px',
              color: '#ffffff',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '1px',
            }}
          >
            Court Document Analyzer
          </h1>
        </div>
        <div
          style={{
            fontSize: '14px',
            color: '#d4af37',
            fontStyle: 'italic',
          }}
        >
          {/* Placeholder for future content */}
        </div>
      </header>

      {/* Main Content */}
      <main
        style={{
          width: '100%',
          maxWidth: '1200px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          padding: '30px',
        }}
      >
        {/* File Upload Section */}
        <section
          style={{
            marginBottom: '40px',
            padding: '20px',
            border: '1px solid #d4af37',
            borderRadius: '6px',
            backgroundColor: '#f9f9f9',
            position: 'relative', // For positioning the status symbols
          }}
        >
          <h2
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: '22px',
              color: '#2c3e50',
              marginBottom: '15px',
              borderBottom: '2px solid #d4af37',
              paddingBottom: '5px',
            }}
          >
            Upload Case Document
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              style={{
                padding: '10px',
                border: '1px solid #2c3e50',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                fontSize: '14px',
                flex: 1,
              }}
            />
            <button
              onClick={handleUpload}
              disabled={isUploading}
              style={{
                padding: '10px 20px',
                backgroundColor: isUploading ? '#7f8c8d' : '#2c3e50',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: isUploading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s ease',
              }}
              onMouseOver={(e) => {
                if (!isUploading) e.target.style.backgroundColor = '#3e5a7a';
              }}
              onMouseOut={(e) => {
                if (!isUploading) e.target.style.backgroundColor = '#2c3e50';
              }}
            >
              {isUploading ? 'Uploading...' : 'Upload & Analyze'}
            </button>

            {/* Upload Status Indicator */}
            {isUploading ? (
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  border: '3px solid #d4af37',
                  borderTop: '3px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            ) : uploadStatus === 'success' ? (
              <span
                style={{
                  fontSize: '20px',
                  color: '#27ae60',
                }}
              >
                ✔
              </span>
            ) : uploadStatus === 'failed' ? (
              <span
                style={{
                  fontSize: '20px',
                  color: '#c0392b',
                }}
              >
                ✘
              </span>
            ) : null}
          </div>
          {error && (
            <p
              style={{
                color: '#c0392b',
                fontSize: '14px',
                marginTop: '10px',
              }}
            >
              {error}
            </p>
          )}

          {/* CSS for the spinning loader */}
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </section>

        {/* Summary Section */}
        {summary && (
          <section
            style={{
              marginBottom: '40px',
              padding: '20px',
              border: '1px solid #d4af37',
              borderRadius: '6px',
              backgroundColor: '#f9f9f9',
            }}
          >
            <h2
              style={{
                fontFamily: "'Georgia', serif",
                fontSize: '22px',
                color: '#2c3e50',
                marginBottom: '15px',
                borderBottom: '2px solid #d4af37',
                paddingBottom: '5px',
              }}
            >
              Case Summary
            </h2>
            <p
              style={{
                padding: '15px',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                whiteSpace: 'pre-wrap',
                fontSize: '14px',
                lineHeight: '1.6',
              }}
            >
              {summary}
            </p>
          </section>
        )}

        {/* Chat Section */}
        <section
          style={{
            padding: '20px',
            border: '1px solid #d4af37',
            borderRadius: '6px',
            backgroundColor: '#f9f9f9',
          }}
        >
          <h2
            style={{
              fontFamily: "'Georgia', serif",
              fontSize: '22px',
              color: '#2c3e50',
              marginBottom: '15px',
              borderBottom: '2px solid #d4af37',
              paddingBottom: '5px',
            }}
          >
            Case Inquiry
          </h2>
          <div
            style={{
              border: '1px solid #bdc3c7',
              padding: '20px',
              minHeight: '250px',
              marginBottom: '15px',
              borderRadius: '4px',
              backgroundColor: '#ffffff',
              overflowY: 'auto',
            }}
          >
            {chatLog.length === 0 ? (
              <p
                style={{
                  color: '#7f8c8d',
                  fontStyle: 'italic',
                  textAlign: 'center',
                  fontSize: '14px',
                }}
              >
                Please upload a document and ask a question to begin...
              </p>
            ) : (
              chatLog.map((msg, i) => (
                <p
                  key={i}
                  style={{
                    margin: '10px 0',
                    padding: '10px',
                    backgroundColor: msg.role === 'user' ? '#ecf0f1' : '#f5f6fa',
                    borderRadius: '4px',
                    fontSize: '14px',
                    borderLeft: msg.role === 'user' ? '3px solid #2c3e50' : '3px solid #d4af37',
                  }}
                >
                  <strong
                    style={{
                      color: msg.role === 'user' ? '#2c3e50' : '#d4af37',
                    }}
                  >
                    {msg.role === 'user' ? 'Counsel' : 'Assistant'}:
                  </strong>{' '}
                  {msg.content}
                </p>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <input
              style={{
                flex: 1,
                padding: '10px',
                border: '1px solid #2c3e50',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                fontSize: '14px',
              }}
              placeholder="Enter your inquiry regarding the case..."
              value={userMessage}
              onChange={(e) => setUserMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              style={{
                padding: '10px 20px',
                backgroundColor: '#d4af37',
                color: '#2c3e50',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.3s ease',
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#e1c16e')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#d4af37')}
            >
              Submit Inquiry
            </button>
          </div>
        </section>
      </main>

      {/* Footer Section */}
      <footer
        style={{
          width: '100%',
          maxWidth: '1200px',
          marginTop: '30px',
          padding: '15px 30px',
          backgroundColor: '#2c3e50',
          color: '#ffffff',
          textAlign: 'center',
          fontSize: '12px',
          borderTop: '3px solid #d4af37',
        }}
      >
        {/* © 2025 LegalTech Solutions. All rights reserved. */}
      </footer>
    </div>
  );
}

export default App;