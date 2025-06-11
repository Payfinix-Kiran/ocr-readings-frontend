import { useState } from "react";
import { uploadImages } from "../api";
import "../Dashboard.css"; // Ensure your CSS is linked!
import * as XLSX from "xlsx";

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [singleImage, setSingleImage] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleSingleImageChange = (event) => {
    setSingleImage(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a ZIP file first");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await uploadImages(formData, "upload-images");
      const apiData = await response?.data;
      console.log(apiData);
      setImages(apiData.results);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Upload failed. Please check your file and try again.");
    } finally {
      setLoading(false);
      setProcessedCount(0);
      setTotalImages(0);
      setFile(null); // Clear the file input
    }
  };

  const handleSingleImageUpload = async () => {
    if (!singleImage) return alert("Please select an image first");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", singleImage);

    try {
      const response = await uploadImages(formData, "upload-image");
      const apiData = await response?.data;
      console.log("API Data:", apiData);
      setImages([apiData.result]);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Upload failed. Please check your file and try again.");
    } finally {
      setLoading(false);
      setSingleImage(null); // Clear the single image input
    }
  };
  
  const closeModal = () => {
    console.log("closeModal function called"); // Debugging
    setModalImage(null);
    console.log("modalImage state:", modalImage); // State after update
  };

  // Function to clear all data
  const handleClearData = () => {
    setFile(null);
    setSingleImage(null);
    setImages([]);
    setProcessedCount(0);
    setTotalImages(0);
  };

  function formatConfidence(confidence) {
    if (confidence === null || confidence === undefined || confidence === "NOT_FOUND") {
      return "N/A"; // Or some other placeholder
    }
    const percentage = (confidence * 100).toFixed(2); // Multiply by 100 and round to 2 decimal places
    return percentage + "%";
  }

  const convertToExcelData = () => {
    const excelData = images.map((image) => {
      return {
        "Image URL": image.image_url,
        "Meter Reading 1": image.ocr_reading_result_1?.reading_1 || "N/A",
        "Confidence Score 1": formatConfidence(image.ocr_reading_result_1?.confidence_1) || "N/A",
        "Spoof Confidence Score": image.spoof_result?.confidence_score || "N/A",
        "Spoof Result": image.spoof_result?.result || "N/A",
        "Spoof Reason": image.spoof_result?.reason || "N/A",
      };
    });
    return excelData;
  };

  // Function to download data as Excel
  const downloadExcel = () => {
    const excelData = convertToExcelData();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Image Analysis Results");
    XLSX.writeFile(workbook, "image_analysis_results.xlsx");
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>WBSEDCL AI-OCR PoC</h1>
        <p className="dashboard-description">Upload images for Detection</p>
      </header>

      <section className="upload-section">
        {/* ZIP Upload */}
        <label htmlFor="file-upload" className="custom-file-upload">
          <i className="fas fa-upload"></i> Choose ZIP File
        </label>
        <input
          id="file-upload"
          type="file"
          accept=".zip"
          onChange={handleFileChange}
          className="file-input"
        />
        {file && <span className="file-name">Selected: {file.name}</span>}
        <button
          onClick={handleUpload}
          disabled={loading || !file}
          className="upload-button"
        >
          {loading ? (
            <span>
              <i className="fas fa-spinner fa-spin"></i> Processing...
            </span>
          ) : (
            <span>Upload ZIP</span>
          )}
        </button>

         {/* Single Image Upload */}
         <label htmlFor="single-image-upload" className="custom-file-upload">
          <i className="fas fa-upload"></i> Choose Image
        </label>
        <input
          id="single-image-upload"
          type="file"
          accept="image/*"
          onChange={handleSingleImageChange}
          className="file-input"
        />
        {singleImage && <span className="file-name">Selected: {singleImage.name}</span>}
        <button
          onClick={handleSingleImageUpload}
          disabled={loading || !singleImage}
          className="upload-button"
        >
          {loading ? (
            <span>
              <i className="fas fa-spinner fa-spin"></i> Uploading...
            </span>
          ) : (
            <span>Upload Image</span>
          )}
        </button>
           {/* Clear Button */}
           <button
              onClick={handleClearData}
              className="clear-button"
            >
              <span>Clear</span>
            </button>
      </section>

      {modalImage && (
        <div className="modal">
          <div className="modal-content">
            <button className="close-modal" onClick={closeModal}>
              ×
            </button>
            <img
              src={modalImage.image_url}
              alt="Zoomed"
              className="zoomed-image"
            />
          </div>
        </div>
      )}

      <section className="results-section">
        <h2 className="uploaded-title">Analysis Results</h2>
        {images.length > 0 && (
         <>
         <button className="download-button" onClick={downloadExcel}>
           <i className="fas fa-download"></i> Download Excel
         </button>
         <br/>
       </>
        )}

        <div className="image-grid">
          {images.length === 0 ? (
            <p className="no-images">No images uploaded yet.</p>
          ) : (
            images.map((image) => (
              <div key={image.image_url || "singleImage"} className="image-card">
                <img
                  src={image.image_url}
                  alt="Uploaded"
                  className="image-thumbnail"
                  onClick={() => setModalImage(image)}
                />
                <div className="image-details">
                  {/* Meter Reading */}
                  <p>
                    <span className="detail-label">Meter Reading 1:</span>{" "}
                    {image.ocr_reading_result_1?.reading_1 || "N/A"} (
                    {formatConfidence(image.ocr_reading_result_1?.confidence_1) || "N/A"}
                    )
                  </p>

                  {/* Is Image a Spoof */}
                  <p>
                    <span className="detail-label">Is Image a Spoof:</span>{" "}
                    {image.spoof_result?.result === "Spoofed"
                      ? `Yes (${image.spoof_result?.confidence_score}%)`
                      : `No (${image.spoof_result?.confidence_score}%)`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

