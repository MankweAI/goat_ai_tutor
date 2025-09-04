/**
 * Brain Agent - The central AI orchestrator
 * Analyzes user intent and routes to specialized agents
 */
const { getOpenAIClient } = require("../config/openai");
const { analyzeUserIntent } = require("./intent-analyzer");

class BrainAgent {
  constructor() {
    this.openai = getOpenAIClient();
    this.activeAgents = new Map();
  }
  
  /**
   * Process incoming user message and route to appropriate agent
   */
  async processMessage(userId, context) {
    console.log(`🧠 Brain processing message for user ${userId}`);
    
    // Extract key information
    const message = context.message || "";
    const imageUrl = context.image_url;
    const sessionState = context.session_state || {};
    const userName = context.user_name || "Student";
    
    try {
const userIntent = await this.analyzeIntent(message, imageUrl, sessionState);
console.log(
  `🧠 Intent analysis: ${userIntent.category}, confidence: ${userIntent.confidence}`
);

// Enhanced agent determination with more context
const targetAgent = await this.determineTargetAgent(userIntent, {
  ...sessionState,
  previous_agent: sessionState.current_agent || "conversation_agent",
  message_content: message,
  has_image: !!imageUrl,
  first_interaction: !sessionState.has_received_help,
});

// Make sure we're logging the agent decision clearly
console.log(`🧠 Routing to ${targetAgent} for user ${userId}`);
      
      // Step 3: Prepare handoff with relevant context
      const handoffPackage = this.prepareHandoffContext(userIntent, context, targetAgent);
      
      // Step 4: Route to specialized agent with context
      return await this.routeToAgent(targetAgent, userId, handoffPackage);
      
    } catch (error) {
      console.error("Brain agent error:", error);
      return {
        agent_id: "brain_fallback",
        response: `I apologize for the confusion. Could you please rephrase your question about ${sessionState.subject || "your studies"}?`,
        error: true
      };
    }
  }
  
  /**
   * Analyze user intent using intent-analyzer
   */
  async analyzeIntent(message, imageUrl, sessionState) {
    if (imageUrl) {
      return {
        category: "homework_help",
        confidence: 0.95,
        has_image: true,
        subject: sessionState.subject || "unknown",
        grade: sessionState.grade_detected || "unknown"
      };
    }
    
    return await analyzeUserIntent(message, sessionState);
  }
  
  /**
   * Determine which specialized agent should handle this request
   */
  async determineTargetAgent(userIntent, sessionState) {
    const { category, subject, grade, topic } = userIntent;
    
    // Handle welcome messages and initial greetings
    if (category === "greeting") {
      if (!sessionState.welcome_sent) {
        return "conversation_agent";
      } else {
        return "conversation_agent";
      }
    }
    
    // Handle specific intents
    switch (category) {
      case "homework_help":
        return "homework_agent";
        
      case "practice_request":
        return "practice_agent";
        
      case "exam_preparation":
        return "exam_agent";
        
      case "concept_explanation":
        // If we have subject and grade, route to a subject-specific agent
        if (subject && grade) {
          return `${subject.toLowerCase()}_grade_${grade}_agent`;
        }
        return "concept_agent";
        
      default:
        return "conversation_agent";
    }
  }
  
  /**
   * Prepare context package for handoff to specialized agent
   */
  prepareHandoffContext(userIntent, originalContext, targetAgent) {
    return {
      ...originalContext,
      user_intent: userIntent,
      target_agent: targetAgent,
      handoff_time: new Date().toISOString(),
      brain_analysis: {
        confidence: userIntent.confidence || 0.7,
        category: userIntent.category,
        subject: userIntent.subject,
        grade: userIntent.grade,
        topic: userIntent.topic
      }
    };
  }
  
  /**
   * Route the request to the appropriate specialized agent
   */
  async routeToAgent(agentType, userId, context) {
    console.log(`🧠➡️ Brain routing to ${agentType} for user ${userId}`);
    
    try {
      // Dynamic import based on agent type
      const agentModule = require(`./${agentType}`);
      const response = await agentModule.processMessage(userId, context);
      
      return {
        ...response,
        routed_by: "brain_agent",
        agent_id: agentType
      };
    } catch (error) {
      console.error(`Error routing to ${agentType}:`, error);
      
      // Fallback to conversation agent
      try {
        const conversationAgent = require('./conversation-agent');
        const response = await conversationAgent.processMessage(userId, {
          ...context,
          routing_error: true,
          intended_agent: agentType
        });
        
        return {
          ...response,
          routed_by: "brain_fallback",
          original_agent: agentType,
          agent_id: "conversation_agent"
        };
      } catch (fallbackError) {
        // Ultimate fallback
        return {
          agent_id: "emergency_fallback",
          response: "I'm having trouble connecting you with the right tutor. Could you try again with your question?",
          error: true
        };
      }
    }
  }
}

module.exports = new BrainAgent();
