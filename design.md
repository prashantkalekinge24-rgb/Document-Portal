# Full Stack Developer Intern – Patient Document Portal

This document answers all questions from **Part 1: Design Document** of the assignment.

## 1. Tech Stack Choices

### Q1. What frontend framework did you use and why?

**Choice:** React (with Vite)

**Reasons:**
- Component-based architecture makes it easy to build reusable UI elements like the upload form and document list.
- Large ecosystem and community support.
- Vite gives a fast dev server and simple setup for a small app like this.
- Easy integration with REST APIs via `fetch` or `axios`.

---

### Q2. What backend framework did you choose and why?

**Choice:** Node.js with Express

**Reasons:**
- Minimal and flexible framework, ideal for building REST APIs quickly.
- Great ecosystem for file uploads (`multer`), database drivers, and middleware.
- Same language (JavaScript) on frontend and backend -> easier developer experience and potential to share types/interfaces.

---

### Q3. What database did you choose and why?

**Choice:** SQLite

**Reasons:**
- Lightweight, file-based database – perfect for a local, single-user or low-traffic app.
- No separate database server required; easy to set up and run anywhere.
- Supports SQL and basic relational features (ids, timestamps, etc.).
- Fits the requirement of “SQLite, PostgreSQL, or similar” while keeping setup simple.

(For a real production multi-user system, PostgreSQL would be preferred.)

---

### Q4. If you were to support 1,000 users, what changes would you consider?

For 1,000 users (and beyond), I would consider:

1. **Database**
   - Move from SQLite to PostgreSQL or MySQL for better concurrency, scalability, and hosting options.
   - Add proper indexing (e.g., on `id`, `created_at`).

2. **File Storage**
   - Move from local `uploads/` folder to cloud storage (e.g., AWS S3, GCP Storage, Azure Blob).
   - Store only file URLs/keys in the DB, not physical paths.

3. **Security & Authentication**
   - Implement proper user authentication (JWT or session-based).
   - Each document row tied to a `user_id` and access control checks on each request.

4. **Architecture / Performance**
   - Separate frontend and backend deployments.
   - Use a reverse proxy (e.g., Nginx) for load balancing if needed.
   - Add request rate limiting and logging/monitoring.

5. **Reliability**
   - Regular backups of database and storage.
   - Environment-based configurations (dev / stage / prod).

---

## 2. Architecture Overview

### 2.1 Component Overview

- **Frontend (React App)**
  - Shows upload form (PDF only).
  - Lists all documents.
  - Allows downloading and deleting documents.
  - Displays success/error messages.

- **Backend (Express API)**
  - Exposes REST endpoints:
    - `POST /documents/upload`
    - `GET /documents`
    - `GET /documents/:id`
    - `DELETE /documents/:id`
  - Stores files into local `uploads/` folder.
  - Stores metadata in SQLite database.

- **Database (SQLite)**
  - Single `documents` table:
    - `id`, `filename`, `filepath`, `filesize`, `created_at`.

- **File Storage**
  - Local folder: `backend/uploads/`.

### 2.2 Flow Description

1. User interacts with React UI in the browser.
2. React app sends HTTP requests to Express backend.
3. Backend:
   - For uploads: uses `multer` to receive PDF -> saves file to `uploads/`.
   - Inserts file metadata into SQLite DB.
4. For listing: backend reads metadata from DB and returns JSON.
5. For download: backend reads file from `uploads/` and streams it to the client.
6. For delete: backend deletes file from disk and removes metadata from DB.

---

## 3. API Specification

For each required endpoint, here are the URL, method, sample requests/responses, and a short description.

### 3.1 `POST /documents/upload`

- **URL:** `/documents/upload`
- **Method:** `POST`
- **Description:** Upload a PDF file and store its metadata.

**Sample Request (curl):**
```bash
curl -X POST http://localhost:4000/documents/upload \
  -F "file=@/path/to/file.pdf"
```

**Sample Success Response (200):**
```json
{
  "message": "File uploaded successfully",
  "document": {
    "id": 1,
    "filename": "report.pdf",
    "filepath": "backend/uploads/1694523456-report.pdf",
    "filesize": 123456,
    "created_at": "2025-12-09T10:30:00.000Z"
  }
}
```

**Sample Error Response (400):**
```json
{
  "error": "Only PDF files are allowed"
}
```

---

### 3.2 `GET /documents`

- **URL:** `/documents`
- **Method:** `GET`
- **Description:** List all uploaded documents with basic metadata.

**Sample Request:**
```bash
curl http://localhost:4000/documents
```

**Sample Success Response (200):**
```json
[
  {
    "id": 1,
    "filename": "report.pdf",
    "filesize": 123456,
    "created_at": "2025-12-09T10:30:00.000Z"
  },
  {
    "id": 2,
    "filename": "prescription.pdf",
    "filesize": 45678,
    "created_at": "2025-12-09T11:00:00.000Z"
  }
]
```

---

### 3.3 `GET /documents/:id`

- **URL:** `/documents/:id`
- **Method:** `GET`
- **Description:** Download a specific document by its id.

**Sample Request:**
```bash
curl -O http://localhost:4000/documents/1
```

**Typical Success Response:**
- Binary PDF data with headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="report.pdf"`

**Sample Error Response (404):**
```json
{
  "error": "Document not found"
}
```

---

### 3.4 `DELETE /documents/:id`

- **URL:** `/documents/:id`
- **Method:** `DELETE`
- **Description:** Delete a specific document by its id.

**Sample Request:**
```bash
curl -X DELETE http://localhost:4000/documents/1
```

**Sample Success Response (200):**
```json
{
  "message": "Document deleted successfully"
}
```

**Sample Error Response (404):**
```json
{
  "error": "Document not found"
}
```

---

## 4. Data Flow Description (Q5)

### When a File Is Uploaded

1. The user selects a PDF file in the frontend form and clicks **Upload**.
2. The React app validates that:
   - A file is selected.
   - The file type is `application/pdf`.
3. The React app sends a `POST /documents/upload` request with `multipart/form-data` containing the file in the `file` field.
4. The Express backend receives the request and `multer`:
   - Checks the MIME type and rejects non-PDF files.
   - Saves the file to `backend/uploads/` with a unique timestamp-based name.
5. After saving, the backend extracts:
   - `filename` (saved name),
   - `filepath` (full path on disk),
   - `filesize` (in bytes),
   - `created_at` (current timestamp).
6. The backend inserts a row into the SQLite `documents` table with this data.
7. On success, the backend returns a JSON response with a success message and the stored document metadata.
8. The frontend shows a success message and refreshes the documents list by calling `GET /documents`.

### When a File Is Downloaded

1. The user clicks **Download** beside a document in the list.
2. The React app triggers a `GET /documents/:id` request (navigates the browser to that URL).
3. The backend queries the `documents` table for the given `id`.
4. If a matching row is found:
   - It reads the `filepath` from the database.
   - Uses `res.download(filePath, filename)` to stream the file to the client.
5. The browser receives the binary response and either:
   - Downloads the PDF, or
   - Opens it in a PDF viewer (depending on browser settings).
6. If no row is found for the id, the backend returns a 404 JSON error: `{ "error": "Document not found" }`.
7. If the DB row exists but the file is missing from disk, the backend returns a 410 JSON error: `{ "error": "File missing on server" }`.

---

## 5. Assumptions (Q6)

- **Single User Only**
  - As per the assignment, there is no authentication or user login. The application assumes a single logical user.

- **File Type**
  - Only PDF files are allowed. Validation is done:
    - On the frontend (checks `file.type === "application/pdf"`),
    - On the backend (checks `file.mimetype` in `multer`’s `fileFilter`).

- **File Size Limit**
  - Maximum file size is limited to **10 MB** via the `multer` configuration.

- **Concurrency & Scale**
  - SQLite’s default locking is sufficient for this small, local assignment.
  - For multiple users or higher concurrency, a stronger RDBMS like PostgreSQL would be recommended.

- **Error Handling**
  - Basic error messages are returned as JSON from the backend and displayed in the frontend.
  - No advanced logging / monitoring is implemented for this assignment.

- **Environment**
  - Application runs locally on a developer machine.
  - Backend is assumed to run on `http://localhost:4000`.
  - Frontend runs on `http://localhost:5173` and uses Vite’s dev server proxy to talk to the backend.
