import axios from 'axios';

const API_BASE_URL = 'https://ocr-demo-407078147357.asia-southeast1.run.app/';  // Replace with your actual API URL

export const uploadImages = async (formData, endpoint) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/${endpoint}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  } catch (error) {
    console.error('API Error:', error);
    throw error; // Re-throw the error to be caught by the component
  }
};