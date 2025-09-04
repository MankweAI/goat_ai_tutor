# GOAT AI Tutor API Documentation

## Overview

The GOAT AI Tutor is a specialized WhatsApp-based educational assistant using an AI-first architecture with multiple specialized agents working together to provide help for South African CAPS curriculum (Grades 8-12).

## Core Components

### Brain Agent

Central orchestrator that analyzes user intent and routes to specialized agents.

**Endpoint**: `/api/brain`

**Methods**:
- `POST /api/brain`
  - Request body:
    ```json
    {
      "action": "analyze",
      "message": "Help me with Grade 11 Math homework",
      "user_id": "user123",
      "user_name": "Sarah"
    }
    ```
  - Response:
    ```json
    {
      "brain_analysis": {
        "intent_detected": "homework_help",
        "subject_detected": "Mathematics",
        "grade_detected": "11"
      },
      "agent_decision": {
        "recommended_agent": "mathematics_grade_11_agent",
        "handoff_ready": true
      }
    }
    ```

### Webhook Handler

Main entry point for WhatsApp messages.

**Endpoint**: `/api/webhook`

**Methods**:
- `POST /api/webhook`
  - Request body:
    ```json
    {
      "subscriber_id": "user123",
      "first_name": "Sarah",
      "text": "Help me with my Grade 11 Math homework",
      "echo": "echo_123"
    }
    ```
  - Response:
    ```json
    {
      "echo": "echo_123",
      "version": "v2",
      "content": {
        "messages": [
          {
            "type": "text",
            "text": "I'd be happy to help with your Grade 11 Math homework! Could you share the specific question or send a photo of it?"
          }
        ]
      }
    }
    ```

## Agent Capabilities

### Homework Agent

- Process text-based homework questions
- Analyze homework images
- Provide step-by-step solutions
- Generate mini-tutorials

### Practice Agent

- Generate CAPS-aligned practice questions
- Adjust difficulty based on user performance
- Provide progressive hints
- Support topic switching

### Exam Agent

- Provide exam preparation materials
- Generate practice papers
- Explain exam strategies
- Support past paper practice

### Subject-specific Agents

- Specialized knowledge of specific subjects and grades
- Deep understanding of curriculum requirements
- Subject-appropriate teaching approaches

## Data Models

### User Session

```json
{
  "user_id": "string",
  "created_at": "ISO timestamp",
  "last_updated": "ISO timestamp",
  "conversation_count": 0,
  "welcome_sent": false,
  "has_received_help": false,
  "message_history": [],
  "current_agent": "string",
  "grade_detected": "string",
  "subject": "string"
}