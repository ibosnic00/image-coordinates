# Deployment Guide

## GitHub Pages Setup

### 1. Enable GitHub Pages

1. Go to your GitHub repository: `https://github.com/ibosnic00/image-coordinates`
2. Click on **Settings** tab
3. Scroll down to **Pages** section in the left sidebar
4. Under **Source**, select **GitHub Actions**
5. The GitHub Actions workflow will automatically deploy your site

### 2. Verify Deployment

- The GitHub Actions workflow will run automatically when you push to the `main` branch
- You can monitor the deployment in the **Actions** tab
- Once deployed, your site will be available at: `https://ibosnic00.github.io/image-coordinates/`

## Cloudflare Proxy Setup

### 1. Add DNS Record

1. Log into your Cloudflare dashboard
2. Select your domain: `afterfive.hr`
3. Go to **DNS** section
4. Add a new CNAME record:
   - **Name**: `coordinates`
   - **Target**: `ibosnic00.github.io`
   - **Proxy status**: Proxied (orange cloud)
   - **TTL**: Auto

### 2. Configure SSL/TLS

1. Go to **SSL/TLS** section in Cloudflare
2. Set **Encryption mode** to **Full (strict)**
3. Enable **Always Use HTTPS**

### 3. Page Rules (Optional)

If you need specific settings for the subdomain, create a Page Rule:
- **URL**: `coordinates.afterfive.hr/*`
- **Settings**: 
  - SSL: Full (strict)
  - Always Use HTTPS: On
  - Cache Level: Standard

## Testing the Setup

1. Wait for DNS propagation (can take up to 24 hours, usually much faster)
2. Visit `https://coordinates.afterfive.hr`
3. The site should load from GitHub Pages through Cloudflare

## Troubleshooting

### Common Issues

1. **Site not loading**: Check if GitHub Actions deployment completed successfully
2. **DNS not resolving**: Verify CNAME record is correct and proxied
3. **SSL errors**: Ensure Cloudflare SSL/TLS is set to Full (strict)
4. **Build failures**: Check GitHub Actions logs for build errors

### Manual Deployment

If you need to deploy manually:

```bash
# Build the project
npm run build

# The output will be in the `out/` directory
# You can manually upload this to any static hosting service
```

## Maintenance

- **Automatic updates**: Every push to `main` branch triggers automatic deployment
- **Manual updates**: You can manually trigger deployment from GitHub Actions tab
- **Monitoring**: Check GitHub Actions for deployment status and any build errors
