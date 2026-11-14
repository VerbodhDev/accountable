import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { extname, join } from "node:path"

// Uploads frontend/dist to a private bucket in Singapore.
// CloudFront with origin access control is the only reader.
// Does not read .env and does not print credentials.

const PROFILE = "personal-sso"
const REGION = "ap-southeast-1"
const COMMENT = "Accountable frontend"
const CACHE_DISABLED = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
const STATE = "data/frontend-deploy.json"
const ORIGIN_FILE = "data/frontend-origin"
const DIST = "frontend/dist"
const OAC_NAME = "accountable-fe-oac"
const ORIGIN_ID = "accountable-fe"
const CONFIG_FILE = "/tmp/accountable-fe-aws.json"
const PAGE_FILE = "/tmp/accountable-fe-index.html"
const TEXT = new Set([".html", ".js", ".css", ".json", ".svg", ".txt", ".map"])
const BLOCKED = ["DATABASE_URL", "postgresql://", "service_role", "SUPABASE_SECRET"]

function awsArgs(region, args) {
  return ["--profile", PROFILE, "--region", region, "--output", "json", ...args]
}

function parseAws(text) {
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new Error("The AWS CLI returned text that is not JSON.")
  }
}

function run(region, args) {
  const result = spawnSync("aws", awsArgs(region, args), { encoding: "utf8" })
  if (result.error) throw new Error("The AWS CLI is not available.")
  if (result.status !== 0) throw new Error((result.stderr || "aws failed").trim())
  return parseAws((result.stdout || "").trim())
}

function runFile(region, args, payload) {
  writeFileSync(CONFIG_FILE, JSON.stringify(payload))
  try {
    return run(region, [...args, `file://${CONFIG_FILE}`])
  } finally {
    rmSync(CONFIG_FILE, { force: true })
  }
}

function accountId() {
  const id = run("us-east-1", ["sts", "get-caller-identity"]).Account
  if (!id) throw new Error("The AWS account id is missing.")
  return id
}

function bucketMissing(name) {
  const result = spawnSync("aws", awsArgs(REGION, ["s3api", "head-bucket", "--bucket", name]), {
    encoding: "utf8",
  })
  if (result.status === 0) return false
  const detail = result.stderr || ""
  if (detail.includes("404") || detail.includes("Not Found") || detail.includes("NoSuchBucket")) {
    return true
  }
  throw new Error(detail.trim() || "The bucket check failed.")
}

function lockBucket(name) {
  const blocked = {
    BlockPublicAcls: true,
    IgnorePublicAcls: true,
    BlockPublicPolicy: true,
    RestrictPublicBuckets: true,
  }
  run(REGION, [
    "s3api",
    "put-public-access-block",
    "--bucket",
    name,
    "--public-access-block-configuration",
    JSON.stringify(blocked),
  ])
  run(REGION, [
    "s3api",
    "put-bucket-encryption",
    "--bucket",
    name,
    "--server-side-encryption-configuration",
    JSON.stringify({
      Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } }],
    }),
  ])
  run(REGION, [
    "s3api",
    "put-bucket-ownership-controls",
    "--bucket",
    name,
    "--ownership-controls",
    JSON.stringify({ Rules: [{ ObjectOwnership: "BucketOwnerEnforced" }] }),
  ])
}

function ensureBucket(name) {
  if (bucketMissing(name)) {
    run(REGION, [
      "s3api",
      "create-bucket",
      "--bucket",
      name,
      "--create-bucket-configuration",
      `LocationConstraint=${REGION}`,
    ])
  }
  lockBucket(name)
}

function walk(dir, found) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, found)
    else found.push(path)
  }
  return found
}

function assertClean(dir) {
  for (const path of walk(dir, [])) {
    if (!TEXT.has(extname(path))) continue
    const body = readFileSync(path, "utf8")
    for (const needle of BLOCKED) {
      if (body.includes(needle))
        throw new Error("The build contains a blocked string. Upload stopped.")
    }
  }
}

function build() {
  const result = spawnSync("npm", ["run", "build", "-w", "frontend"], { stdio: "inherit" })
  if (result.status !== 0) throw new Error("The frontend build failed.")
  if (!existsSync(join(DIST, "index.html"))) throw new Error("frontend/dist/index.html is missing.")
  assertClean(DIST)
}

function upload(bucket) {
  const sync = spawnSync(
    "aws",
    [
      ...awsArgs(REGION, ["s3", "sync", DIST, `s3://${bucket}`, "--delete"]),
      "--exclude",
      "index.html",
      "--cache-control",
      "public,max-age=31536000,immutable",
    ],
    { stdio: "inherit" },
  )
  if (sync.status !== 0) throw new Error("The site upload failed.")
  const html = spawnSync(
    "aws",
    awsArgs(REGION, [
      "s3",
      "cp",
      join(DIST, "index.html"),
      `s3://${bucket}/index.html`,
      "--cache-control",
      "no-cache",
      "--content-type",
      "text/html; charset=utf-8",
    ]),
    { stdio: "inherit" },
  )
  if (html.status !== 0) throw new Error("The index upload failed.")
}

function listPages(command, listKey) {
  const items = []
  let marker = ""
  for (let page = 0; page < 20; page += 1) {
    const args = ["cloudfront", command]
    if (marker) args.push("--marker", marker)
    const listed = run("us-east-1", args)
    const body = listed[listKey] || {}
    items.push(...(body.Items || []))
    if (!body.IsTruncated) break
    marker = body.NextMarker || ""
    if (!marker) break
  }
  return items
}

function ensureOac() {
  const existing = listPages("list-origin-access-controls", "OriginAccessControlList").find(
    (item) => item.Name === OAC_NAME,
  )
  if (existing) return existing.Id
  const created = run("us-east-1", [
    "cloudfront",
    "create-origin-access-control",
    "--origin-access-control-config",
    JSON.stringify({
      Name: OAC_NAME,
      Description: "Accountable frontend bucket",
      SigningProtocol: "sigv4",
      SigningBehavior: "always",
      OriginAccessControlOriginType: "s3",
    }),
  ])
  return created.OriginAccessControl.Id
}

function readState() {
  if (!existsSync(STATE)) return {}
  return JSON.parse(readFileSync(STATE, "utf8"))
}

function matchDistribution(items, state) {
  if (state.distributionId) {
    const saved = items.find((item) => item.Id === state.distributionId)
    if (saved) return saved
  }
  return items.find((item) => item.Comment === COMMENT) || null
}

function distributionConfig(bucket, oacId, callerReference) {
  return {
    CallerReference: callerReference,
    Comment: COMMENT,
    Enabled: true,
    DefaultRootObject: "index.html",
    PriceClass: "PriceClass_200",
    HttpVersion: "http2",
    IsIPV6Enabled: true,
    Origins: {
      Quantity: 1,
      Items: [
        {
          Id: ORIGIN_ID,
          DomainName: `${bucket}.s3.${REGION}.amazonaws.com`,
          OriginAccessControlId: oacId,
          S3OriginConfig: { OriginAccessIdentity: "" },
          CustomHeaders: { Quantity: 0 },
        },
      ],
    },
    DefaultCacheBehavior: {
      TargetOriginId: ORIGIN_ID,
      ViewerProtocolPolicy: "redirect-to-https",
      AllowedMethods: {
        Quantity: 2,
        Items: ["GET", "HEAD"],
        CachedMethods: { Quantity: 2, Items: ["GET", "HEAD"] },
      },
      Compress: true,
      CachePolicyId: CACHE_DISABLED,
    },
    CustomErrorResponses: {
      Quantity: 2,
      Items: [errorPage(403), errorPage(404)],
    },
    Restrictions: { GeoRestriction: { RestrictionType: "none", Quantity: 0 } },
    ViewerCertificate: { CloudFrontDefaultCertificate: true },
    Aliases: { Quantity: 0 },
    Logging: { Enabled: false, IncludeCookies: false, Bucket: "", Prefix: "" },
    CacheBehaviors: { Quantity: 0 },
  }
}

function errorPage(code) {
  return {
    ErrorCode: code,
    ResponsePagePath: "/index.html",
    ResponseCode: "200",
    ErrorCachingMinTTL: 0,
  }
}

function createDistribution(bucket, oacId) {
  const config = distributionConfig(bucket, oacId, `accountable-fe-${Date.now()}`)
  const created = runFile(
    "us-east-1",
    ["cloudfront", "create-distribution", "--distribution-config"],
    config,
  )
  return created.Distribution
}

function originMatches(dist, bucket, oacId) {
  const origin = dist.Origins?.Items?.[0]
  if (!origin) return false
  return (
    origin.DomainName === `${bucket}.s3.${REGION}.amazonaws.com` &&
    origin.OriginAccessControlId === oacId
  )
}

function updateOrigin(distId, bucket, oacId) {
  const current = run("us-east-1", ["cloudfront", "get-distribution-config", "--id", distId])
  const config = current.DistributionConfig
  const origin = config.Origins.Items[0]
  origin.Id = ORIGIN_ID
  origin.DomainName = `${bucket}.s3.${REGION}.amazonaws.com`
  origin.OriginAccessControlId = oacId
  origin.S3OriginConfig = { OriginAccessIdentity: "" }
  config.DefaultCacheBehavior.TargetOriginId = ORIGIN_ID
  runFile(
    "us-east-1",
    [
      "cloudfront",
      "update-distribution",
      "--id",
      distId,
      "--if-match",
      current.ETag,
      "--distribution-config",
    ],
    config,
  )
}

function ensureDistribution(bucket, oacId) {
  const found = matchDistribution(listPages("list-distributions", "DistributionList"), readState())
  if (!found) return createDistribution(bucket, oacId)
  if (!originMatches(found, bucket, oacId)) updateOrigin(found.Id, bucket, oacId)
  return found
}

function allowDistribution(bucket, account, distId) {
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "AllowCloudFrontRead",
        Effect: "Allow",
        Principal: { Service: "cloudfront.amazonaws.com" },
        Action: "s3:GetObject",
        Resource: `arn:aws:s3:::${bucket}/*`,
        Condition: {
          StringEquals: {
            "AWS:SourceArn": `arn:aws:cloudfront::${account}:distribution/${distId}`,
          },
        },
      },
    ],
  }
  run(REGION, [
    "s3api",
    "put-bucket-policy",
    "--bucket",
    bucket,
    "--policy",
    JSON.stringify(policy),
  ])
}

function waitDeployed(distId) {
  const result = spawnSync(
    "aws",
    [
      "--profile",
      PROFILE,
      "--region",
      "us-east-1",
      "cloudfront",
      "wait",
      "distribution-deployed",
      "--id",
      distId,
    ],
    { encoding: "utf8" },
  )
  if (result.status !== 0) throw new Error((result.stderr || "CloudFront did not finish.").trim())
}

function httpCode(url, output) {
  const result = spawnSync(
    "curl",
    ["-s", "-o", output, "-w", "%{http_code}", "--max-time", "30", url],
    { encoding: "utf8" },
  )
  return (result.stdout || "").trim()
}

function assertBlocked(config) {
  const flags = [
    "BlockPublicAcls",
    "IgnorePublicAcls",
    "BlockPublicPolicy",
    "RestrictPublicBuckets",
  ]
  for (const flag of flags) {
    if (config?.[flag] !== true) throw new Error("Public access is not fully blocked.")
  }
}

function assertPrivate(bucket) {
  const block = run(REGION, ["s3api", "get-public-access-block", "--bucket", bucket])
  assertBlocked(block.PublicAccessBlockConfiguration)
  const objectUrl = `https://${bucket}.s3.${REGION}.amazonaws.com/index.html`
  if (httpCode(objectUrl, "/dev/null") !== "403")
    throw new Error("The bucket answered anonymously.")
}

function assertSite(origin) {
  let code = ""
  for (let attempt = 0; attempt < 6; attempt += 1) {
    code = httpCode(origin, PAGE_FILE)
    if (code === "200") {
      const html = readFileSync(PAGE_FILE, "utf8").toLowerCase()
      rmSync(PAGE_FILE, { force: true })
      if (html.includes("<!doctype html") || html.includes("<html")) return
      throw new Error("The site did not return HTML.")
    }
    spawnSync("sleep", ["5"])
  }
  rmSync(PAGE_FILE, { force: true })
  throw new Error(`The site did not return the page (${code}).`)
}

function writeState(bucket, distribution) {
  mkdirSync("data", { recursive: true })
  const origin = `https://${distribution.DomainName}`
  const state = {
    bucket,
    distributionId: distribution.Id,
    domain: distribution.DomainName,
    origin,
    region: REGION,
  }
  writeFileSync(STATE, `${JSON.stringify(state, null, 2)}\n`)
  writeFileSync(ORIGIN_FILE, `${origin}\n`)
  console.log(origin)
}

function main() {
  const account = accountId()
  const bucket = `accountable-fe-${account}`
  ensureBucket(bucket)
  console.log(`Bucket ${bucket}`)
  build()
  upload(bucket)
  const oacId = ensureOac()
  const distribution = ensureDistribution(bucket, oacId)
  allowDistribution(bucket, account, distribution.Id)
  console.log("Waiting for CloudFront.")
  waitDeployed(distribution.Id)
  const fresh = run("us-east-1", ["cloudfront", "get-distribution", "--id", distribution.Id])
  assertPrivate(bucket)
  assertSite(`https://${fresh.Distribution.DomainName}`)
  writeState(bucket, fresh.Distribution)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : "The deploy failed.")
  process.exit(1)
}
