#!/bin/bash

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "ffmpeg is required but not installed. Install with:"
    echo "brew install ffmpeg  # macOS"
    echo "apt-get install ffmpeg  # Ubuntu/Debian"
    exit 1
fi

# Check if aws cli is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI is required but not installed. Install with:"
    echo "brew install awscli  # macOS"
    echo "apt-get install awscli  # Ubuntu/Debian"
    exit 1
fi

# Create temporary directory for converted files
mkdir -p tmp/brown-noise tmp/rain

# Convert Brown Noise files
echo "Converting Brown Noise files..."
for file in public/sounds/"Brown Noise Stream"/*.mp3; do
    filename=$(basename "$file" .mp3)
    echo "Converting: $filename"
    ffmpeg -i "$file" -c:a aac -b:a 192k "tmp/brown-noise/${filename// /-}.m4a" -y
done

# Convert Rain files
echo "Converting Rain files..."
for file in public/sounds/"Rain Makes Everything Better"/*.mp3; do
    filename=$(basename "$file" .mp3)
    echo "Converting: $filename"
    ffmpeg -i "$file" -c:a aac -b:a 192k "tmp/rain/${filename// /-}.m4a" -y
done

echo "All files converted to .m4a format"

# Check if CLOUDFLARE_ACCOUNT_ID is set
if [ -z "$CLOUDFLARE_ACCOUNT_ID" ]; then
    echo "Please set your Cloudflare Account ID:"
    echo "export CLOUDFLARE_ACCOUNT_ID=your-account-id"
    exit 1
fi

# Upload to Cloudflare R2
echo "Uploading to Cloudflare R2..."
aws --endpoint-url https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com \
    --profile cloudflare \
    s3 cp tmp/ s3://chocolaterain/ \
    --recursive \
    --content-type "audio/mp4"

# Cleanup
echo "Cleaning up temporary files..."
rm -rf tmp

echo "Done! Files are now converted and uploaded to Cloudflare R2"
echo "Update your .env file with the R2 public URL:"
echo "VITE_CDN_URL=https://03a8e406081e91ef02684bed5f97b6a5.r2.cloudflarestorage.com/chocolaterain"
