import React, { useEffect, useState } from "react";
import "./App.css";

const App = () => {
  const [file, setFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info"); // "success" | "error" | "info"
  const [loading, setLoading] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/documents");
      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Failed to load documents");
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!file) {
      setMessageType("error");
      setMessage("Please select a PDF file to upload.");
      return;
    }

    if (file.type !== "application/pdf") {
      setMessageType("error");
      setMessage("Only PDF files are allowed.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const res = await fetch("/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.error || "Upload failed.");
        return;
      }

      setMessageType("success");
      setMessage("File uploaded successfully.");
      setFile(null);
      const input = document.getElementById("fileInput");
      if (input) input.value = "";
      fetchDocuments();
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (id) => {
    window.location.href = `/documents/${id}`;
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/documents/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        setMessageType("error");
        setMessage(data.error || "Delete failed.");
        return;
      }

      setMessageType("success");
      setMessage("Document deleted.");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      setMessageType("error");
      setMessage("Delete failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-root">
      <div className="app-gradient" />

      <main className="app-container">
        <header className="app-header">
          <div>
            <h1>Patient Document Portal</h1>
            <p>
              Securely upload, view, download, and delete your medical PDF documents.
            </p>
          </div>
          <div className="badge">Single User</div>
        </header>

        <section className="card upload-card">
          <div className="card-header">
            <h2>Upload Document</h2>
            <span className="hint-text">Only PDF files • Max size 10MB</span>
          </div>

          <form onSubmit={handleUpload} className="upload-form">
            <label htmlFor="fileInput" className="file-input-label">
              <span className="file-input-text">
                {file ? file.name : "Choose a PDF file"}
              </span>
              <span className="file-input-button">Browse</span>
              <input
                id="fileInput"
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
              />
            </label>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? "Processing..." : "Upload"}
            </button>
          </form>
        </section>

        {message && (
          <div className={`alert alert-${messageType}`}>
            {message}
          </div>
        )}

        <section className="card documents-card">
          <div className="card-header">
            <h2>Uploaded Documents</h2>
            <span className="hint-text">
              Total: {documents.length} {documents.length === 1 ? "file" : "files"}
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="empty-state">
              <p>No documents uploaded yet.</p>
              <span className="empty-subtext">
                Upload your first PDF using the form above.
              </span>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="docs-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Filename</th>
                    <th>Size</th>
                    <th>Uploaded At</th>
                    <th className="actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>#{doc.id}</td>
                      <td className="filename-cell" title={doc.filename}>
                        {doc.filename}
                      </td>
                      <td>{(doc.filesize / 1024).toFixed(2)} KB</td>
                      <td>{new Date(doc.created_at).toLocaleString()}</td>
                      <td className="actions-col">
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleDownload(doc.id)}
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => handleDelete(doc.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <footer className="app-footer">
          <span>Full Stack Assessment • Patient Document Portal</span>
        </footer>
      </main>
    </div>
  );
};

export default App;
