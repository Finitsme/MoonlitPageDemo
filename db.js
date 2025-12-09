// import mysql from "mysql2/promise";

// export const db = mysql.createPool({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "MoonlitPageDemo",
// });

import mysql from "mysql2/promise";

const isProd = process.env.NODE_ENV === "production";

const db = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DB || "MoonlitPageDemo",
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  ssl: isProd ? { rejectUnauthorized: false } : false
});

export default db;
