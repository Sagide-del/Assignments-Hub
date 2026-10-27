# Automatic frontend deployment

The frontend is served from S3 behind CloudFront EC57E3OHWZ6MP; the Nest API is hosted separately. The deployment workflow builds and tests the frontend on pushes to main affecting the frontend, deployment scripts, or workflow. It also supports manual dispatch from the GitHub Actions tab.

## One-time connection

In AWS CloudShell, signed in to account 516962256415, run:

```bash
curl -fsSL https://raw.githubusercontent.com/Sagide-del/Assignments-Hub/main/scripts/deployment/connect-aws.sh -o /tmp/assignmenthub-connect.sh && bash /tmp/assignmenthub-connect.sh
```

The script resolves the actual default S3 origin from CloudFront instead of guessing between bucket names. It creates/reuses the GitHub OIDC provider and the dedicated AssignmentHubGitHubFrontendDeploy role. Trust uses the repository’s immutable GitHub identity (`repo:Sagide-del@210379737/Assignments-Hub@1302197760:ref:refs/heads/main`), restricted to refs/heads/main, with the sts.amazonaws.com audience. The role can read/write frontend objects, list the frontend bucket, read the distribution configuration, create invalidations and wait for them. It cannot delete S3 objects or manage IAM. No long-lived AWS keys are copied to GitHub.

The initial script also publishes the tested STEM release 69abd1d (SHA256 verified) when the public site still serves the previous first-aid bundle index-Bbt4ut3M.js. If it detects a different live release, it preserves that release; the workflow can then deploy the latest source using Run workflow. This prevents rerunning setup from rolling back a later deployment.

GitHub Actions must be enabled for the repository. The integration used by this coding environment cannot inspect repository Actions permissions (403), so workflow execution must be confirmed in GitHub. IAM connection requires the signed-in CloudShell identity to have permissions to manage the dedicated role/OIDC provider and publish to the existing website. The workflow build has been checked locally; the AWS trust and live deployment remain unverified until connection runs.

## Publication

The workflow uses Node 20/npm ci, the activity test suites and a production build with the explicit Render API URL. It assumes the role using GitHub OIDC. There is no GitHub environment name in this workflow because the trust subject is explicitly the main branch.

Publication uploads dependencies before HTML, retains older hashed bundles, sets long-lived cache headers on hashed assets and no-cache on HTML, invalidates /* and waits for completion. It compares the public homepage bytes with the tested index.html before reporting success, then checks all six first-aid WebP assets. Concurrent deployments queue rather than canceling an in-progress publication. A failure does not claim success or delete existing files.

To disable automatic deployments, disable Deploy frontend to AWS in GitHub Actions. Removing the role’s inline policy or GitHub trust revokes AWS publication access. Existing website content is unaffected.

## Repair an older name-based trust policy

The repository uses GitHub’s immutable OIDC subject format. AWS rejects the older `repo:Sagide-del/Assignments-Hub:ref:refs/heads/main` subject with `Not authorized to perform sts:AssumeRoleWithWebIdentity`. Confirmed through the repository OIDC configuration API. In CloudShell, update only the dedicated deployment role’s trust:

```bash
aws iam update-assume-role-policy --role-name AssignmentHubGitHubFrontendDeploy --policy-document "$(curl -fsSL https://raw.githubusercontent.com/Sagide-del/Assignments-Hub/main/scripts/deployment/frontend-role-trust.json)"
```

This preserves GitHub’s immutable identity configuration and the existing least-privilege publication policy. Rerun the failed GitHub workflow after the update.
