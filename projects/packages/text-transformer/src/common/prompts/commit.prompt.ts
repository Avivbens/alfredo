import { PromptTemplate } from '@langchain/core/prompts';
import { createBaseTransformPrompt } from './base-prompts';

const COMMIT_INSTRUCTION = new PromptTemplate({
  inputVariables: [],
  template: `This is a commit message, or a documentation comment. 
Make it more readable and simple to follow. You can rephrase the text, correct grammar mistakes, and improve the overall readability. 
Keep all letter in lowercase, except for names and acronyms.`,
});

export const COMMIT_SYSTEM_PROMPT = createBaseTransformPrompt(COMMIT_INSTRUCTION);
