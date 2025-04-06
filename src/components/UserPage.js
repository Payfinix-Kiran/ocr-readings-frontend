import React, { useState, useEffect } from "react";
import { getImages, submitReading } from "../api";
import "../UserPage.css";

const UserPage = () => {
  const [images, setImages] = useState([]);
  const [readings, setReadings] = useState({});
  const [remarks, setRemarks] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalImages, setTotalImages] = useState(0);
  const [perPage, setPerPage] = useState(10);

  const fetchAssignedImages = async (page = 1, perPage = 12) => {
    try {
      setLoading(true);

      const response = await getImages({ page, per_page: perPage });

      const {
        images = [],
        pages = 0,
        current_page = 1,
        per_page = perPage,
        total = 0,
      } = response.data || {};

      const defaultRemarks = images.reduce((acc, image) => {
        acc[image.id] = "clear";
        return acc;
      }, {});

      setImages(images);
      setTotalPages(pages);
      setCurrentPage(current_page);
      setTotalImages(total);
      setRemarks(defaultRemarks);
      setPerPage(per_page);
      setMessage("Images are loading, please wait...");
      setLoading(false);
    } catch (error) {
      console.error("Error fetching images:", error);

      setMessage(
        error.response?.status === 401
          ? "Unauthorized access. Please login again."
          : "Something went wrong, please try again later."
      );

      setTimeout(() => setMessage(null), 3000);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignedImages();
  }, []);

  const handleReadingChange = (id, value) => {
    setReadings((prevReadings) => ({
      ...prevReadings,
      [id]: value,
    }));
  };

  const handleRemarkChange = (id) => {
    setRemarks((prevRemarks) => ({
      ...prevRemarks,
      [id]: prevRemarks[id] === "unclear" ? "clear" : "unclear",
    }));
  };

  const handleSubmitReading = async (id) => {
    const reading = readings[id];
    const remark = remarks[id];
    console.log("Remark:", remark);
    if (!reading) return;

    try {
      await submitReading({ id, reading, remark });
      setImages((prevImages) =>
        prevImages.map((image) =>
          image.id === id ? { ...image, reading } : image
        )
      );
      setReadings((prevReadings) => {
        const updatedReadings = { ...prevReadings };
        delete updatedReadings[id];
        return updatedReadings;
      });

      setRemarks((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleKeyDown = (e, id, index) => {
    if (e.key === "Enter") {
      handleSubmitReading(id);

      const nextImage = images[index + 1];
      if (nextImage && document.getElementById(`input-${nextImage.id}`)) {
        document.getElementById(`input-${nextImage.id}`).focus();
      }
    }
  };

  const openModal = (image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    window.location.href = "/login";
  };

  const handleRefresh = () => {
    fetchAssignedImages();
  };

  return (
    <div className="user-page-container">
      <h2 className="uploaded-title">Assigned Images - {totalImages}</h2>
      {loading ? (
        <div className="loading-message">{message}</div>
      ) : (
        <div className="image-grid">
          {images.map((image, index) => (
            <div key={image.id} className="image-card">
              <img
                className="image-preview"
                src={`data:image/jpeg;base64,${image.image_data}`}
                alt="Uploaded"
                onClick={() => openModal(image)}
              />
              <div className="image-details">
                {image.reading === "Processing" ? (
                  <div>
                    <input
                      id={`input-${image.id}`}
                      type="text"
                      value={readings[image.id] || ""}
                      onChange={(e) =>
                        handleReadingChange(image.id, e.target.value)
                      }
                      onKeyDown={(e) => handleKeyDown(e, image.id, index)}
                      placeholder="Enter OCR reading"
                      className="reading-input"
                      tabIndex={index + 1}
                    />
                    <div className="remark-section">
                      <div className="checkbox-group">
                        <label>
                          <input
                            type="checkbox"
                            checked={remarks[image.id] === "unclear"}
                            onChange={() =>
                              handleRemarkChange(
                                image.id,
                                remarks[image.id] === "unclear"
                                  ? "clear"
                                  : "unclear"
                              )
                            }
                          />
                          Unclear
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>Reading: {image.reading}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="modal" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <img
              className="zoomed-image"
              src={`data:image/jpeg;base64,${selectedImage.image_data}`}
              alt="Zoomed"
            />
            <button className="close-modal" onClick={closeModal}>
              ×
            </button>
          </div>
        </div>
      )}

      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => fetchAssignedImages(currentPage - 1, perPage)}
        >
          Previous
        </button>
        <span>
          Page {currentPage} of {totalPages}
        </span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => fetchAssignedImages(currentPage + 1, perPage)}
        >
          Next
        </button>
      </div>

      <div className="button-group">
        <button onClick={handleRefresh} className="refresh-button">
          Refresh
        </button>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
};

export default UserPage;
