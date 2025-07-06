#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function generatePassword() {
  const length = 124;
  const charset =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

const args = process.argv.slice(2);
const mode = args.includes("--dec") ? "decrypt" : "encrypt";

// Get arguments with exlude flag
const targetArg = args.find((arg) => !arg.startsWith("--"));
const targetDir = targetArg || ".";

// Find argument with prefix "--pass:"
const passArg = args.find((arg) => arg.startsWith("--pass:"));
const passwordFromArg = passArg ? passArg.split(":")[1] : null;

const shouldExit = !args.includes("--no-exit");

const envPath = path.join(targetDir, ".env");
const encPath = path.join(targetDir, "env.enc");

async function encrypt(text) {
  const password = generatePassword();
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(password).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  console.log("✅ Successfully encrypted .env!");
  console.log(`Generated password (save this for decryption):`);
  console.log(password);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

const prompt = require("prompt-sync")({ sigint: true });
async function decrypt(encryptedText) {
  // if password got from param --pass, use it, else use prompt
  const password =
    passwordFromArg || prompt("🔑 Enter the password: ", { echo: "*" });

  const [ivHex, dataHex] = encryptedText.split(":");
  if (!ivHex || !dataHex) throw new Error("Format encrypted text invalid!");

  const iv = Buffer.from(ivHex, "hex");
  const encryptedData = Buffer.from(dataHex, "hex");
  const key = crypto.createHash("sha256").update(password).digest();
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);
  return decrypted.toString();
}

(async () => {
  try {
    if (mode === "decrypt") {
      if (!fs.existsSync(encPath)) {
        console.warn("⚠️  env.enc tidak ditemukan");
        return;
      }
      const encrypted = fs.readFileSync(encPath, "utf8");
      const decrypted = await decrypt(encrypted);
      fs.writeFileSync(envPath, decrypted);
      console.log("✅ Successfully decrypted .env!");
      if (shouldExit) {
        process.exit(0);
      }
    }

    // ENCRYPT MODE
    if (!fs.existsSync(envPath)) {
      console.warn("⚠️  .env not found");
      return;
    }
    const decrypted = fs.readFileSync(envPath, "utf8");
    const encrypted = await encrypt(decrypted);
    fs.writeFileSync(encPath, encrypted);
    if (shouldExit) {
      process.exit(0);
    }
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
