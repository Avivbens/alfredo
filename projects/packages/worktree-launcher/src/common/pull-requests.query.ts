export const PULL_REQUESTS_QUERY = `query {
  mine: search(query: "is:pr is:open author:@me archived:false sort:updated-desc", type: ISSUE, first: 50) { nodes { ...pr } }
  review: search(query: "is:pr is:open review-requested:@me archived:false sort:updated-desc", type: ISSUE, first: 50) { nodes { ...pr } }
  assigned: search(query: "is:pr is:open assignee:@me archived:false sort:updated-desc", type: ISSUE, first: 50) { nodes { ...pr } }
}
fragment pr on PullRequest { number title url isDraft headRefName isCrossRepository repository { nameWithOwner } }`;
