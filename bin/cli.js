#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const readline = require("readline");
const { promisify } = require("util");

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Promisify question function for easier use with async/await
const question = promisify(rl.question).bind(rl);

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
const targetDir = args[0] || ".";
const mode = args.includes("--dec") ? "decrypt" : "encrypt";
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

async function decrypt(encryptedText) {
  // Hide password input
  const password = await question(
    "Enter the password (input will be hidden): ",
    {
      hideEchoBack: true,
    }
  );

  const [ivHex, dataHex] = encryptedText.split(":");
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
      const decrypted = decrypt(encrypted);
      fs.writeFileSync(envPath, decrypted);
      console.log("✅ Successfully decrypted .env!");
      return;
    }

    // ENCRYPT MODE
    if (!fs.existsSync(envPath)) {
      console.warn("⚠️  .env not found");
      return;
    }
    const decrypted = fs.readFileSync(envPath, "utf8");
    const encrypted = encrypt(decrypted);
    fs.writeFileSync(encPath, encrypted);
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
