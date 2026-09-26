const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// Database connection pool for XAMPP MariaDB
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // Standard XAMPP root has no password by default
    database: 'library_db',
    waitForConnections: true,
    connectionLimit: 10
});

// Root welcome route
app.get('/', (req, res) => {
    res.json({ message: 'City Central Library REST API is running.' });
});

// 1. GET /books - Retrieve all books (sp_get_all_books)
app.get('/books', async (req, res) => {
    try {
        const [results] = await pool.query('CALL sp_get_all_books()');
        res.status(200).json({ success: true, books: results[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. GET /books/:id - Retrieve a single book by ID (sp_get_book_by_id)
app.get('/books/:id', async (req, res) => {
    try {
        const bookId = parseInt(req.params.id);
        const [results] = await pool.query('CALL sp_get_book_by_id(?)', [bookId]);
        if (results[0].length === 0) {
            return res.status(404).json({ success: false, message: 'Book not found' });
        }
        res.status(200).json({ success: true, book: results[0][0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 3. GET /categories/:id/count - Count books by category (sp_count_books_by_category)
app.get('/categories/:id/count', async (req, res) => {
    const conn = await pool.getConnection();
    try {
        const categoryId = parseInt(req.params.id);
        await conn.query('CALL sp_count_books_by_category(?, @total)', [categoryId]);
        const [rows] = await conn.query('SELECT @total AS total_books');
        res.status(200).json({ success: true, category_id: categoryId, total_books: rows[0].total_books });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    } finally {
        conn.release();
    }
});

// 4. GET /borrowings/active - Get currently borrowed books (sp_get_currently_borrowed_books)
app.get('/borrowings/active', async (req, res) => {
    try {
        const [results] = await pool.query('CALL sp_get_currently_borrowed_books()');
        res.status(200).json({ success: true, active_borrowings: results[0] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 5. POST /borrowings - Borrow a book using explicit transaction (sp_borrow_book)
app.post('/borrowings', async (req, res) => {
    const { book_id, member_id, borrow_date } = req.body;
    try {
        await pool.query('CALL sp_borrow_book(?, ?, ?)', [book_id, member_id, borrow_date]);
        res.status(201).json({ success: true, message: 'Book borrowed successfully.' });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});