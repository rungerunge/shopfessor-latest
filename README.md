# 🛍️ Shopify Section Store App

A **production-ready Shopify app** that allows users to browse, preview, and install **100% FREE** theme sections. Built with Remix, Prisma, and the Shopify App API.

## 🎯 Features

### For Users (Store Owners)
- **Browse Sections**: Discover free sections organized by categories (Hero, Features, Testimonials, etc.)
- **Search & Filter**: Find sections by name, description, or tags
- **Live Preview**: View section previews before installation
- **One-Click Install**: Install sections directly to Shopify themes
- **No Payment Required**: All sections are completely free

### For Admins (Section Store Owners)
- **Upload Sections**: Drag & drop section files (.liquid, .css, .js, .json)
- **Category Management**: Create and organize section categories
- **Analytics Dashboard**: Track installations and popular sections
- **File Validation**: Automatic validation of Shopify section standards

## 🏗️ Tech Stack

- **Framework**: Remix (React + Node.js)
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Shopify Polaris Design System
- **Authentication**: Shopify OAuth
- **File Storage**: AWS S3
- **Cache**: Redis
- **Deployment**: Railway/Vercel ready

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Redis instance
- AWS S3 bucket
- Shopify Partner account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd remix-app
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/section_store_dev

   # Redis
   REDIS_URL=redis://localhost:6379

   # AWS S3 (for section files and images)
   S3_ACCESS_KEY_ID=your_aws_access_key
   S3_SECRET_ACCESS_KEY=your_aws_secret_key
   S3_BUCKET=section-store-assets
   S3_REGION=us-east-1

   # Shopify App (configured via Shopify CLI)
   SHOPIFY_API_KEY=your_api_key
   SHOPIFY_API_SECRET=your_api_secret
   SHOPIFY_APP_URL=https://your-app.com
   SHOPIFY_SCOPES=read_themes,write_themes,read_content,write_content
   ```

4. **Set up database**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed:dev
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
app/
├── routes/
│   ├── app._index.tsx           # Main section browse page
│   ├── app.section.$id.tsx      # Section detail & installation
│   ├── app.admin.upload.tsx     # Admin section upload
│   ├── app.admin.categories.tsx # Category management
│   └── app.admin._index.tsx     # Admin dashboard
├── services/
│   ├── section.server.ts        # Section management
│   ├── category.server.ts       # Category management
│   ├── shopify-theme.server.ts  # Theme API integration
│   └── installation.server.ts   # Installation workflow
└── lib/
    ├── shopify.server.ts        # Shopify authentication
    ├── db.server.ts             # Database connection
    └── s3.server.ts             # File storage
```

## 🗄️ Database Schema

### Core Models

- **Section**: Theme sections with liquid/css/js code
- **Category**: Organization for sections (Hero, Features, etc.)
- **Installation**: Track section installations per store/theme
- **Shop**: Shopify store information
- **User**: Store owners and admins

### Key Features

- **File Storage**: Section files stored in AWS S3
- **Installation Tracking**: Monitor section usage and popularity
- **Theme Compatibility**: Validate themes before installation

## 🎨 User Interface

### Main Browse Page
- Horizontal category navigation tabs
- Responsive section grid with preview images
- Search functionality with real-time filtering
- "FREE" badges on all sections
- One-click "Get Free Section" buttons

### Section Detail Page
- Large preview image
- Code preview modal (Liquid, CSS, JS, Schema)
- Theme selection dropdown
- Installation status feedback
- Download statistics

### Admin Upload Interface
- Drag & drop file upload zones
- Real-time form validation
- Tag management system
- Preview image upload
- Bulk operations support

## ⚙️ Section Installation Process

1. **User Selection**: User browses and selects a section
2. **Theme Selection**: Choose target theme from dropdown
3. **Compatibility Check**: Validate theme supports sections
4. **File Installation**: Deploy section files to theme
5. **Status Tracking**: Monitor installation progress
6. **Success Confirmation**: Redirect to theme editor

## 🔧 Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production

# Database
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema changes
npm run db:seed:dev     # Seed development data

# Code Quality
npm run lint            # ESLint
npm run format          # Prettier
```

## 📊 Analytics & Monitoring

### Installation Analytics
- Daily installation counts
- Top performing sections
- Store adoption metrics
- Category popularity

### Section Performance
- Download/installation ratios
- User engagement metrics
- Geographic distribution
- Theme compatibility stats

## 🔒 Security & Compliance

### Data Protection
- Shopify OAuth for secure authentication
- File validation and virus scanning
- SQL injection prevention with Prisma
- XSS protection with React

### Shopify Standards
- Follows Shopify App Store guidelines
- Theme compatibility validation
- Proper asset management
- Error handling and logging

## 🚀 Production Deployment

### Railway Deployment

1. **Connect Repository**
   ```bash
   railway login
   railway link
   ```

2. **Configure Environment**
   - Set all environment variables in Railway dashboard
   - Configure PostgreSQL and Redis add-ons

3. **Deploy**
   ```bash
   railway up
   ```

### Environment Variables for Production

```env
# Database (Railway PostgreSQL)
DATABASE_URL=postgresql://...

# Redis (Railway Redis)
REDIS_URL=redis://...

# AWS S3 (Production bucket)
S3_ACCESS_KEY_ID=prod_access_key
S3_SECRET_ACCESS_KEY=prod_secret_key
S3_BUCKET=section-store-prod

# Shopify App (Production)
SHOPIFY_API_KEY=prod_api_key
SHOPIFY_API_SECRET=prod_api_secret
SHOPIFY_APP_URL=https://your-production-app.com
```

## 📝 Usage Examples

### Installing a Section
1. Browse sections at `/app`
2. Click "Get Free Section" on desired section
3. Select target theme
4. Click "Install Free Section"
5. Section appears in theme editor under "Sections"

### Uploading a Section (Admin)
1. Go to `/app/admin/upload`
2. Fill in section metadata (title, category, description)
3. Upload required .liquid file
4. Optionally upload .css, .js, schema.json, and preview image
5. Click "Upload Section"

### Managing Categories (Admin)
1. Go to `/app/admin/categories`
2. Click "Add Category"
3. Enter name and emoji icon
4. Category appears in browse interface

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Submit GitHub issues for bugs and feature requests
- **Community**: Join our Discord for support and discussions

## 🔮 Roadmap

- [ ] Advanced section preview generation
- [ ] Section versioning and updates
- [ ] Community ratings and reviews
- [ ] Section marketplace with paid options
- [ ] Theme compatibility scanner
- [ ] Automated section testing

---

Built with ❤️ for the Shopify community. All sections are **100% FREE** forever!

<!-- Deploy trigger: remove GitHub Actions conflict -->