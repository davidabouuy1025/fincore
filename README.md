<p 
    align="center"
    style="font-size: 50px"
><b>
    FinCore
</b>
</p>

<p align="center">
  <strong>Financial Intelligence & Analysis Platform</strong>
  <br />
  Transforming financial reports into structured, actionable insights.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-usage">Usage</a> •
  <a href="#-roadmap">Roadmap</a>
</p>

---

## 🧭 Overview

**FinCore** is a financial analysis platform designed to simplify the process of extracting, structuring, and analysing financial information.

Instead of manually navigating through lengthy financial reports, FinCore provides a centralized interface for turning financial data into meaningful insights.

### The problem

Financial reports contain large amounts of information spread across:

* Income statements
* Balance sheets
* Cash-flow statements
* Notes to financial statements
* Annual reports
* Company disclosures

Manually comparing this information across companies and reporting periods can be time-consuming and error-prone.

### Ultimate goal

> **Turn complex financial reports into structured financial intelligence.**

---

## ✨ Features

| Feature                    | Description                                                        |
| -------------------------- | ------------------------------------------------------------------ |
| 📄 **Report Processing**   | Extract financial information from uploaded reports                |
| 📊 **Financial Dashboard** | Visualize important financial metrics                              |
| 🏦 **Company Analysis**    | Analyse company financial performance                              |
| 📈 **Trend Analysis**      | Track financial metrics across reporting periods                   |
| 🔍 **Financial Metrics**   | Organize key profitability, balance-sheet and cash-flow indicators |
| 📑 **Report Management**   | Store and manage processed reports                                 |
| ⚡ **Interactive UI**       | Explore financial information through a responsive interface       |

---

## 🖥️ Dashboard

### Financial Overview

> Add screenshots of your application here.

```text
┌──────────────────────────────────────────────────────────────┐
│                         FinCore                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Revenue          Gross Profit        Net Income            │
│   RM XXX M         RM XXX M            RM XXX M               │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    Financial Trends                          │
│                                                              │
│              ╭──────────────╮                                │
│          ╭───╯              ╰────╮                           │
│      ╭───╯                       ╰───                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧩 Core Financial Metrics

FinCore organizes financial information into several major categories.

### Profitability

* Revenue
* Gross Profit
* Operating Profit
* EBITDA
* EBIT
* Profit Before Tax
* Net Profit
* EPS
* ROE
* ROA
* Net Interest Margin

### Balance Sheet

* Total Assets
* Gross Loans
* Net Loans
* Cash & Equivalents
* Total Liabilities
* Shareholders' Equity

### Cash Flow

* Operating Cash Flow
* Investing Cash Flow
* Financing Cash Flow
* Free Cash Flow

---

## 🏗️ Architecture

```text
                         ┌─────────────────┐
                         │     FinCore     │
                         │   Application   │
                         └────────┬────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
       ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
       │   Frontend  │     │   Backend   │     │   Storage   │
       │             │     │             │     │             │
       │ React       │     │ Node.js     │     │ Reports     │
       │ TypeScript  │     │ APIs        │     │ Financials  │
       │ Vite        │     │ Processing  │     │ Metadata    │
       └─────────────┘     └─────────────┘     └─────────────┘
```

---

## 🛠️ Technology Stack

### Frontend

* **React**
* **TypeScript**
* **Vite**
* **Tailwind CSS**
* **[Charting Library]**

### Backend

* **Node.js**
* **TypeScript**
* **[Backend Framework]**

### Data (Pending)

* **[Database]**

---

## 📁 Project Structure

```text
fincore/
│
├── src/
│   ├── components/
│   ├── App.tsx
│   ├── types.ts
│   ├── main.ts
│   └── ...
|
├── server/
│   └── ...
│
├── public/
│
├── server.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── README.md
└── ...
```

---

## 🚀 Installation

### Prerequisites

Make sure you have installed:

* Node.js
* npm
* Git

### Clone the repository

```bash
git clone <repository-url>
cd fincore
```

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

The application will then be available at:

```text
http://localhost:5000
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=your_database_url
GEMINI_API_KEY=your_api_key
```

---

## 🔄 Application Workflow

```text
Upload Financial Report
          │
          ▼
   Report Processing
          │
          ▼
   Data Extraction
          │
          ▼
   Financial Structuring
          │
          ▼
   ┌─────────────────┐
   │    FinCore      │
   │    Dashboard    │
   └────────┬────────┘
            │
      ┌─────┼─────┐
      ▼     ▼     ▼
    Trends Metrics Analysis
```

---

## 🎯 Design Principles

FinCore is built around several principles:

### Accuracy

Financial information should remain traceable to its source.

### Clarity

Complex financial information should be presented in a way that is easy to understand.

### Consistency

Financial metrics should follow consistent definitions and structures.

### Usability

The interface should allow users to reach useful information quickly without unnecessary complexity.

---

## 🗺️ Roadmap

### Completed

* [/] Financial dashboard
* [/] Company financial data
* [/] Report upload
* [/] Financial metric organization
* [/] Basic financial analysis

### In Progress

* [ ] Improved report extraction
* [ ] Advanced financial comparisons
* [ ] Historical trend analysis
* [ ] Enhanced dashboard visualizations

### Planned

* [ ] Automated financial insights using AI integration
* [ ] Company-to-company comparison
* [ ] Sector analysis
* [ ] Advanced valuation metrics
* [ ] UI enhancement
* [ ] Portfolio-level analysis

---

## 🧪 Development

Run the development environment:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

---

## 🔐 Security

Security considerations include:

* Environment variables for sensitive configuration
* Input validation
* Secure API handling
* Controlled file processing
* Dependency management

---

## 📊 Project Status

```text
█████████████████░░░░░░░░░░░░░░░░  Development (50%)
```

**Status:** 🚧 Active Development

---

## 🤝 Contributing

Contributions, suggestions, and improvements are welcome.

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/your-feature
```

3. Commit your changes

```bash
git commit -m "Add your feature"
```

4. Push the branch

```bash
git push origin feature/your-feature
```

5. Open a Pull Request

---

## 📜 License

Will update this part soon.

---

## 👨‍💻 Author

Built with ❤️ and a lot of ☕ by our wonderful developers ...

**Lee Jun Ming - <a href="https://github.com/davidabouuy1025"> davidabouuy1025</a>**

**Lim Seng Yang - <a href="https://github.com/ItzLing"> ItsLing</a>**

---

<p align="center">
  <strong>FinCore</strong>
  <br />
  <sub>Financial data. Structured. Analysed. Understood.</sub>
</p>
