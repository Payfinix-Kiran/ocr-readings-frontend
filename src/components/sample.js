import React, { useState, useEffect, useCallback } from "react";
import JSZip from "jszip";
// import { Player } from "@lottiefiles/react-lottie-player";
import {
  uploadImages,
  getUploadedImages,
  deleteImages,
  downloadResult,
} from "../api";
import "../Dashboard.css";
import { saveAs } from "file-saver";

const Dashboard = () => {
  const [files, setFiles] = useState(null);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [modalMessage, setModalMessage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  // const [timer, setTimer] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // useEffect(() => {
  //   if (isFetching) {
  //     const id = setInterval(() => {
  //       setTimer((prev) => prev + 1);
  //     }, 1000);

  //     return () => {
  //       clearInterval(id);
  //     };
  //   } else {
  //     setTimer(0);
  //   }
  // }, [isFetching]);

  // const formatTime = (timeInSeconds) => {
  //   const hours = String(Math.floor(timeInSeconds / 3600)).padStart(2, "0");
  //   const minutes = String(Math.floor((timeInSeconds % 3600) / 60)).padStart(
  //     2,
  //     "0"
  //   );
  //   const seconds = String(timeInSeconds % 60).padStart(2, "0");
  //   return `${hours}:${minutes}:${seconds}`;
  // };

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!files) return;

    setModalMessage("Processing and Uploading Images...");
    setIsProcessing(true);
    const zipFile = files[0];

    if (!zipFile) {
      setModalMessage("No file selected.");
      setTimeout(() => setModalMessage(null), 3000);
      return;
    }

    try {
      const zip = await JSZip.loadAsync(zipFile);
      const imageFiles = Object.keys(zip.files).filter(
        (filename) =>
          filename.toLowerCase().endsWith(".png") ||
          filename.toLowerCase().endsWith(".jpg") ||
          filename.toLowerCase().endsWith(".jpeg") ||
          filename.toLowerCase().endsWith(".gif")
      );

      if (imageFiles.length === 0) {
        setModalMessage("No valid image files found in ZIP.");
        setTimeout(() => setModalMessage(null), 3000);
        return;
      }

      const CHUNK_SIZE = 10;
      for (let i = 0; i < imageFiles.length; i += CHUNK_SIZE) {
        setModalMessage(
          `Uploading chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(
            imageFiles.length / CHUNK_SIZE
          )}...`
        );

        const chunkZip = new JSZip();
        const chunkFiles = imageFiles.slice(i, i + CHUNK_SIZE);

        for (const filename of chunkFiles) {
          const fileData = await zip.file(filename).async("blob");
          chunkZip.file(filename, fileData);
        }

        const chunkBlob = await chunkZip.generateAsync({ type: "blob" });
        const formData = new FormData();
        formData.append("file", chunkBlob, `chunk_${i / CHUNK_SIZE + 1}.zip`);

        await uploadImages(formData);
      }

      setModalMessage("All images uploaded successfully!");
      setTimeout(() => setModalMessage(null), 3000);
      setIsFetching(true);
      fetchUploadedImages();
    } catch (error) {
      console.error(error);
      setModalMessage("Upload Failed. Please try again.");
      setTimeout(() => setModalMessage(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const fetchUploadedImages = useCallback(async (page = 1, perPage = 12) => {
    try {
      setModalMessage("Loading");
      const response = await getUploadedImages({ page, per_page: perPage });
      const { images, pages, current_page, per_page, all_processed, total } =
        response.data;

      if (!all_processed) {
        setTimeout(() => {
          fetchUploadedImages(page, perPage);
        }, 3000);
        setIsFetching(true);
        setModalMessage(null);
      } else {
        setUploadedImages(images);
        setTotalPages(pages);
        setCurrentPage(current_page);
        setTotalImages(total);
        setPerPage(per_page);
        setIsFetching(false);
        setIsProcessing(false);
        setModalMessage(null);
      }
    } catch (error) {
      console.error(error);
      setIsFetching(false);
      setModalMessage("Something went wrong.Please login again!");
      setTimeout(() => setModalMessage(null), 3000);
    }
  }, []);

  useEffect(() => {
    fetchUploadedImages();
  }, [fetchUploadedImages]);

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  const handleDownload = async () => {
    try {
      setModalMessage("Preparing your download...");
      const response = await downloadResult();

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, "SujanixPrivateLimited_Evaluation_Results.xlsx");

      console.log(
        "File saved as SujanixPrivateLimited_Evaluation_Results.xlsx"
      );
      setModalMessage("Download complete!");

      setTimeout(() => setModalMessage(null), 3000);
    } catch (error) {
      console.error(
        "Error downloading SujanixPrivateLimited_Evaluation_Results:",
        error
      );
      setModalMessage("An error occurred. Please try again.");
      setTimeout(() => setModalMessage(null), 3000);
    }
  };

  const closeModal = () => setModalImage(null);

  const handleRevoke = async () => {
    try {
      setModalMessage("Clearing all images...");
      const response = await deleteImages();

      console.log("data", response.data);
      if (response.ok) {
        setModalMessage("All images have been cleared successfully!");
        setTotalPages(1);
        setCurrentPage(1);
        setPerPage(10);
        setUploadedImages([]);
      } else {
        setModalMessage(response.data.message || "Failed to revoke images.");
        setTotalPages(1);
        setCurrentPage(1);
        setPerPage(10);
        setUploadedImages([]);
      }

      setTimeout(() => setModalMessage(null), 3000);
    } catch (error) {
      console.error("Error revoking images:", error);
      setModalMessage("An error occurred. Please try again.");
      setTimeout(() => setModalMessage(null), 3000);
    }
  };

  const handleRefresh = () => {
    fetchUploadedImages();
  };

  return (
    <div className="dashboard-container">
      <div className="upload-section">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="file-input"
        />
        <button onClick={handleUpload} className="upload-button">
          Upload Images
        </button>
      </div>

      {!isProcessing && uploadedImages.length > 0 && (
        <>
          <h2 className="uploaded-title">Uploaded Images - {totalImages}</h2>
          <div className="image-grid">
            {uploadedImages.map((image) => (
              <div key={image.id} className="image-card">
                <img
                  src={`data:image/jpeg;base64,${image.image_data}`}
                  alt="Uploaded"
                  className="image-thumbnail"
                  onClick={() => setModalImage(image)}
                />
                <p className="image-status">
                  {image.reading === "Processing"
                    ? "Processing"
                    : `OCR Reading : ${image.reading}`}{" "}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {modalMessage && (
        <div className="modal">
          <div className="modal-content">
            <p>{modalMessage}</p>
          </div>
        </div>
      )}

      {isFetching && (
        <div className="modal">
          <div className="modal-content">
            <p>Images are Processing</p>
          </div>
        </div>
      )}

      {modalImage && (
        <div className="modal">
          <div className="modal-content">
            <button className="close-modal" onClick={closeModal}>
              ×
            </button>
            <img
              src={`data:image/jpeg;base64,${modalImage.image_data}`}
              alt="Zoomed"
              className="zoomed-image"
            />
          </div>
        </div>
      )}

      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => fetchUploadedImages(currentPage - 1, perPage)}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => fetchUploadedImages(currentPage + 1, perPage)}
        >
          Next
        </button>
      </div>

      <div className="button-group">
        <button onClick={handleRefresh} className="refresh-button">
          Refresh
        </button>
        <button onClick={handleRevoke} className="revoke-button">
          Clear Images
        </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
        <button onClick={handleDownload} className="download-button">
          Download Results
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
