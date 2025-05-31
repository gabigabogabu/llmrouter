import type OpenAI from "openai";

const SAMPLE_PROMPTS = [
  "Hello, how are you?",
  "What is the capital of France?",
  "Explain quantum physics in simple terms.",
  "Write a short story about a robot.",
  "What are the benefits of exercise?",
  "How do you make a sandwich?",
  "What is machine learning?",
  "Tell me a joke.",
  "What is the weather like today?",
  "How do I learn programming?",
  "What is the meaning of life?",
  "Explain photosynthesis.",
  "What are the planets in our solar system?",
  "How do computers work?",
  "What is artificial intelligence?",
  "Tell me about the history of the internet.",
  "How do you solve a Rubik's cube?",
  "What is the difference between HTTP and HTTPS?",
  "Explain recursion in programming.",
  "What are the Seven Wonders of the World?",
];

const SYSTEM_PROMPTS = [
  "You are a helpful assistant.",
  "You are an expert in science and technology.",
  "You are a creative writing assistant.",
  "You are a math tutor.",
  "You are a coding instructor.",
  "You are a friendly chatbot.",
  "You are an educational assistant for children.",
  "You are a formal business advisor.",
  "You are a casual conversation partner.",
  "You are an expert researcher.",
];

const ASSISTANT_RESPONSES = [
  "That's an interesting question. Let me think about that.",
  "I'd be happy to help you with that.",
  "Here's what I can tell you about that topic.",
  "That's a great question! Let me explain.",
  "I understand what you're asking. Here's my response:",
  "Thank you for asking. I can help with that.",
  "That's something I can definitely assist with.",
  "Let me provide you with some information about that.",
  "I see what you're getting at. Here's my take:",
  "That's an excellent point. Allow me to elaborate.",
];

const getRandomElement = <T>(array: T[]): T => {
  if (array.length === 0) throw new Error("Cannot get random element from empty array");
  return array[Math.floor(Math.random() * array.length)]!;
}

const randomBetween = (min: number, max: number): number => Math.random() * (max - min) + min;

const generateRandomConversation = (): OpenAI.Chat.Completions.ChatCompletionMessageParam[] => {
  const messageCount = Math.floor(randomBetween(1, 6));
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  const roles = ["user", "assistant", "system"] as const
  let lastRole: typeof roles[number] | null = null;

  while (messages.length < messageCount) {
    const possibleRoles = roles.filter(role => role !== lastRole);
    const role = getRandomElement(possibleRoles);

    messages.push({
      role,
      content: getRandomElement({
        "user": SAMPLE_PROMPTS,
        "assistant": ASSISTANT_RESPONSES,
        "system": SYSTEM_PROMPTS,
      }[role]),
    });

    lastRole = role;
  }

  return messages;
}

const generateRandomParams = (): Partial<OpenAI.Chat.Completions.ChatCompletionCreateParams> => {
  const params: Partial<OpenAI.Chat.Completions.ChatCompletionCreateParams> = {};
  if (Math.random() < 0.3) params.temperature = randomBetween(0, 2);
  if (Math.random() < 0.2) {
    const maxTokens = Math.floor(randomBetween(10, 1000));
    if (Math.random() < 0.5) params.max_completion_tokens = maxTokens;
    else params.max_tokens = maxTokens;
  }
  if (Math.random() < 0.2) params.top_p = randomBetween(0, 1);
  if (Math.random() < 0.1) params.frequency_penalty = randomBetween(-2, 2);
  if (Math.random() < 0.1) params.presence_penalty = randomBetween(-2, 2);
  return params;
}

export const generateRandomSetup = () => ({
  messages: generateRandomConversation(),
  params: generateRandomParams(),
});