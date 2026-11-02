const BASE_FRAGMENT = `fragment base on PullRequest { number title url isDraft headRefName isCrossRepository repository { nameWithOwner } }`;

const PR_FRAGMENT = `fragment pr on PullRequest { ...base stackEntry { position } stack { number size entries(first: 50) { nodes { position pullRequest { ...base state } } } } }`;

function toSearchQuery(fragment: string): string {
  return `query {
  mine: search(query: "is:pr is:open author:@me archived:false sort:updated-desc", type: ISSUE, first: 50) { nodes { ...${fragment} } }
  review: search(query: "is:pr is:open review-requested:@me archived:false sort:updated-desc", type: ISSUE, first: 50) { nodes { ...${fragment} } }
  assigned: search(query: "is:pr is:open assignee:@me archived:false sort:updated-desc", type: ISSUE, first: 50) { nodes { ...${fragment} } }
}`;
}

function toLookupQuery(fragment: string): string {
  return `query($owner: String!, $name: String!, $number: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $number) { ...${fragment} } } }`;
}

export const PULL_REQUESTS_QUERY = `${toSearchQuery('pr')}\n${BASE_FRAGMENT}\n${PR_FRAGMENT}`;

export const PULL_REQUESTS_QUERY_PLAIN = `${toSearchQuery('base')}\n${BASE_FRAGMENT}`;

export const LOOKUP_QUERY = `${toLookupQuery('pr')}\n${BASE_FRAGMENT}\n${PR_FRAGMENT}`;

export const LOOKUP_QUERY_PLAIN = `${toLookupQuery('base')}\n${BASE_FRAGMENT}`;
