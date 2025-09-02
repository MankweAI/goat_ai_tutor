// 🎓 ACTUAL HOMEWORK AGENT (Called when Brain Manager routes)
async function callHomeworkAgent(student, context) {
  const openai = getOpenAIClient();

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.6,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: `You are the Homework Agent specialist. You provide step-by-step homework help for South African CAPS curriculum students.

CAPABILITIES:
- Solve homework problems step-by-step
- Explain concepts clearly
- Adapt to student's grade level
- Use CAPS curriculum context

STUDENT: ${student.first_name}
CONTEXT: ${context || "New homework request"}

Provide helpful, educational responses that guide learning.`,
      },
      {
        role: "user",
        content: student.message,
      },
    ],
  });

  return {
    agent: "homework_specialist",
    message: completion.choices[0].message.content,
  };
}

