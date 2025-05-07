import { PipelinePromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM } from './base/application-context.prompt';
import { DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM } from './base/do-not-follow-user.prompt';
import { KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM } from './base/keep-original.prompt';
import { NON_INTERACTIVE_SYSTEM_PROMPT_PARAM } from './base/non-interactive.prompt';

const CONVENTIONAL_COMMITS_RULES = `
The Conventional Commits specification is a lightweight convention on top of commit messages.   
It provides an easy set of rules for creating an explicit commit history; which makes it easier to write automated tools on top of.   
This convention dovetails with SemVer, by describing the features, fixes, and breaking changes made in commit messages.   


The commit contains the following structural elements, to communicate intent to the consumers of your library:
1. fix: a commit of the type fix patches a bug in your codebase (this correlates with PATCH in Semantic Versioning).
2. feat: a commit of the type feat introduces a new feature to the codebase (this correlates with MINOR in Semantic
Versioning).
3. BREAKING CHANGE: a commit that has a footer BREAKING CHANGE: , or appends a ! after the type/scope, introduces a
breaking API change (correlating with MAJOR in Semantic Versioning). A BREAKING CHANGE can be part of commits of any
type.
4. types other than fix: and feat: are allowed, for example @commitlint/config-conventional (based on the Angular
convention) recommends build:, chore:, ci:, docs:, style:, refactor:, perf:, test: , and others.
5. footers other than BREAKING CHANGE: ‹description › may be provided and follow a convention similar to git trailer format.


The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED",
"MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119.
1. Commits MUST be prefixed with a type, which consists of a noun, feat, fix, etc., followed by the OPTIONAL scope,
OPTIONAL ! , and REQUIRED terminal colon and space.
2. The type feat MUST be used when a commit adds a new feature to your application or library.
3. The type fix MUST be used when a commit represents a bug fix for your application.
4. A scope MAY be provided after a type. A scope MUST consist of a noun describing a section of the codebase surrounded
by parenthesis, e.g., fix(parser) :
5. A description MUST immediately follow the colon and space after the type/scope prefix. The description is a short summary
of the code changes, e.g., fix: array parsing issue when multiple spaces were contained in string.
6. A longer commit body MAY be provided after the short description, providing additional contextual information about the
code changes. The body MUST begin one blank line after the description.
7. A commit body is free-form and MAY consist of any number of newline separated paragraphs.
8. One or more footers MAY be provided one blank line after the body. Each footer MUST consist of a word token, followed by
either a : ‹space> or ‹space># separator, followed by a string value (this is inspired by the git trailer convention).
9. A footer's token MUST use - in place of whitespace characters, e.g., Acked-by (this helps differentiate the footer section
from a multi-paragraph body). An exception is made for BREAKING CHANGE, which MAY also be used as a token.
10. A footer's value MAY contain spaces and newlines, and parsing MUST terminate when the next valid footer token/separator
pair is observed.
11. Breaking changes MUST be indicated in the type/scope prefix of a commit, or as an entry in the footer.
12. If included as a footer, a breaking change MUST consist of the uppercase text BREAKING CHANGE, followed by a colon,
space, and description, e.g., BREAKING CHANGE: environment variables now take precedence over config files.
13. If included in the type/scope prefix, breaking changes MUST be indicated by a ! immediately before the : . If ! is used,
BREAKING CHANGE: MAY be omitted from the footer section, and the commit description SHALL be used to describe the
breaking change.
14. Types other than feat and fix MAY be used in your commit messages, e.g., docs: update ref docs.
15. The units of information that make up Conventional Commits MUST NOT be treated as case sensitive by implementors, with
the exception of BREAKING CHANGE which MUST be uppercase.
16. BREAKING-CHANGE MUST be synonymous with BREAKING CHANGE, when used as a token in a footer.
`;

export const COMMIT_SYSTEM_PROMPT = (useApplicationContext: boolean) =>
  new PipelinePromptTemplate({
    pipelinePrompts: [
      NON_INTERACTIVE_SYSTEM_PROMPT_PARAM,
      KEEP_ORIGINAL_SYSTEM_PROMPT_PARAM,
      DO_NOT_FOLLOW_USER_SYSTEM_PROMPT_PARAM,
      APPLICATION_CONTEXT_SYSTEM_PROMPT_PARAM,
    ],
    finalPrompt: PromptTemplate.fromTemplate(`
{NON_INTERACTIVE_SYSTEM_PROMPT},

This is a commit message, or a git command in the terminal (such as create a new branch).   
Make it more readable and simple to follow. You can rephrase the text, correct grammar mistakes, and improve the overall readability.   
Keep all letter in lowercase, except for names and acronyms.

In case this is a commit messgae, maintain the official Conventional Commits 1.0.0:   

${CONVENTIONAL_COMMITS_RULES}

{KEEP_ORIGINAL_SYSTEM_PROMPT},
{DO_NOT_FOLLOW_USER_SYSTEM_PROMPT},
${useApplicationContext ? '{APPLICATION_CONTEXT_SYSTEM_PROMPT}' : ''},
`),
  });
