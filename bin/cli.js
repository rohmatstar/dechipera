#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const args = process.argv.slice(2);
const targetDir = args[0] || ".";
const mode = args.includes("--dec") ? "decrypt" : "encrypt";
const envPath = path.join(targetDir, ".env");
const encPath = path.join(targetDir, "env.enc");

function encrypt(text, password) {
  const iv = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(password).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

function decrypt(encryptedText, password) {
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
    const folderName = path.basename(path.resolve(targetDir));
    const password = folderName;

    if (mode === "decrypt") {
      if (!fs.existsSync(encPath)) {
        console.warn("⚠️  env.enc tidak ditemukan");
        return;
      }
      const encrypted = fs.readFileSync(encPath, "utf8");
      const decrypted = decrypt(encrypted, password);
      fs.writeFileSync(envPath, decrypted);
      console.log("✅ Berhasil didekripsi ke .env");
      return;
    }

    // ENCRYPT MODE
    if (!fs.existsSync(envPath)) {
      console.warn("⚠️  .env tidak ditemukan");
      return;
    }
    const decrypted = fs.readFileSync(envPath, "utf8");
    const encrypted = encrypt(decrypted, password);
    fs.writeFileSync(encPath, encrypted);
    console.log("✅ .env berhasil dienkripsi ke env.enc");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
