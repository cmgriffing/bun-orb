"use strict";

const fs = require("fs");
const { homedir } = require("os");
const { join, resolve } = require("path");
const zlib = require("zlib");
const { execSync, spawnSync } = require("child_process");

const BUN_VERSION = process.env.BUN_VERSION;

function getDownloadUrl(options = {}) {
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

function verifyBun(path) {
  console.log({ path });
  const result = execSync(`${path} --version`, {
    ignoreReturnCode: true,
    // encoding: "utf8",
  });
  console.log({ result: result.toString().trim() });
  return result ? result.toString().trim() : undefined;
}

async function setup() {
  const { url, cacheKey } = getDownloadUrl({ version: BUN_VERSION });
  // const cacheEnabled = cacheKey && cache.isFeatureAvailable();
  const cacheEnabled = false;
  const dir = "/usr/local/bin";
  // action.addPath(dir);
  const path = join(dir, "bun");
  let version;
  let cacheHit = false;
  if (cacheEnabled) {
    // const cacheRestored = await restoreCache([path], cacheKey);
    const cacheRestored = false;
    if (cacheRestored) {
      version = await verifyBun(path);
      if (version) {
        cacheHit = true;
        console.info("Using a cached version of Bun.");
      } else {
        console.warn(
          "Found a cached version of Bun, but it appears to be corrupted? Attempting to download a new version."
        );
      }
    }
  }
  if (!cacheHit) {
    console.info(`Downloading a new version of Bun: ${url}`);
    const zipBuffer = await (
      await fetch(url, {
        headers: { "Accept-Encoding": "gzip, deflate, br" },
        compress: false,
        redirect: "follow",
      })
    ).arrayBuffer();

    const bunZipPath = resolve(__dirname, "./bun.zip");
    const bunFolderPath = resolve(__dirname, "./bun");

    fs.writeFileSync(bunZipPath, Buffer.from(zipBuffer));

    const unzipResult = execSync(`unzip -u ${bunZipPath} -d ${bunFolderPath}`);

    if (unzipResult) {
      console.log(unzipResult.toString());
    }

    fs.mkdirSync(dir, { recursive: true });

    const lsResult = execSync("ls -a");

    execSync(
      `sudo cp ${resolve(
        bunFolderPath,
        `bun-${process.platform}-${process.arch}-baseline/bun`
      )} ${path}`
    );

    // fs.writeFileSync(path, extractedBun, { encoding: "utf8" });
    version = await verifyBun(path);
  }
  if (!version) {
    throw new Error(
      "Downloaded a new version of Bun, but failed to check its version? Try again in debug mode."
    );
  }
  if (cacheEnabled) {
    try {
      // await saveCache([path], cacheKey);
    } catch (error) {
      console.warn("Failed to save Bun to cache.");
    }
  }
  return {
    version,
    cacheHit,
  };
}

setup();
