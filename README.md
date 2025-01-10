# Terescrow- A Crypto & Gift Cards Trading App Backend

This is the backend for a **Crypto and Gift Cards Trading Android App**, built using **Node.js** with **TypeScript**, **Prisma** as the ORM, and **MySQL** as the database. It supports features like authentication using JWT, real-time chat using Socket.IO, and an admin panel to manage the platform's operations.

---

## Features

### **Authentication**
- JWT-based authentication for secure login and token validation.
- Role-based access control for customers, agents, and admins.

### **Trading System**
- Agents are assigned to customers in real-time based on their department.
- Secure handling of trades involving crypto and gift cards.

### **Real-Time Chat**
- Chat for trading between agents and customers.
- Team communication:
  - **Agent-to-Agent** communication.
  - **Agent-to-Admin** communication.
- Admin can view and monitor chats between agents and customers.

### **Admin Panel**
- Dedicated functionalities for admin:
  - Manage agents, customers, and trades.
  - Assign agents to departments.
  - View all chats and monitor team activities.

---

## Tech Stack

- **Backend Framework**: Node.js with TypeScript
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: JWT
- **WebSockets**: Socket.IO
- **Admin Panel**: REST APIs designed specifically for admin functionalities

---

## Prerequisites

Ensure the following are installed:
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MySQL](https://www.mysql.com/)

