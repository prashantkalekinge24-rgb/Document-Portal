# Patient Document Portal

A simple full-stack application where a single user can upload, view, download, and delete medical PDF documents
(prescriptions, test results, referral notes, etc.).

This project implements all requirements from the **Full Stack Developer Assessment – Entry Level**:

- Frontend with:
  - Form to upload a PDF file
  - List of all uploaded files
  - Download and delete buttons for each file
  - Success / error messages
- Backend with:
  - REST APIs to upload, list, download, and delete files
  - Local file storage in an `uploads/` folder
  - Metadata persisted to a database
- Database:
  - SQLite, with a `documents` table:
    - `id`, `filename`, `filepath`, `filesize`, `created_at`

For detailed design decisions and API specifications, see **design.md**.

---

## Tech Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Database:** SQLite
- **File Storage:** Local `backend/uploads/` folder

---

## How to Run Locally

Clone or extract this repository, then open a terminal in the project root.

### 1. Start the Backend

```bash
cd backend
npm install
npm start
```

- Backend will run on: `http://localhost:4000`
- It will automatically:
  - Create `backend/uploads/` if it does not exist
  - Create `documents.db` SQLite database and the `documents` table

### 2. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

- Frontend will run on: `http://localhost:5173`
- Vite dev server is configured to proxy `/documents` API calls to `http://localhost:4000`.

---

## Example API Calls (curl)

These assume the backend is running on `http://localhost:4000`.

### 1. Upload a PDF

```bash
curl -X POST http://localhost:4000/documents/upload \
  -F "file=@/absolute/path/to/your/file.pdf"
```

### 2. List All Documents

```bash
curl http://localhost:4000/documents
```

### 3. Download a Document by ID

```bash
curl -O http://localhost:4000/documents/1
```

### 4. Delete a Document by ID

```bash
curl -X DELETE http://localhost:4000/documents/1
```

---

## Folder Structure

```text
.
├─ design.md          # Design document (Part 1)
├─ README.md          # Project overview & run instructions
├─ backend/           # Backend API and file handling
│  ├─ server.js
│  ├─ db.js
│  ├─ package.json
│  ├─ documents.db    # Created at runtime
│  └─ uploads/        # Created at runtime; stores uploaded PDFs
└─ frontend/          # React + Vite frontend
   ├─ index.html
   ├─ vite.config.js
   ├─ package.json
   └─ src/
      ├─ main.jsx
      └─ App.jsx
```

---

## Notes

- No authentication is implemented (as per the assignment, assume a single user).
- Only PDF files up to 10 MB are accepted.
- If the database record exists but the file is missing on disk, the backend returns a `410` error.
