import { join } from "path";
import { readdir } from "fs/promises";
import { execSync } from "child_process";

export function getDownloadUrl(options = {}) {
  if (options?.customUrl) {
    return {
      url: options.customUrl,
      cacheKey: null,
    };
  }
  const release = encodeURIComponent(options?.version ?? "latest");
  const os = encodeURIComponent(options?.os ?? process.platform);
  const arch = encodeURIComponent(options?.arch ?? process.arch);
  const avx2 = encodeURIComponent(options?.avx2 ?? true);
  const profile = encodeURIComponent(options?.profile ?? false);
  const { href } = new URL(
    `${release}/${os}/${arch}?avx2=${avx2}&profile=${profile}`,
    "https://bun.sh/download/"
  );
  return {
    url: href,
    cacheKey: /^latest|canary|action/i.test(release)
      ? null
      : `bun-${release}-${os}-${arch}-${avx2}-${profile}`,
  };
}

export async function verifyBun(path) {
  const { exitCode, stdout } = execSync(path, ["--version"], {
    ignoreReturnCode: true,
    encoding: "utf8",
  });
  return exitCode === 0 ? stdout.trim() : undefined;
}
