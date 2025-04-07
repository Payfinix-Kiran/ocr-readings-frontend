import React, { useState, useEffect, useRef } from "react";
import { uploadImages } from "../api";
import "../Dashboard.css";
import * as XLSX from "xlsx";
import JSZip from "jszip";

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [singleImage, setSingleImage] = useState(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const imagesPerPage = 12; // Images per page
  const [totalPages, setTotalPages] = useState(1);
  const [processedCount, setProcessedCount] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Update totalPages whenever images changes
    setTotalPages(Math.ceil(images.length / imagesPerPage));
  }, [images, imagesPerPage]);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleSingleImageChange = (event) => {
    setSingleImage(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a ZIP file first");

    setLoading(true);
    setProcessedCount(0);
    setTotalImages(0);
    setImages([]); // Clear previous results

    try {
      const zip = new JSZip();
      const zipFile = await zip.loadAsync(file);
      const imageFiles = [];

      zipFile.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && /\.(png|jpg|jpeg|gif)$/i.test(relativePath)) {
          imageFiles.push(zipEntry);
        }
      });

      setTotalImages(imageFiles.length);

      // Split into chunks of 12
      const chunkSize = 12;
      const chunks = [];
      for (let i = 0; i < imageFiles.length; i += chunkSize) {
        chunks.push(imageFiles.slice(i, i + chunkSize));
      }

      // Upload each mini-ZIP chunk
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunk = chunks[chunkIndex];

        const chunkZip = new JSZip();
        chunk.forEach((entry) => {
          chunkZip.file(entry.name, entry.async("blob"));
        });

        const blobContent = await chunkZip.generateAsync({ type: "blob" });
        const chunkFormData = new FormData();
        const chunkFileName = `chunk_${chunkIndex + 1}.zip`;
        chunkFormData.append(
          "file",
          new File([blobContent], chunkFileName, { type: "application/zip" })
        );

        const response = await uploadImages(chunkFormData, "upload-images");
        const chunkResults = (await response?.data?.results) || [];

        setImages((prev) => [...prev, ...chunkResults]);
        setProcessedCount((prev) => prev + chunk.length); // Append results
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Upload failed. Please check your file and try again.");
    } finally {
      setLoading(false);
      // setProcessedCount(0);
      // setTotalImages(0);
      setFile(null);
    }
  };

  const handleSingleImageUpload = async () => {
    if (!singleImage) return alert("Please select an image first");

    setLoading(true);
    setProcessedCount(0);
    setTotalImages(1); // Single image

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
      setSingleImage(null);
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
    setCurrentPage(1); // Also reset current page
    setProcessedCount(0);
    setTotalImages(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  function formatConfidence(confidence) {
    if (
      confidence === null ||
      confidence === undefined ||
      confidence === "NOT_FOUND"
    ) {
      return "N/A"; // Or some other placeholder
    }
    const percentage = (confidence * 100).toFixed(2); // Multiply by 100 and round to 2 decimal places
    return percentage + "%";
  }

  const convertToExcelData = () => {
    const excelData = images.map((image) => {
      return {
        "Image URL": image.image_url,
        "Serial Number Reading":
          image.serial_number_result.reading === "NOT_FOUND"
            ? ""
            : image.serial_number_result.reading,
        "Meter Reading 1":
          image.ocr_reading_result_1.reading_1 === "NOT_FOUND"
            ? ""
            : image.ocr_reading_result_1.reading_1,
        "Confidence Score 1":
          image.ocr_reading_result_1.confidence_1 === "N/A"
            ? ""
            : image.ocr_reading_result_1.confidence_1,
        "Meter Reading 2":
          image.ocr_reading_result_2.reading_2 === "NOT_FOUND"
            ? ""
            : image.ocr_reading_result_2.reading_2,
        "Confidence Score 2":
          image.ocr_reading_result_2.confidence_2 === "NOT_FOUND"
            ? ""
            : image.ocr_reading_result_2.confidence_2,
        "Parameter Detected":
          image.ocr_reading_result_2.label === "UNKNOWN" ||
          image.ocr_reading_result_2.label === ""
            ? ""
            : image.ocr_reading_result_2.label,
        "Spoof Confidence Score": image.spoof_result.confidence_score,
        "Spoof Result": image.spoof_result.result,
        "Spoof Reason": image.spoof_result.reason,
        // Add more fields as needed
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

  // Get current images
  const indexOfLastImage = currentPage * imagesPerPage;
  const indexOfFirstImage = indexOfLastImage - imagesPerPage;
  const currentImages = images.slice(indexOfFirstImage, indexOfLastImage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

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
          ref={fileInputRef}
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
        {singleImage && (
          <span className="file-name">Selected: {singleImage.name}</span>
        )}
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
        <button onClick={handleClearData} className="clear-button">
          <span>Clear</span>
        </button>

        {images.length > 0 && images.length === totalImages && (
          <>
            <button className="download-button" onClick={downloadExcel}>
              <i className="fas fa-download"></i> Download Excel
            </button>
            <br />
            {/* <button className="download-button" onClick={downloadPdf}>
       <i className="fas fa-file-pdf"></i> Download PDF
     </button> */}
          </>
        )}
      </section>

      {/* {loading && totalImages > 0 && (
        <div className="modal">
          <div className="modal-content">
            <div className="modal-message">
              Images are processing please wait...
            </div>
          </div>
        </div>
      )} */}

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

        {totalImages > 0 && (
          <div className="processed-count">
            {processedCount < totalImages ? (
              <span>
                Processing {totalImages - processedCount} image
                {totalImages - processedCount > 1 ? "s" : ""} please wait...
              </span>
            ) : (
              <span>Finalized {totalImages} images</span>
            )}
          </div>
        )}

        <div className="image-grid">
          {images.length === 0 ? (
            <p className="no-images">No images uploaded yet.</p>
          ) : (
            currentImages.map((image) => (
              <div
                key={image.image_url || "singleImage"}
                className="image-card"
              >
                {" "}
                {/* Dynamic Key */}
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
                    {image.ocr_reading_result_1.reading_1 !== "NOT_FOUND" &&
                    formatConfidence(
                      image.ocr_reading_result_1.confidence_1
                    ) !== "N/A"
                      ? `${
                          image.ocr_reading_result_1.reading_1
                        } (${formatConfidence(
                          image.ocr_reading_result_1.confidence_1
                        )})`
                      : ""}
                  </p>

                  <p>
                    <span className="detail-label">Meter Reading 2:</span>{" "}
                    {image.ocr_reading_result_2.reading_2 !== "NOT_FOUND" &&
                    formatConfidence(
                      image.ocr_reading_result_2.confidence_2
                    ) !== "N/A"
                      ? `${
                          image.ocr_reading_result_2.reading_2
                        } (${formatConfidence(
                          image.ocr_reading_result_2.confidence_2
                        )})`
                      : ""}
                  </p>

                  {/* Meter Serial Number */}
                  <p>
                    <span className="detail-label">Parameter:</span>{" "}
                    {image.ocr_reading_result_2.label !== "UNKNOWN"
                      ? image.ocr_reading_result_2.label
                      : ""}
                  </p>
                  <p>
                    <span className="detail-label">Meter Serial:</span>{" "}
                    {image.serial_number_result.reading !== "NOT_FOUND"
                      ? image.serial_number_result.reading
                      : ""}
                  </p>

                  {/* Is Image a Spoof */}
                  <p>
                    <span className="detail-label">Is Image a Spoof:</span>{" "}
                    {image.spoof_result.result === "Spoofed"
                      ? `Yes (${image.spoof_result.confidence_score}%)`
                      : `No (${image.spoof_result.confidence_score}%)`}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
        <Pagination
          imagesPerPage={imagesPerPage}
          totalImages={images.length}
          paginate={paginate}
          currentPage={currentPage}
          totalPages={totalPages} // Pass totalPages
        />

        {images.length > 0 && (
          <div className="processed-count">
            Processed {processedCount} of {totalImages} images
          </div>
        )}
      </section>
    </div>
  );
}

const Pagination = ({
  imagesPerPage,
  totalImages,
  paginate,
  currentPage,
  totalPages,
}) => {
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalImages / imagesPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <nav>
      <ul className="pagination">
        <li className="page-item">
          <a
            onClick={() =>
              paginate(currentPage > 1 ? currentPage - 1 : currentPage)
            }
            href="#"
            className="page-link"
          >
            Previous
          </a>
        </li>
        {pageNumbers.map((number) => (
          <li
            key={number}
            className={`page-item ${currentPage === number ? "active" : ""}`}
          >
            <a onClick={() => paginate(number)} href="#" className="page-link">
              {number}
            </a>
          </li>
        ))}
        <li className="page-item">
          <a
            onClick={() =>
              paginate(currentPage < totalPages ? currentPage + 1 : currentPage)
            }
            href="#"
            className="page-link"
          >
            Next
          </a>
        </li>
      </ul>
    </nav>
  );
};
