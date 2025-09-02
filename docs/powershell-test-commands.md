# PowerShell Test Commands for Phase 2

## Prerequisites
Make sure your server is running:
```powershell
npm run local
```

## 1. Check Your Webhook Token
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/check-token" -Method GET
```

## 2. Test Webhook Verification
```powershell
# Use the token from the check-token response
Invoke-RestMethod -Uri "http://localhost:3000/api/webhook?hub.mode=subscribe&hub.verify_token=whatsapp-ai-tutor-webhook-verify-2025-a7b9c3e1f5d8&hub.challenge=test123" -Method GET
```

## 3. Test Message Processing

### Welcome Message Test
```powershell
$body = @{
    message = "Hello"
    user_name = "Test Student"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/test-message" -Method POST -Body $body -ContentType "application/json"
```

### Homework Help Test
```powershell
$body = @{
    message = "I need help with my homework"
    user_name = "Sarah"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/test-message" -Method POST -Body $body -ContentType "application/json"
```

### Practice Questions Test
```powershell
$body = @{
    message = "Can I get some practice questions?"
    user_name = "Lisa"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/test-message" -Method POST -Body $body -ContentType "application/json"
```

### Past Papers Test
```powershell
$body = @{
    message = "Do you have past papers?"
    user_name = "Mike"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/test-message" -Method POST -Body $body -ContentType "application/json"
```

### General Query Test
```powershell
$body = @{
    message = "What can you do?"
    user_name = "Emma"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/test-message" -Method POST -Body $body -ContentType "application/json"
```

## 4. Test All Connections
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/test-connections" -Method GET
```

## 5. Check Database Status
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/setup-database" -Method GET
```

## Expected Results

Each command should return JSON responses showing:
- Processing status
- Detected intents
- Generated responses
- Agent routing decisions

## Troubleshooting

If you get errors:
1. Make sure your server is running (`npm run local`)
2. Check that PowerShell execution policy allows scripts
3. Verify your .env.local file has the correct token