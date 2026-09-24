import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const authHeaders = () => {
  const token = localStorage.getItem('nexus_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Upload a CSV File object to the user's private storage. */
export const uploadCSV = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axios.post(`${API_BASE}/data/upload`, formData, {
    headers: {
      ...authHeaders(),
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
  return res.data;
};

/** List all files uploaded by the authenticated user. */
export const listUserFiles = async () => {
  const res = await axios.get(`${API_BASE}/data/files`, { headers: authHeaders() });
  return res.data.files;
};

/** Delete one of the user's files by name. */
export const deleteUserFile = async (filename) => {
  const res = await axios.delete(
    `${API_BASE}/data/files/${encodeURIComponent(filename)}`,
    { headers: authHeaders() }
  );
  return res.data;
};

/** Run the full ML analysis on one of the user's uploaded files. */
export const analyzeUserFile = async (filename) => {
  const res = await axios.get(
    `${API_BASE}/data/analyze/${encodeURIComponent(filename)}`,
    { headers: authHeaders() }
  );
  return res.data;
};

/** Run What-If Scenario simulation on dynamic inputs. */
export const simulateScenario = async (scenarioData) => {
  const res = await axios.post(
    `${API_BASE}/data/simulate`,
    scenarioData,
    { headers: authHeaders() }
  );
  return res.data;
};

/** Send a message to the strategy advisor chatbot. */
export const chatWithAdvisor = async (chatData) => {
  const res = await axios.post(
    `${API_BASE}/data/chat`,
    chatData,
    { headers: authHeaders() }
  );
  return res.data;
};


