import { execFile } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

const exec = promisify(execFile);
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publishScript = path.join(projectRoot, "scripts", "publish-dist.sh");
const temporaryDirectories: string[] = [];

const git = async (cwd: string, ...args: string[]) => (
  (await exec("git", args, { cwd })).stdout.trim()
);

const createRepository = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ascii-banner-publish-"));
  temporaryDirectories.push(root);
  const remote = path.join(root, "remote.git");
  const source = path.join(root, "source");
  const dist = path.join(source, "dist");

  await git(root, "init", "--bare", remote);
  await mkdir(source);
  await git(source, "init", "-b", "main");
  await git(source, "config", "user.name", "Test User");
  await git(source, "config", "user.email", "test@example.com");
  await writeFile(path.join(source, "source.txt"), "source only");
  await git(source, "add", "source.txt");
  await git(source, "commit", "-m", "Initial source");
  await mkdir(dist);
  await Promise.all([
    writeFile(path.join(dist, "index.html"), "first build"),
    writeFile(path.join(dist, "sitemap-index.xml"), "sitemap"),
  ]);

  return { remote, source, dist };
};

const publish = async (
  source: string,
  dist: string,
  remote: string,
  runId: string,
  extraEnvironment: NodeJS.ProcessEnv = {},
) => (
  exec("bash", [publishScript, dist], {
    cwd: source,
    env: {
      ...process.env,
      DEPLOY_BRANCH: "gh-pages",
      DEPLOY_REMOTE: remote,
      GITHUB_RUN_ID: runId,
      GITHUB_RUN_ATTEMPT: "1",
      ...extraEnvironment,
    },
  })
);

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("publish-dist", () => {
  it("creates a root-level, single-commit gh-pages snapshot", async () => {
    const { remote, source, dist } = await createRepository();
    await publish(source, dist, remote, "100");

    expect(await git(remote, "rev-list", "--count", "gh-pages")).toBe("1");
    expect((await git(remote, "ls-tree", "-r", "--name-only", "gh-pages")).split("\n")).toEqual([
      "index.html",
      "sitemap-index.xml",
    ]);
    expect(await git(remote, "show", "gh-pages:index.html")).toBe("first build");
    await expect(readFile(path.join(source, "source.txt"), "utf8")).resolves.toBe("source only");
  });

  it("replaces the orphan snapshot and can republish the same source", async () => {
    const { remote, source, dist } = await createRepository();
    await publish(source, dist, remote, "100");
    const firstCommit = await git(remote, "rev-parse", "gh-pages");

    await writeFile(path.join(dist, "index.html"), "second build");
    await publish(source, dist, remote, "101");
    const secondCommit = await git(remote, "rev-parse", "gh-pages");
    expect(secondCommit).not.toBe(firstCommit);
    expect(await git(remote, "rev-list", "--count", "gh-pages")).toBe("1");
    expect(await git(remote, "show", "gh-pages:index.html")).toBe("second build");

    await publish(source, dist, remote, "102");
    const thirdCommit = await git(remote, "rev-parse", "gh-pages");
    expect(thirdCommit).not.toBe(secondCommit);
    expect(await git(remote, "rev-list", "--count", "gh-pages")).toBe("1");
  });

  it("refuses to overwrite a remote update made after reading the lease", async () => {
    const { remote, source, dist } = await createRepository();
    await publish(source, dist, remote, "100");

    await writeFile(path.join(source, "external.txt"), "external update");
    await git(source, "add", "external.txt");
    await git(source, "commit", "-m", "External update");
    const competingCommit = await git(source, "rev-parse", "HEAD");
    const realGit = (await exec("which", ["git"])).stdout.trim();
    const shimDirectory = path.join(path.dirname(remote), "git-shim");
    const shimPath = path.join(shimDirectory, "git");
    await mkdir(shimDirectory);
    await writeFile(shimPath, `#!/usr/bin/env bash
set -euo pipefail
if [[ "\${1:-}" == "push" ]]; then
  "$REAL_GIT" push --force "$DEPLOY_REMOTE" "$CONFLICT_COMMIT:refs/heads/gh-pages" >/dev/null
fi
exec "$REAL_GIT" "$@"
`);
    await chmod(shimPath, 0o755);

    await writeFile(path.join(dist, "index.html"), "candidate build");
    await expect(publish(source, dist, remote, "101", {
      PATH: `${shimDirectory}:${process.env.PATH ?? ""}`,
      REAL_GIT: realGit,
      CONFLICT_COMMIT: competingCommit,
    })).rejects.toThrow();

    expect(await git(remote, "rev-parse", "gh-pages")).toBe(competingCommit);
    expect(await git(remote, "show", "gh-pages:external.txt")).toBe("external update");
  });
});
