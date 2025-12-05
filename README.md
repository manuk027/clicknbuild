<div align="center">
  # clickNbuild 🖥️
  
  **A dedicated e-commerce platform for computer components and peripherals.**

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

**clickNbuild** is a specialized e-commerce web application designed for hardware enthusiasts. It provides a seamless platform for users to browse, search, and purchase high-quality computer parts (CPUs, GPUs, Motherboards) and peripherals.

The application focuses on a robust shopping experience with advanced filtering, secure payments, and a reward-based referral system.

## ✨ Key Features

### 🛒 User Experience
* **Product Discovery:**
  * **Search:** Real-time search for components.
  * **Advanced Filtering:** Filter products by **Category**, **Brand**, and **Price Range**.
  * **Sorting:** Sort by Name (A-Z) or Selling Price (Low/High).
* **Authentication:** * Secure Google OAuth login.
  * Standard Email/Password registration.
* **Referral System:** Users can share a unique referral code; when used, the referrer receives a discount coupon in their account.
* **Shopping Cart:** Dynamic cart management with stock validation.
* **Checkout:** Integrated **Razorpay** payment gateway for secure transactions.
* **Order Tracking:** View order history and download invoices (via Nodemailer).

### 🛠️ Admin Dashboard
* **Inventory Management:** Full CRUD operations for products with image uploads via **Cloudinary**.
* **Order Management:** Track and update order status (Pending, Shipped, Delivered, Cancelled).
* **User Controls:** Block/Unblock users and view customer details.
* **Sales Analytics:** Visual reports of sales performance and revenue.

## ⚙️ Tech Stack

| Component | Technology |
| :--- | :--- |
| **Backend** | Node.js, Express.js |
| **Frontend** | EJS (Templating), Tailwind CSS |
| **Database** | MongoDB (Mongoose ODM) |
| **Auth** | Passport.js (Local & Google Strategy) |
| **Payments** | Razorpay |
| **Media Storage** | Cloudinary (via Multer) |
| **Emails** | Nodemailer (SMTP) |

## 🔐 Environment Variables

To run this project, you will need to add the following environment variables to your `.env` file in the root directory.

```env
# Server Configuration
PORT=3000
MONGODB_URI=your_mongodb_connection_string
SECRET_KEY=your_session_secret

# Authentication (Google OAuth)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

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
REFERRAL_SECRET=secret_string_for_generating_referrals

🚀 InstallationFollow these steps to set up the project locally.Clone the repositoryBashgit clone [https://github.com/your-username/clickNbuild.git](https://github.com/your-username/clickNbuild.git)
cd clickNbuild
Install DependenciesBashnpm install
Configure EnvironmentCreate a .env file in the root directory.Copy the variables from the Environment Variables section above and fill in your actual API keys.Run the ApplicationBash# For development (with nodemon)
npm run dev

# Standard start
npm start
Access the AppOpen your browser and navigate to http://localhost:3000📸 ScreenshotsHome PageProduct DetailsCart & CheckoutAdmin Dashboard🤝 ContributingContributions are welcome!Fork the ProjectCreate your Feature Branch (git checkout -b feature/NewFeature)Commit your Changes (git commit -m 'Add some NewFeature')Push to the Branch (git push origin feature/NewFeature)Open a Pull Request📞 ContactProject Link: https://github.com/your-username/clickNbuild
