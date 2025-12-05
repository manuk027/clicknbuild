<div align="center">
  # clickNbuild 🖥️
  
  **A full-featured e-commerce platform for computer components and peripherals.**

  ![Node.js](https://img.shields.io/badge/Node.js-v20-green)
  ![Express.js](https://img.shields.io/badge/Express.js-4.x-blue)
  ![MongoDB](https://img.shields.io/badge/MongoDB-Database-green)
  ![Status](https://img.shields.io/badge/Status-Active_Development-orange)

  <p align="center">
    <a href="#about-the-project">About</a> •
    <a href="#key-features">Key Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#environment-variables">Env Setup</a> •
    <a href="#installation">Installation</a>
  </p>
</div>

---

## 📖 About The Project

**clickNbuild** is a specialized e-commerce web application designed for computer enthusiasts. It allows users to browse, search, and purchase high-quality computer parts (CPUs, GPUs, Motherboards) and peripherals.

Built with performance and scalability in mind, the application features a secure payment integration, dynamic inventory management using cloud storage for media, and a reward-based referral system.

## ✨ Key Features

### 🛒 User Experience
* **Advanced Discovery:**
  * **Search:** Real-time search for components.
  * **Filtering:** Filter products by **Category** (e.g., GPU, RAM) and **Brand**.
  * **Sorting:** Sort results by Name or Selling Price.
* **Secure Authentication:** * Google OAuth integration (Passport.js).
  * Standard Email/Password login.
* **Referral System:** Users earn discount coupons by sharing unique referral codes with friends.
* **Shopping Cart & Checkout:** Persistent cart management with secure checkout via **Razorpay**.
* **Order Tracking:** Users can view order history and download invoices (via Nodemailer notifications).

### 🛠️ Admin Dashboard
* **Product Management:** Create, Read, Update, Delete (CRUD) products with image uploads handled via **Cloudinary**.
* **Order Management:** View and update order statuses (Pending, Shipped, Delivered, Cancelled).
* **User Management:** Manage customer accounts and block/unblock users.
* **Sales Reports:** Visual overview of sales performance.

## ⚙️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Node.js, Express.js |
| **Frontend** | EJS (Templating), Tailwind CSS |
| **Database** | MongoDB (Mongoose ODM) |
| **Auth** | Passport.js (Local & Google Strategy) |
| **Payments** | Razorpay Gateway |
| **Media** | Cloudinary (Image Storage) |
| **Email** | Nodemailer (SMTP) |

## 🔐 Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file in the root directory.

```env
# Server Configuration
PORT=3000
MONGODB_URI=your_mongodb_connection_string
SECRET_KEY=your_session_secret

# Authentication
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret

# Email Service (Nodemailer)
NODEMAILER_EMAIL=your_email_address
NODEMAILER_PASSWORD=your_app_password

# Image Storage (Cloudinary)
CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Payment Gateway (Razorpay)
RZP_TEST_KEY=your_razorpay_key_id
RZP_TEST_SECRET=your_razorpay_key_secret

# Features
REFERRAL_SECRET=secret_string_for_referral_generation
