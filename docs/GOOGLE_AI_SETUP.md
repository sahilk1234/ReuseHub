# Google AI (Gemini) Setup Guide

This guide explains how to set up and use Google AI (Gemini) as your AI provider in Re:UseNet.

## Overview

Google AI (Gemini) is Google's multimodal AI model that can understand and generate text, images, and more. Re:UseNet supports Gemini for:
- Image analysis and object detection
- Item categorization
- Similar item matching
- Tag generation

## Getting Started

### 1. Get Your API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variables

Update your `.env` file:

```bash
# AI Configuration
AI_PROVIDER=google
GOOGLE_AI_API_KEY=your-api-key-here
GOOGLE_AI_MODEL=gemini-1.5-flash
GOOGLE_AI_VISION_MODEL=gemini-1.5-flash
GOOGLE_AI_MAX_TOKENS=1000
```

**Note:** We default to `gemini-1.5-flash` which is the cheapest and fastest option:
- **75x cheaper** than GPT-4 ($0.000075 vs $0.03 per 1K input tokens)
- **Faster** response times
- **Free tier** includes 60 requests/minute

### 3. Restart Your Application

```bash
# Development
npm run dev

# Production
docker-compose restart app
```

## Available Models

### Text Models
- `gemini-pro` - Best for text-only tasks (default)
- `gemini-1.5-pro` - Latest model with improved capabilities
- `gemini-1.5-flash` - Faster, more cost-effective option

### Vision Models
- `gemini-pro-vision` - Multimodal model for image + text (default)
- `gemini-1.5-pro` - Latest vision model
- `gemini-1.5-flash` - Faster vision model

## Configuration Options

### Model Selection

Choose the model based on your needs:

```bash
# For better quality (slower, more expensive)
GOOGLE_AI_MODEL=gemini-1.5-pro
GOOGLE_AI_VISION_MODEL=gemini-1.5-pro

# For faster responses (cheaper)
GOOGLE_AI_MODEL=gemini-1.5-flash
GOOGLE_AI_VISION_MODEL=gemini-1.5-flash

# Cheapest and fastest (default)
GOOGLE_AI_MODEL=gemini-1.5-flash
GOOGLE_AI_VISION_MODEL=gemini-1.5-flash
```

### Token Limits

Adjust max tokens based on your use case:

```bash
# More detailed responses
GOOGLE_AI_MAX_TOKENS=2000

# Shorter responses (faster, cheaper)
GOOGLE_AI_MAX_TOKENS=500

# Default
GOOGLE_AI_MAX_TOKENS=1000
```

## Features

### Image Analysis

Gemini can analyze item images to:
- Detect objects and components
- Suggest categories
- Estimate condition
- Provide detailed descriptions

Example response:
```json
{
  "description": "A wooden dining chair with cushioned seat",
  "detectedObjects": ["chair", "wood", "cushion"],
  "suggestedCategories": ["Furniture", "Dining"],
  "condition": "good",
  "confidence": 0.85
}
```

### Item Categorization

Automatically categorize items based on description and image:
```json
{
  "primaryCategory": "Furniture",
  "secondaryCategories": ["Dining", "Seating"],
  "tags": ["chair", "wooden", "dining", "cushioned"],
  "confidence": 0.9
}
```

### Similar Item Matching

Find similar items in your database:
```json
{
  "similarItems": [
    {
      "itemId": "item_123",
      "similarity": 0.85,
      "reason": "Both are wooden dining chairs with similar style"
    }
  ]
}
```

## Pricing

Google AI pricing (as of 2024):

### Gemini Pro
- Input: $0.00025 / 1K characters
- Output: $0.0005 / 1K characters

### Gemini Pro Vision
- Input: $0.00025 / 1K characters
- Output: $0.0005 / 1K characters
- Images: $0.0025 / image

### Gemini 1.5 Pro
- Input: $0.00125 / 1K characters
- Output: $0.005 / 1K characters

### Gemini 1.5 Flash
- Input: $0.000075 / 1K characters
- Output: $0.0003 / 1K characters

Check [Google AI Pricing](https://ai.google.dev/pricing) for current rates.

## Rate Limits

Free tier limits:
- 60 requests per minute
- 1,500 requests per day

Paid tier limits:
- Higher rate limits based on your plan
- Contact Google for enterprise limits

## Switching from OpenAI

To switch from OpenAI to Google AI:

1. Update your `.env` file:
```bash
# Before
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# After
AI_PROVIDER=google
GOOGLE_AI_API_KEY=your-google-api-key
```

2. Restart your application - no code changes needed!

## Comparison: Google AI vs OpenAI

| Feature | Google AI (Gemini) | OpenAI (GPT-4) |
|---------|-------------------|----------------|
| **Cost** | Lower | Higher |
| **Speed** | Faster (Flash models) | Moderate |
| **Quality** | Excellent | Excellent |
| **Vision** | Native multimodal | Separate vision model |
| **Context** | Up to 1M tokens (1.5 Pro) | Up to 128K tokens |
| **Free Tier** | Yes (60 RPM) | No |

## Troubleshooting

### API Key Issues

**Error: "API key not valid"**
- Verify your API key is correct
- Check if the API key is enabled in Google AI Studio
- Ensure you're using the correct environment variable name

### Rate Limit Errors

**Error: "Resource exhausted"**
- You've hit the rate limit
- Wait a minute and try again
- Consider upgrading to a paid plan
- Implement request throttling in your application

### Model Not Found

**Error: "Model not found"**
- Check the model name is correct
- Ensure the model is available in your region
- Try using default models (gemini-pro, gemini-pro-vision)

### Image Analysis Failures

**Error: "Failed to analyze image"**
- Verify the image URL is accessible
- Check image format (JPEG, PNG supported)
- Ensure image size is under 4MB
- Try using a different image

## Best Practices

1. **Use Flash models for development** - Faster and cheaper
2. **Use Pro models for production** - Better quality
3. **Implement caching** - Cache AI responses to reduce costs
4. **Handle errors gracefully** - Implement fallback logic
5. **Monitor usage** - Track API calls and costs
6. **Set reasonable token limits** - Balance quality and cost
7. **Use batch processing** - Process multiple items together when possible

## Advanced Configuration

### Custom Temperature

Adjust response creativity (not exposed in config yet):
```typescript
// In GoogleAIService.ts
temperature: 0.3  // More deterministic (default)
temperature: 0.7  // More creative
temperature: 1.0  // Most creative
```

### Safety Settings

Configure content safety filters:
```typescript
// In GoogleAIService.ts
safetySettings: [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
]
```

## Support

For issues with Google AI:
- [Google AI Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://makersuite.google.com/)
- [Community Forum](https://discuss.ai.google.dev/)

For Re:UseNet integration issues:
- Check application logs
- Review configuration settings
- Open an issue in the repository

## Migration Guide

### From OpenAI to Google AI

1. **Get Google AI API key** (see above)
2. **Update environment variables**:
   ```bash
   AI_PROVIDER=google
   GOOGLE_AI_API_KEY=your-key
   ```
3. **Test the integration**:
   ```bash
   curl http://localhost:3000/api/items/analyze-image \
     -H "Content-Type: application/json" \
     -d '{"imageUrl": "https://example.com/image.jpg"}'
   ```
4. **Monitor performance** - Compare response times and quality
5. **Adjust settings** - Fine-tune model and token settings

### Rollback Plan

If you need to switch back to OpenAI:
```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
```

Restart the application - no code changes needed!

## Cost Optimization Tips

1. **Use Gemini Flash** for non-critical operations
2. **Cache responses** for frequently requested items
3. **Batch similar requests** together
4. **Set appropriate token limits** - Don't request more than needed
5. **Implement request throttling** - Avoid hitting rate limits
6. **Monitor usage** - Set up alerts for high usage
7. **Use fallback logic** - Fall back to simpler methods when AI fails

## Next Steps

- Explore [Google AI capabilities](https://ai.google.dev/docs)
- Try different models and compare results
- Implement caching for better performance
- Set up monitoring and alerting
- Consider upgrading to paid tier for higher limits
