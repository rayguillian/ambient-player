# CDN Setup Guide for Ambient Player

## Cloudflare R2 Setup

1. Create a Cloudflare Account:
   - Go to https://dash.cloudflare.com/sign-up
   - Complete the registration process

2. Enable R2:
   - In Cloudflare dashboard, go to "R2"
   - Click "Create bucket"
   - Name it `ambient-player`
   - Choose region closest to your users

3. Create API Tokens:
   - Go to "Account" > "API Tokens"
   - Create token with R2 permissions
   - Save the Access Key ID and Secret Access Key

4. Upload Audio Files:
   ```bash
   # Install AWS CLI
   brew install awscli  # macOS
   
   # Configure AWS CLI for Cloudflare R2
   aws configure --profile cloudflare
   # Use your Access Key ID and Secret
   # Set region to auto
   # Set output format to json
   
   # Upload files (replace with your bucket name)
   aws --endpoint-url https://ACCOUNT_ID.r2.cloudflarestorage.com \
       --profile cloudflare \
       s3 cp ./public/sounds/ s3://ambient-player/ \
       --recursive \
       --content-type "audio/mp4"
   ```

5. Configure Public Access:
   - In R2 dashboard, select your bucket
   - Go to "Settings" > "Public Access"
   - Enable "Allow public access"
   - Note your bucket's public URL:
     `https://pub-XXXXX.r2.dev/`

## Environment Setup

1. Create .env file:
   ```bash
   cp .env.example .env
   ```

2. Update .env:
   ```
   VITE_CDN_URL=https://pub-XXXXX.r2.dev/ambient-player
   ```

## File Organization

Organize your audio files in the R2 bucket following this structure:
```
ambient-player/
├── brown-noise/
│   ├── lush-brown-noise.m4a
│   ├── digital-brown.m4a
│   └── ...
└── rain/
    ├── classic-thunderstorm.m4a
    └── ...
```

## Converting Audio Files

Before uploading, convert your audio files to .m4a format for optimal streaming:

```bash
# Install ffmpeg
brew install ffmpeg  # macOS

# Convert MP3 to M4A (AAC)
ffmpeg -i input.mp3 -c:a aac -b:a 192k output.m4a
```

## Alternative CDN Options

If you prefer not to use Cloudflare R2, here are other options:

1. Bunny CDN:
   - Very cost-effective
   - Simple pricing
   - Good global coverage
   - Easy to set up

2. AWS S3 + CloudFront:
   - More expensive but very reliable
   - Extensive features
   - Global presence
   - Complex setup

3. DigitalOcean Spaces:
   - S3-compatible
   - Includes CDN
   - Simple pricing
   - Good for small to medium projects

## Cost Comparison (Monthly)

1. Cloudflare R2:
   - Storage: $0.015/GB after first 10GB free
   - Operations: Free for first 10M requests
   - No egress fees
   - Example: 50GB storage + 1M requests = $0.60/month

2. Bunny CDN:
   - Storage: $0.01/GB
   - Transfer: $0.01/GB (varies by region)
   - Example: 50GB storage + 1TB transfer = $10.50/month

3. AWS S3 + CloudFront:
   - Storage: $0.023/GB
   - Transfer: $0.085/GB (varies by region)
   - Requests: $0.0004/10,000
   - Example: 50GB storage + 1TB transfer = ~$85/month

## Monitoring and Maintenance

1. Set up monitoring in Cloudflare dashboard:
   - Monitor storage usage
   - Track request patterns
   - Set up alerts for usage thresholds

2. Regular maintenance:
   - Review access logs
   - Clean up unused files
   - Update cache settings if needed

3. Backup strategy:
   - Keep original files in local backup
   - Consider secondary backup location
   - Document file organization

## Security Considerations

1. Content Security Policy:
   Add to your index.html:
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="media-src 'self' https://pub-XXXXX.r2.dev;">
   ```

2. CORS Configuration:
   R2 bucket should allow your domain:
   ```json
   {
     "AllowedOrigins": ["https://your-domain.com"],
     "AllowedMethods": ["GET"],
     "MaxAgeSeconds": 3600
   }
   ```

3. Access Control:
   - Use signed URLs for private content
   - Implement rate limiting if needed
   - Monitor for abuse

## Testing CDN Setup

1. Test latency:
   ```bash
   curl -w "%{time_total}\n" -o /dev/null -s https://pub-XXXXX.r2.dev/test-file.m4a
   ```

2. Verify CORS:
   ```javascript
   fetch('https://pub-XXXXX.r2.dev/test-file.m4a')
     .then(response => console.log('Success'))
     .catch(error => console.error('CORS issue:', error));
   ```

3. Check content types:
   ```bash
   curl -I https://pub-XXXXX.r2.dev/test-file.m4a
