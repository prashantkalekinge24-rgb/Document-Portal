import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import db from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer setup for PDF uploads only
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${timestamp}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Routes

// Health check (optional)
app.get("/", (req, res) => {
  res.json({ message: "Backend is running" });
});

// POST /documents/upload
app.post("/documents/upload", (req, res) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large (max 10MB)" });
      }
      return res.status(400).json({ error: err.message });
    } else if (err) {
      // Other errors (e.g., invalid file type)
      return res.status(400).json({ error: err.message || "Upload error" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { filename, path: filepath, size } = req.file;
    const createdAt = new Date().toISOString();

    const sql = `
      INSERT INTO documents (filename, filepath, filesize, created_at)
      VALUES (?, ?, ?, ?)
    `;
    db.run(sql, [filename, filepath, size, createdAt], function (dbErr) {
      if (dbErr) {
        console.error("DB insert error:", dbErr);
        return res.status(500).json({ error: "Database error" });
      }

      const document = {
        id: this.lastID,
        filename,
        filepath,
        filesize: size,
        created_at: createdAt,
      };

      res.json({ message: "File uploaded successfully", document });
    });
  });
});

// GET /documents
app.get("/documents", (req, res) => {
  const sql = "SELECT id, filename, filesize, created_at FROM documents ORDER BY created_at DESC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error("DB select error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// GET /documents/:id (download)
app.get("/documents/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM documents WHERE id = ?";

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error("DB select error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (!row) {
      return res.status(404).json({ error: "Document not found" });
    }

    const filePath = row.filepath;
    if (!fs.existsSync(filePath)) {
      return res.status(410).json({ error: "File missing on server" });
    }

    res.download(filePath, row.filename, (downloadErr) => {
      if (downloadErr) {
        console.error("Download error:", downloadErr);
        if (!res.headersSent) {
          res.status(500).json({ error: "File download failed" });
        }
      }
    });
  });
});

// DELETE /documents/:id
app.delete("/documents/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM documents WHERE id = ?";

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error("DB select error:", err);
      return res.status(500).json({ error: "Database error" });
    }
    if (!row) {
      return res.status(404).json({ error: "Document not found" });
    }

    const filePath = row.filepath;
    fs.unlink(filePath, (fsErr) => {
      if (fsErr && fsErr.code !== "ENOENT") {
        console.error("File delete error:", fsErr);
        return res.status(500).json({ error: "Failed to delete file" });
      }

      db.run("DELETE FROM documents WHERE id = ?", [id], function (delErr) {
        if (delErr) {
          console.error("DB delete error:", delErr);
          return res.status(500).json({ error: "Database error" });
        }

        res.json({ message: "Document deleted successfully" });
      });
    });
  });
});

// Fallback 404 for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
