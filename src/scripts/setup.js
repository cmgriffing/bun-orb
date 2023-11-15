"use strict";

const fs = require("fs");
const { join, resolve } = require("path");
const { execSync } = require("child_process");

const BUN_VERSION = process.env.BUN_VERSION;

function getDownloadUrl(options = {}) {
  if (options?.customUrl) {
    return {
      url: options.customUrl,
      cacheKey: null,
    };
  }
  let release = encodeURIComponent(options?.version ?? "latest");

  if (release === "latest") {
    release = execSync("npm show bun@latest version");
  }

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
  };
}

function verifyBun(path) {
  const result = execSync(`${path} --version`, {
    ignoreReturnCode: true,
  });
  console.info(`Verified bun version: ${result.toString().trim()}`);
  return result ? result.toString().trim() : undefined;
}

async function setup() {
  const dir = "/usr/local/bin";
  const path = join(dir, "bun");

  let cacheExists = false;

  try {
    const hasAccess = !fs.accessSync(path);
    cacheExists =
      hasAccess && BUN_VERSION !== "latest" && BUN_VERSION !== "canary";
  } catch (e) {
    // Cached binary not found
  }

  let version;
  if (cacheExists) {
    version = await verifyBun(path);
    if (version) {
      console.info("Using a cached version of Bun.");
      return {
        version,
      };
    } else {
      console.warn(
        "Found a cached version of Bun, but it appears to be corrupted? Attempting to download a new version."
      );
    }
  }

  if (!version) {
    const { url } = getDownloadUrl({ version: BUN_VERSION });
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

    execSync(`unzip -o ${bunZipPath} -d ${bunFolderPath}`);

    fs.mkdirSync(dir, { recursive: true });

    execSync(
      `sudo cp ${resolve(
        bunFolderPath,
        `bun-${process.platform}-${process.arch}-baseline/bun`
      )} ${path}`
    );

    version = await verifyBun(path);
  }

  if (!version) {
    throw new Error(
      "Downloaded a new version of Bun, but failed to check its version? Try again in debug mode."
    );
  }

  return {
    version,
  };
}

setup();
