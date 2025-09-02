# Phase 2 Test Scenarios

## WhatsApp Message Processing Tests

Test these scenarios using the `/api/test-message` endpoint:

### 1. Welcome Messages
```bash
curl -X POST http://localhost:3000/api/test-message \
-H "Content-Type: application/json" \
-d '{"message":"Hello","user_name":"Sarah"}'
```

### 2. Homework Help
```bash
curl -X POST http://localhost:3000/api/test-message \
-H "Content-Type: application/json" \
-d '{"message":"I need help with my homework","user_name":"John"}'
```

### 3. Practice Questions
```bash
curl -X POST http://localhost:3000/api/test-message \
-H "Content-Type: application/json" \
-d '{"message":"Can I get some practice questions?","user_name":"Lisa"}'
```

### 4. Past Papers
```bash
curl -X POST http://localhost:3000/api/test-message \
-H "Content-Type: application/json" \
-d '{"message":"Do you have past papers?","user_name":"Mike"}'
```

### 5. General Query
```bash
curl -X POST http://localhost:3000/api/test-message \
-H "Content-Type: application/json" \
-d '{"message":"What can you do?","user_name":"Emma"}'
```

## Expected Results

Each test should return:
- Detected intent
- Agent routing decision
- Generated response
- Processing status

## Browser Testing

You can also test via browser using tools like Postman or by visiting:
`http://localhost:3000/api/test-message`

And sending POST requests with JSON body.
