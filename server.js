import express from "express"; // สร้างเว็บเซิร์ฟเวอร์
import path from "path";
import { fileURLToPath } from 'url'; // สำหรับการจัดการ Path ใน ES Module
import session from "express-session"; // เก็บสถานะของผู้ใช้
import bcrypt from "bcrypt"; // ไลบรารีสำหรับ hashing รหัสผ่าน
import nodemailer from "nodemailer"; // ไลบรารีส่งอีเมล
import db from "./db.js";
import axios from "axios";
import multer from 'multer';


const app = express();
const upload = multer({ dest: 'public/uploads/' });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 


// ================== VIEW ENGINE ==================
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
// บอกให้ Express ใช้ไฟล์ ejs แสดงหน้าเว็บ

// 💡 เพิ่มการตั้งค่า Cache สำหรับ EJS
app.set('view cache', false); // 🚨 ปิดแคช EJS ชั่วคราวในการพัฒนา

// ================== MIDDLEWARE ==================
app.use(express.urlencoded({ extended: true })); 
app.use(express.static("public")); // เปิดให้ใช้ไฟล์ static ในโฟลเดอร์ public
app.use(
  session({
    secret: "moonlitsecret", 
    resave: false,
    saveUninitialized: true, 
  })
);
app.use(express.json()); 

// ตรวจสอบการ Login
function requireLogin(req, res, next) { 
  const allowed = ["/", "/login", "/register", "/forgot", "/contact"];
  if (!req.session.user && !allowed.includes(req.path)) {
    return res.redirect("/login");
  }
  next();
}
app.use(requireLogin);

// ================== BOOK SEARCH FETCHER (API ONLY) ==================
async function searchOpenLibraryBooks(query) { 
    const OL_API_URL = "https://openlibrary.org/search.json"; //เรียกข้อมูลหนังสือจาก Open Library API
    const encodedQuery = encodeURIComponent(query); //เข้ารหัส (Encode)

    try {
        const response = await axios.get(`${OL_API_URL}?q=${encodedQuery}&limit=30`);
        
        const rawDocs = response.data.docs;//Array ของผลลัพธ์การค้นหา
        const books = [];

        if (rawDocs && rawDocs.length > 0) {
            
            // ⭐️ ขั้นตอนที่ 1: กรอง (Filter) เฉพาะหนังสือที่มี cover_i ⭐️
            const filteredDocs = rawDocs.filter(doc => doc.cover_i);

            // ⭐️ ขั้นตอนที่ 2: Map ข้อมูลที่ผ่านการกรองแล้ว ⭐️
            filteredDocs.forEach(doc => {
                
                books.push({
                    id: doc.cover_edition_key || doc.edition_key?.[0], 
                    title: doc.title || 'Unknown Title',
                    author: doc.author_name?.join(', ') || 'ไม่ระบุ',
                    publisher: doc.publisher?.[0] || 'ไม่ระบุ',
                    description: 'ข้อมูลจาก Open Library', 
                    category: doc.subject?.[0] || 'ไม่ระบุ', 
            
                    cover_image: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`, 
                    isbn: doc.isbn?.[0] || null //ค่า (Value) ที่ถูกส่งผ่าน API (เช่น doc.isbn?.[0])
                });
            });
        }
        return books; 
    } catch (error) {
        console.error("Error searching Open Library data:", error.message);
        return []; 
    }
}
// ================== ROUTES HOME ==================
app.get("/", (req, res) => {
res.render("index", { 
      user: req.session.user, 
      title: "หน้าหลัก | MOONLITPAGE"  // 💡 เพิ่ม title
  });
});

// ================== ROUTES CONTACT ==================
app.get('/contact', (req, res) => {
    res.render('contact', {
        title: "ติดต่อเรา | MOONLITPAGE",
        user: req.session.user
    });
});

app.post('/contact', (req, res) => {
    console.log(req.body);
    res.redirect('/contact'); 
});

// ================== ROUTES LOGIN ==================
app.get("/login", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("login", { message: null });
});

// ตรวจสอบ Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body; 

  try {
    const [rows] = await db.query("SELECT * FROM Member WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.render("login", { message: "ไม่พบบัญชีผู้ใช้นี้" });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.render("login", { message: "รหัสผ่านไม่ถูกต้อง" });
    }

    req.session.user = user; 
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.send("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
  }
});

// ================== ROUTES REGISTER ==================
app.get("/register", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("register", { message: null });
});

app.post("/register", async (req, res) => {
  const { username, phone, email, password } = req.body;
  if (!username || !phone || !email || !password) {
    return res.render("register", { message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
  }

  try {
    const [rows] = await db.query("SELECT * FROM Member WHERE email = ?", [email]);
    if (rows.length > 0) {
      return res.render("register", { message: "อีเมลนี้มีอยู่ในระบบแล้ว" });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO Member (username, phone, email, password) VALUES (?, ?, ?, ?)",
      [username, phone, email, hash] 
    );

    res.render("login", { message: "สมัครสมาชิกสำเร็จ! โปรดเข้าสู่ระบบ" });
  } catch (err) {
    console.error("Register Error:", err);
    res.send("เกิดข้อผิดพลาดในการสมัครสมาชิก");
  }
});

// ================== ROUTES BOOK ==================
app.get("/book", async (req, res) => {
  const searchQuery = (req.query.q || 'new releases').trim();  
  //(Whitespace) ที่อยู่ด้านหน้าและด้านหลัง ของสตริง (String

  
  try {
    const books = await searchOpenLibraryBooks(searchQuery);

    //const totalBooks = books.length > 0 ? 100 : 0; 
    //const totalPages = Math.ceil(totalBooks / limit);
    
  res.render("book", {
    title: "ค้นหาหนังสือ | MOONLITPAGE", // 💡 แก้ไข title
    books: books,
    user: req.session.user,
    searchQuery: searchQuery,
    // currentPage: page,     
    // totalPages: totalPages
  });
  } catch (err) {
    console.error("Book Route Error:", err);
    res.send("เกิดข้อผิดพลาดในการโหลดหนังสือจาก Open Library");
  }
});

// ================== ROUTES FEED ==================
// ในไฟล์ server.js (แก้ไข Route /feed)

app.get("/feed", async (req, res) => {
    try {
        // 1. ดึงโพสต์ล่าสุดจากตาราง FeedPost
        const [postRows] = await db.query(
            `SELECT 
    fp.*, 
    m.username_display, 
    m.profile_pic_url,
    m.username,
    fp.post_id
FROM FeedPost fp 
JOIN Member m ON fp.member_email = m.email 
ORDER BY fp.like_count DESC, fp.created_at DESC 
LIMIT 50`
        );

        // 2. ดึงข้อมูลชั้นหนังสือของผู้ใช้ (สำหรับ Modal)
        let bookshelf = [];
        if (req.session.user) {
            const memberEmail = req.session.user.email;
            const [shelfRows] = await db.query("SELECT * FROM BookShelf WHERE member_email = ? ORDER BY date_added DESC", [memberEmail]);
            bookshelf = shelfRows;
        }

        // 3. ดึงชื่อหนังสือ, สถานะ Like, และจำนวน Like สำหรับโพสต์
        const postsWithBookInfo = await Promise.all(postRows.map(async (post) => {
            // ดึงจำนวน Comment เท่านั้น (เพราะ Like Count ถูกดึงมาแล้วใน Query หลัก)
            const [commentCountRows] = await db.query("SELECT COUNT(*) AS count FROM Comment WHERE post_id = ?", [post.post_id]);
            const commentCount = commentCountRows[0].count;
            
            // ดึงรายการ Comment ล่าสุดสำหรับ Modal
            const [comments] = await db.query(
                `SELECT c.*, m.username_display, m.username, m.profile_pic_url 
                 FROM Comment c
                 JOIN Member m ON c.member_email = m.email
                 WHERE c.post_id = ?
                 ORDER BY c.created_at ASC
                 LIMIT 5`, 
                [post.post_id]
            );

            let bookTitle = 'ไม่ระบุหนังสือ'; 
            let bookId = post.book_id; 

            // สมมติว่า searchOpenLibraryBooks สามารถรับ book_id ได้
            if (bookId) {
              const bookData = await searchOpenLibraryBooks(bookId);
              if (bookData && bookData.length > 0) {
                bookTitle = bookData[0].title;
              }
            }

            let isLiked = false;
            let isBookmarked = false;

            
            if (req.session.user) {
                // เช็คสถานะ Like
                const [userLiked] = await db.query("SELECT 1 FROM PostLike WHERE post_id = ? AND member_email = ?", [post.post_id, req.session.user.email]);
                isLiked = userLiked.length > 0;

                // Check Bookmark Status
                const [userBookmarked] = await db.query("SELECT 1 FROM PostBookmark WHERE post_id = ? AND member_email = ?", [post.post_id, req.session.user.email]);
                isBookmarked = userBookmarked.length > 0;
            }

            return {
                ...post,
                likeCount: post.like_count, // <--- ใช้ค่าที่ดึงมาใน Query หลัก
                bookTitle: bookTitle, 
                bookId: bookId,
                commentCount: commentCount,
                isLiked: isLiked,
                isBookmarked: isBookmarked,
                comments: comments
            };
        }));

        res.render("feed", {
            title: "Review Feed | MOONLITPAGE",
            user: req.session.user,
            reviews: postsWithBookInfo, 
            bookshelf: bookshelf
        });

    } catch (err) {
        console.error("Feed Load Error:", err);
        res.status(500).send("เกิดข้อผิดพลาดในการโหลดหน้าฟีดรีวิว");
    }
});

// /api/post/toggle-bookmark
app.post("/api/post/toggle-bookmark", requireLogin, async (req, res) => {
    const { postId } = req.body; 
    const memberEmail = req.session.user.email;

    if (!postId) { // เช็คว่า postID ถูกส่งมามั้ย
        return res.status(400).json({ success: false, error: "Missing Post ID" });
    }

    try {
        // เช็คว่าเคย bookmark โพสต์นี้มั้ย
        const [existing] = await db.query(
            "SELECT bookmark_id FROM PostBookmark WHERE post_id = ? AND member_email = ?",
            [postId, memberEmail] 
            // ดูว่ามีแถวใน PostBookmark ที่ตรงกับ postId และ memberEmail มั้ย
        );

        if (existing.length > 0) {
            // ถ้ามีอยู่แล้ว Toggle Off
            await db.query(
                "DELETE FROM PostBookmark WHERE post_id = ? AND member_email = ?",
                [postId, memberEmail]
            );
            return res.json({ success: true, action: "removed" });
        } else {
            // ถ้าไม่มี Toggle On
            await db.query(
                "INSERT INTO PostBookmark (post_id, member_email) VALUES (?, ?)",
                [postId, memberEmail]
            );
            return res.json({ success: true, action: "added" });
        }
    } catch (err) {
        console.error("Toggle Bookmark Error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

// /api/post/comment
app.post("/api/post/comment", requireLogin, async (req, res) => {
    const { postId, content } = req.body;
    const memberEmail = req.session.user.email;
    
    if (!postId || !content || content.trim() === "") { // เช็คข้อมูล ต้องมี postID, content
        return res.status(400).json({ success: false, error: "Missing Post ID or comment" });
    }
    
    try {
        // insert ลง database
        const [result] = await db.query(
            "INSERT INTO Comment (post_id, member_email, content) VALUES (?, ?, ?)",
            [postId, memberEmail, content] 
        );
        
        // ดึงข้อมูล comment เพื่อส่งกลับไป
        const [newCommentRow] = await db.query(
            `SELECT c.*, m.username_display, m.username, m.profile_pic_url
             FROM Comment c
             JOIN Member m ON c.member_email = m.email
             WHERE c.comment_id = ?`,
            [result.insertId] // id ของแถวที่เพิ่งถูกสร้าง
        );
        
        // ดึงจำนวน comment 
        const [countRow] = await db.query("SELECT COUNT(*) AS count FROM Comment WHERE post_id = ?", [postId]);

        return res.json({ 
            success: true, 
            action: "commented", 
            newComment: newCommentRow[0], // ข้อมูล comment ใหม่ 
            newCommentCount: countRow[0].count // จำนวน comment ใหม่ 
        });
    } catch (err) {
        console.error("Comment Post Error:", err);
        return res.status(500).json({ success: false, error: "Server error" });
    }
});

// ================== ROUTES PROFILE ==================
app.get("/profile", requireLogin, async (req, res) => {
    try {
        const memberEmail = req.session.user.email; // ดึงอีเมล user ที่ login
        
        // ดึงข้อมูล profile ล่าสุด
        const [profileRows] = await db.query("SELECT * FROM Member WHERE email = ?", [memberEmail]);
        const userProfile = profileRows[0] || {};
        
        // ดึงข้อมูล bookshelf
        const [shelfRows] = await await db.query("SELECT * FROM BookShelf WHERE member_email = ? ORDER BY date_added DESC", [memberEmail]);

        // ดึงโพสต์ที่ user เขียนเอง (tab โพสต์ของฉัน)
        const [userPostsRows] = await db.query( // ดึงโพสต์ทั้งหมดจากตาราง FeedPost
            `SELECT fp.*, fp.post_id, m.username_display 
             FROM FeedPost fp JOIN Member m ON fp.member_email = m.email 
             WHERE fp.member_email = ? 
             ORDER BY fp.created_at DESC`, 
            [memberEmail]
        );

        // ดึง like count สำหรับแต่ละโพสต์ของ user
        const userPostsWithStats = await Promise.all(userPostsRows.map(async (post) => {
            // ดึง like count จากตาราง PostLike
            const [likeCountRow] = await db.query("SELECT COUNT(*) AS count FROM PostLike WHERE post_id = ?", [post.post_id]); // นับจำนวนแถว
            const likeCount = likeCountRow[0].count; // เก็บจำนวน like

            return {
                ...post,
                likeCount: likeCount // เพิ่ม likeCount เข้าไปใน object
            };
        }));

        // ดึงโพสต์ที่ bookmark ไว้ 
        const [bookmarkedRows] = await db.query( // ดึงโพสต์ทั้งหมดที่ bookmark
            `SELECT fp.post_id, fp.content, m.username_display, m.username, m.profile_pic_url
             FROM PostBookmark pb
             JOIN FeedPost fp ON pb.post_id = fp.post_id 
             JOIN Member m ON fp.member_email = m.email
             WHERE pb.member_email = ?
             ORDER BY pb.bookmark_id DESC`,
            [memberEmail]
        );

        res.render("profile", {
            title: "โปรไฟล์ของฉัน | MOONLITPAGE",
            user: req.session.user, 
            profile: userProfile,  
            bookshelf: shelfRows,
            reviews: userPostsWithStats,
            bookmarked_posts: bookmarkedRows 
        });
    } catch (err) {
        console.error("Profile Load Error:", err);
        res.send("เกิดข้อผิดพลาดในการโหลดโปรไฟล์");
    }
});

// update profile
app.post("/profile/update", requireLogin, upload.single('profile_pic'), async (req, res) => {
    const { username_display, bio } = req.body; // ดึงข้อมูล
    const memberEmail = req.session.user.email;
    let profilePicUrl = req.session.user.profile_pic_url || null; // url รูปภาพ default เป็นรูปเดิมใน session

    try {
        if (req.file) { // เช็คว่ามีการ upload ไฟล์ใหม่มั้ย
            profilePicUrl = `/uploads/${req.file.filename}`; // บันทึก url รูปภาพใหม่ ตามชื่อไฟล์ที่ multer บันทึก
        }
        
        await db.query( // update ข้อมูลใหม่
            "UPDATE Member SET username_display = ?, bio = ?, profile_pic_url = ? WHERE email = ?",
            [username_display, bio, profilePicUrl, memberEmail]
        );

        // update session เพื่อให้ navbar แสดงชื่อใหม่
        req.session.user.username_display = username_display;
        req.session.user.bio = bio;
        req.session.user.profile_pic_url = profilePicUrl;

        res.redirect("/profile");
    } catch (err) {
        console.error("Profile Update Error:", err);
        res.send("เกิดข้อผิดพลาดในการอัปเดตโปรไฟล์");
    }
});

// ================== ROUTES BOOKSHELF ==================
// /bookshelf/add 
app.post("/bookshelf/add", requireLogin, async (req, res) => {
    const { book_id, title, author } = req.body;
    const memberEmail = req.session.user.email;
    
    try {
        await db.query( // insert หนังสือใหม่
            "INSERT INTO BookShelf (member_email, book_id, title, author) VALUES (?, ?, ?, ?)",
            [memberEmail, book_id, title, author]
        );
        res.redirect("/book"); 
    } catch (err) {
        console.error("Add to Shelf Error:", err);
        res.send("ไม่สามารถเพิ่มหนังสือเข้าชั้นได้");
    }
});

// /bookshelf/update สถานะ (ซื่อแล้ว/อ่านแล้ว)
app.post("/bookshelf/update", requireLogin, async (req, res) => {
    const { shelf_id, is_owned, is_read } = req.body;
    
    try {
        await db.query( // update สถานะ
            "UPDATE BookShelf SET is_owned = ?, is_read = ? WHERE shelf_id = ?",
            [is_owned === 'on', is_read === 'on', shelf_id] // แปลงค่า checkbox เป็น boolean
        );
        res.redirect("/profile#bookshelf"); // กลับไปที่ tab ชั้นหนังสือ
    } catch (err) {
        res.send("ไม่สามารถอัปเดตสถานะได้");
    }
});

// /bookshelf/delete
app.post("/bookshelf/delete/:shelfId", requireLogin, async (req, res) => {
    const { shelfId } = req.params; // ดึง shelfId จาก url (parameter)
    try {
        await db.query("DELETE FROM BookShelf WHERE shelf_id = ? AND member_email = ?", [shelfId, req.session.user.email]);
        res.redirect("/profile#bookshelf"); // กลับไปที่ tab ชั้นหนังสือ
    } catch (err) {
        res.send("ไม่สามารถลบหนังสือได้");
    }
});

// ================== ROUTES REVIEW (อยู่ในหน้า Profile) ==================
// /review/post
app.post("/review/post", requireLogin, async (req, res) => {
    const { content, book_id } = req.body;
    const memberEmail = req.session.user.email;
    
    try {
        await db.query( // insert ข้อมูลรีวิว
            "INSERT INTO Review (member_email, book_id, content) VALUES (?, ?, ?)",
            [memberEmail, book_id || null, content]
        );

        return res.redirect(`/reviews?book_id=${book_id}`); // กลับไปที่หน้าแสดงรีวิวของหนังสือนั้นๆ

    } catch (err) {
        console.error("Review Post Error:", err);
        res.send("ไม่สามารถโพสต์รีวิวได้");
    }
});

// ================== ROUTES REVIEWS ==================
// หน้าแสดงรีวิวหนังสือเล่มใดเล่มหนึ่ง
app.get('/reviews', async (req, res) => {
    const bookId = req.query.book_id; // ดึง book_id จาก query parameter
    
    if (!bookId) {
        return res.redirect('/book'); // ถ้าไม่มี id ให้กลับไปหน้า book
    }

    try {
        // ดึงข้อมูลรีวิวแบบสุ่ม (1-5 รีวิว)
        const [reviewRows] = await db.query(
            `SELECT r.*, m.username_display 
             FROM Review r JOIN Member m ON r.member_email = m.email 
             WHERE r.book_id = ? 
             ORDER BY RAND() 
             LIMIT 5`, 
            [bookId]
        );
        
        // ดึงข้อมูลหนังสือเพื่อแสดง title 
        const [bookInfo] = await searchOpenLibraryBooks(bookId);
        const bookTitle = bookInfo.length > 0 ? bookInfo[0].title : 'หนังสือเล่มนี้';

        res.render('reviews', {
            title: `รีวิว ${bookTitle}`, //Template Literal title แสดง ฟีะน
            user: req.session.user,
            bookId: bookId,
            bookTitle: bookTitle,
            reviews: reviewRows
        });

    } catch (err) {
        console.error("Reviews Page Error:", err);
        res.send("เกิดข้อผิดพลาดในการโหลดรีวิว");
    }
});

// ================== LOGOUT ==================
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// ================== FORGOT PASSWORD ==================
app.get("/forgot", (req, res) => {
  res.render("forgot", { message: null });
});

// ส่งรหัสผ่านชั่วคราว
app.post("/forgot", async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM Member WHERE email = ?", [email]);
    if (rows.length === 0) {
      return res.render("forgot", { message: "ไม่พบบัญชีอีเมลนี้" });
    }

    const tempPass = Math.random().toString(36).slice(-8); 
    const hash = await bcrypt.hash(tempPass, 10); 
    await db.query("UPDATE Member SET password = ? WHERE email = ?", [hash, email]);

    // คืนค่า user/pass เป็น Hardcode
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "natnaree.sriapirath186@gmail.com",
        pass: "gicu mbrp ftum knfz",
      },
    });

    await transporter.sendMail({
      from: '"Moonlit Pages" <your_email@gmail.com>',
      to: email,
      subject: "รหัสผ่านชั่วคราวของคุณ",
      text: `รหัสผ่านชั่วคราวคือ: ${tempPass}\n\nโปรดเข้าสู่ระบบและเปลี่ยนรหัสใหม่ภายหลัง`,
    });

    res.render("login", { message: "ส่งรหัสผ่านชั่วคราวไปที่อีเมลแล้ว" });
  } catch (err) {
    console.error(err);
    res.send("เกิดข้อผิดพลาดในการส่งอีเมล");
  }
});

app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");
    res.send({ success: true, result: rows });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: err.message });
  }
});
// ================== START SERVER ==================
app.listen(3000, () => console.log("✅ Server running at http://localhost:3000"));