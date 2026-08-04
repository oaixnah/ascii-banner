#!/usr/bin/env bash
set -euo pipefail

deploy_dir="${1:-dist}"
deploy_branch="${DEPLOY_BRANCH:-deploy}"
deploy_remote="${DEPLOY_REMOTE:-origin}"

if [[ ! -d "$deploy_dir" ]]; then
  echo "Deploy directory does not exist: $deploy_dir" >&2
  exit 1
fi

if [[ ! "$deploy_branch" =~ ^[A-Za-z0-9._/-]+$ ]] || [[ "$deploy_branch" == *..* ]]; then
  echo "Invalid deploy branch: $deploy_branch" >&2
  exit 1
fi

if [[ -e "$deploy_dir/.git" ]]; then
  echo "Deploy directory must not contain Git metadata: $deploy_dir/.git" >&2
  exit 1
fi

deploy_dir="$(cd "$deploy_dir" && pwd)"
deploy_ref="refs/heads/$deploy_branch"
source_sha="$(git rev-parse HEAD)"
if [[ -n "${GITHUB_RUN_ID:-}" ]]; then
  run_id="${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT:-1}"
else
  run_id="manual-$(date -u +%Y%m%dT%H%M%SZ)-$$"
fi
deploy_temp="$(mktemp -d)"
deploy_index="$deploy_temp/index"

cleanup() {
  rm -f "$deploy_index"
  rmdir "$deploy_temp" 2>/dev/null || true
}
trap cleanup EXIT

export GIT_INDEX_FILE="$deploy_index"
git read-tree --empty
git --work-tree="$deploy_dir" add --all
deploy_tree="$(git write-tree)"
deploy_commit="$({
  printf 'Deploy %s\n\n' "$source_sha"
  printf 'Run: %s\n' "$run_id"
} | git \
  -c user.name='github-actions[bot]' \
  -c user.email='41898282+github-actions[bot]@users.noreply.github.com' \
  commit-tree "$deploy_tree")"

remote_line="$(git ls-remote --heads "$deploy_remote" "$deploy_ref")"
remote_sha="${remote_line%%$'\t'*}"

git push \
  "--force-with-lease=${deploy_ref}:${remote_sha}" \
  "$deploy_remote" \
  "${deploy_commit}:${deploy_ref}"

printf 'Published %s to %s/%s\n' "$deploy_commit" "$deploy_remote" "$deploy_branch"
