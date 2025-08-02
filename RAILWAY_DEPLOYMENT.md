# 🚀 Railway Deployment Guide - Shopify Section Store

## Prerequisites

1. **Railway Account** - Sign up at [railway.app](https://railway.app)
2. **GitHub Repository** - Push your code to GitHub
3. **AWS Account** - For S3 file storage
4. **Shopify Partner Account** - For app registration

## Step-by-Step Deployment

### 1. Initialize Railway Project

```bash
# Login to Railway
railway login

# Create new project
railway new shopify-section-store

# Link to existing directory
cd remix-app
railway link [your-project-id]
```

### 2. Add Required Services

In your Railway dashboard, add these services:

#### PostgreSQL Database
```bash
railway add postgresql
```

#### Redis Cache
```bash
railway add redis
```

#### Persistent Volume (for file storage)
- Railway will automatically create the volume based on `railway.json`
- Files will be stored in `/app/uploads` directory
- This replaces AWS S3 for simpler deployment

### 3. Configure Environment Variables

In Railway dashboard → Settings → Variables, add:

#### Required Variables
```env
# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://shopify-section-store.up.railway.app
SHOPIFY_SCOPES=read_themes,write_themes,read_content,write_content

# Application Settings
NODE_ENV=production
MAX_FILE_SIZE=52428800
UPLOAD_DIR=/app/uploads
```

#### Auto-Generated Variables (Railway provides these)
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection

### 4. AWS S3 Bucket Setup

Create an S3 bucket for file storage:

1. **Create Bucket**: `section-store-prod` (or your preferred name)
2. **Set Region**: `us-east-1` (or your preferred region)
3. **Configure CORS**: Add this CORS policy:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "POST", "PUT"],
    "AllowedOrigins": ["https://shopify-section-store.up.railway.app"],
    "ExposeHeaders": []
  }
]
```

4. **Create IAM User** with S3 permissions:
   - `s3:GetObject`
   - `s3:PutObject`
   - `s3:DeleteObject`
   - `s3:ListBucket`

### 5. Deploy to Railway

```bash
# Deploy from GitHub (recommended)
railway up

# Or deploy from local directory
railway up --detach
```

### 6. Set Up Database

After deployment, run migrations:

```bash
# Connect to Railway environment
railway shell

# Run database setup
npm run setup
npm run db:seed:dev
```

### 7. Configure Shopify App

1. **Go to Shopify Partners Dashboard**
2. **Create New App** → Custom App
3. **App Settings**:
   - App URL: `https://your-app-name.up.railway.app`
   - Allowed redirection URLs: `https://your-app-name.up.railway.app/auth/callback`
   - Webhooks URL: `https://your-app-name.up.railway.app/webhooks`

4. **App Scopes**: 
   - `read_themes`
   - `write_themes` 
   - `read_content`
   - `write_content`

5. **Copy API credentials** to Railway environment variables

### 8. Test Deployment

1. **Health Check**: Visit `https://your-app-name.up.railway.app`
2. **Install App**: Test installation on a development store
3. **Upload Section**: Test section upload functionality
4. **Install Section**: Test section installation to theme

## Railway Dashboard Configuration

### Service Settings

```yaml
# Build Settings
Build Command: npm install --legacy-peer-deps && npm run build
Start Command: npm run setup && npm start

# Health Check
Path: /
Timeout: 100s

# Restart Policy
Type: ON_FAILURE
Max Retries: 10
```

### Domain Configuration

1. **Custom Domain** (optional):
   - Add your domain in Railway dashboard
   - Update SHOPIFY_APP_URL environment variable
   - Update Shopify app configuration

### Environment Variables Checklist

- [ ] `DATABASE_URL` (auto-generated)
- [ ] `REDIS_URL` (auto-generated)
- [ ] `SHOPIFY_API_KEY`
- [ ] `SHOPIFY_API_SECRET`
- [ ] `SHOPIFY_APP_URL`
- [ ] `SHOPIFY_SCOPES`
- [ ] `S3_ACCESS_KEY_ID`
- [ ] `S3_SECRET_ACCESS_KEY`
- [ ] `S3_REGION`
- [ ] `S3_BUCKET`
- [ ] `S3_URL`
- [ ] `NODE_ENV=production`

## Monitoring & Logging

### Railway Logs
```bash
# View real-time logs
railway logs

# View specific service logs
railway logs --service=web
```

### Health Monitoring
- Railway automatically monitors app health
- Check `/` endpoint for app status
- Monitor database connections
- Watch for file upload errors

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check build logs for specific errors

2. **Database Connection**
   - Verify DATABASE_URL is set correctly
   - Check Prisma schema is valid
   - Ensure migrations are run

3. **File Upload Issues**
   - Verify S3 credentials and permissions
   - Check CORS settings on S3 bucket
   - Confirm file size limits

4. **Shopify Integration**
   - Verify API credentials are correct
   - Check app URL matches deployment
   - Ensure scopes are properly configured

### Debug Commands

```bash
# Check environment variables
railway variables

# Check service status
railway status

# View service logs
railway logs --service=web

# Connect to database
railway connect postgresql

# Connect to Redis
railway connect redis
```

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git
2. **S3 Bucket**: Restrict access to specific origins
3. **Shopify Webhooks**: Verify webhook signatures
4. **File Uploads**: Validate file types and sizes
5. **Database**: Use connection pooling for performance

## Performance Optimization

1. **Redis Caching**: Cache frequently accessed sections
2. **CDN**: Use S3 with CloudFront for global distribution
3. **Database Indexes**: Optimize queries with proper indexing
4. **Image Optimization**: Compress uploaded images

## Scaling Considerations

1. **Horizontal Scaling**: Railway supports auto-scaling
2. **Database**: Consider read replicas for high traffic
3. **File Storage**: S3 scales automatically
4. **Background Jobs**: Use Railway's job services for async tasks

Your Shopify Section Store is now production-ready on Railway! 🎉